import pandas as pd
import numpy as np
import joblib
import shap


# ============================================================
# 1. LOAD SAVED MODEL
# ============================================================

model_path = "models/student_performance_model.joblib"

pipeline = joblib.load(model_path)

print("=" * 70)
print("CAMPUSIQ - EXPLAINABLE STUDENT PERFORMANCE PREDICTION")
print("=" * 70)

print("\nSaved model loaded successfully.")


# ============================================================
# 2. SAMPLE STUDENT
# ============================================================

student = {
    "school": "GP",
    "sex": "F",
    "age": 17,
    "address": "U",
    "famsize": "GT3",
    "Pstatus": "A",

    "Medu": 4,
    "Fedu": 4,

    "Mjob": "at_home",
    "Fjob": "teacher",

    "reason": "course",
    "guardian": "mother",

    "traveltime": 1,
    "studytime": 3,
    "failures": 0,

    "schoolsup": "yes",
    "famsup": "yes",
    "paid": "no",
    "activities": "yes",
    "nursery": "yes",
    "higher": "yes",
    "internet": "yes",
    "romantic": "no",

    "famrel": 4,
    "freetime": 3,
    "goout": 3,

    "Dalc": 1,
    "Walc": 1,

    "health": 3,
    "absences": 2
}


# ============================================================
# 3. CONVERT STUDENT TO DATAFRAME
# ============================================================

student_df = pd.DataFrame([student])


# ============================================================
# 4. MAKE PREDICTION
# ============================================================

prediction = pipeline.predict(student_df)[0]

prediction = max(0, min(20, prediction))


# ============================================================
# 5. PERFORMANCE CATEGORY
# ============================================================

if prediction < 10:
    performance = "At Risk"
elif prediction < 12:
    performance = "Needs Improvement"
elif prediction < 15:
    performance = "Good"
else:
    performance = "Excellent"


# ============================================================
# 6. TRANSFORM STUDENT DATA
# ============================================================

preprocessor = pipeline.named_steps["preprocessor"]
model = pipeline.named_steps["model"]

student_processed = preprocessor.transform(student_df)

feature_names = preprocessor.get_feature_names_out()


# ============================================================
# 7. CREATE SHAP EXPLAINER
# ============================================================

explainer = shap.TreeExplainer(model)

shap_values = explainer.shap_values(
    student_processed
)


# ============================================================
# 8. EXTRACT SHAP VALUES
# ============================================================

student_shap = shap_values[0]

raw_explanation = pd.DataFrame({
    "Feature": feature_names,
    "SHAP": student_shap
})


# ============================================================
# 9. AGGREGATE ONE-HOT ENCODED FEATURES
# ============================================================

# Map transformed features back to their original features.
# This prevents confusing explanations such as:
# "schoolsup_yes" AND "schoolsup_no" appearing separately.

original_features = {}

for feature in raw_explanation["Feature"]:

    if feature.startswith("categorical__"):

        feature_name = feature.replace(
            "categorical__",
            ""
        ).split("_")[0]

        original_features[feature] = feature_name

    elif feature.startswith("remainder__"):

        feature_name = feature.replace(
            "remainder__",
            ""
        )

        original_features[feature] = feature_name

    else:

        original_features[feature] = feature


raw_explanation["Original_Feature"] = (
    raw_explanation["Feature"]
    .map(original_features)
)


# ============================================================
# 10. AGGREGATE SHAP VALUES
# ============================================================

explanation_df = (
    raw_explanation
    .groupby("Original_Feature", as_index=False)["SHAP"]
    .sum()
)


# ============================================================
# 11. CALCULATE ABSOLUTE IMPACT
# ============================================================

explanation_df["Absolute_SHAP"] = (
    explanation_df["SHAP"].abs()
)

explanation_df = explanation_df.sort_values(
    by="Absolute_SHAP",
    ascending=False
)


# ============================================================
# 12. HUMAN-READABLE FEATURE NAMES
# ============================================================

feature_name_mapping = {

    "absences":
        "Absences",

    "failures":
        "Previous Academic Failures",

    "studytime":
        "Study Time",

    "age":
        "Age",

    "Medu":
        "Mother's Education",

    "Fedu":
        "Father's Education",

    "traveltime":
        "Travel Time",

    "famrel":
        "Family Relationship",

    "freetime":
        "Free Time",

    "goout":
        "Going Out",

    "Dalc":
        "Weekday Alcohol Consumption",

    "Walc":
        "Weekend Alcohol Consumption",

    "health":
        "Health",

    "Mjob":
        "Mother's Job",

    "Fjob":
        "Father's Job",

    "sex":
        "Gender",

    "schoolsup":
        "Extra School Support",

    "famsup":
        "Family Educational Support",

    "paid":
        "Extra Paid Classes",

    "activities":
        "Extracurricular Activities",

    "nursery":
        "Nursery Education",

    "higher":
        "Higher Education Aspiration",

    "internet":
        "Internet Access",

    "romantic":
        "Romantic Relationship",

    "school":
        "School",

    "address":
        "Address Type",

    "famsize":
        "Family Size",

    "Pstatus":
        "Parent Cohabitation Status",

    "reason":
        "Course Selection Reason",

    "guardian":
        "Guardian"
}


explanation_df["Human_Feature"] = (
    explanation_df["Original_Feature"]
    .map(feature_name_mapping)
    .fillna(explanation_df["Original_Feature"])
)


# ============================================================
# 13. POSITIVE AND NEGATIVE FACTORS
# ============================================================

positive_factors = explanation_df[
    explanation_df["SHAP"] > 0
].head(5)

negative_factors = explanation_df[
    explanation_df["SHAP"] < 0
].head(5)


# ============================================================
# 14. DISPLAY POSITIVE FACTORS
# ============================================================

print("\n" + "-" * 70)
print("FACTORS CONTRIBUTING POSITIVELY")
print("-" * 70)

for _, row in positive_factors.iterrows():

    print(
        f"{row['Human_Feature']:<40} "
        f"+{row['SHAP']:.3f}"
    )


# ============================================================
# 15. DISPLAY NEGATIVE FACTORS
# ============================================================

print("\n" + "-" * 70)
print("FACTORS CONTRIBUTING NEGATIVELY")
print("-" * 70)

for _, row in negative_factors.iterrows():

    print(
        f"{row['Human_Feature']:<40} "
        f"{row['SHAP']:.3f}"
    )


# ============================================================
# 16. TOP OVERALL FACTORS
# ============================================================

print("\n" + "-" * 70)
print("TOP FACTORS INFLUENCING THIS STUDENT'S PREDICTION")
print("-" * 70)

for _, row in explanation_df.head(10).iterrows():

    direction = (
        "increased"
        if row["SHAP"] > 0
        else "decreased"
    )

    print(
        f"{row['Human_Feature']:<40} "
        f"{direction:<10} "
        f"{abs(row['SHAP']):.3f}"
    )


# ============================================================
# 17. SAVE EXPLANATION
# ============================================================

explanation_df.to_csv(
    "data/student_prediction_explanation.csv",
    index=False
)