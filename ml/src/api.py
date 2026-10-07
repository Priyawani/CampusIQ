from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import shap


# ============================================================
# 1. CREATE FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="CampusIQ ML API",
    description="AI-powered student performance prediction service",
    version="1.0.0"
)


# ============================================================
# 2. LOAD SAVED MODEL
# ============================================================

model_path = "models/student_performance_model.joblib"

pipeline = joblib.load(model_path)

preprocessor = pipeline.named_steps["preprocessor"]
model = pipeline.named_steps["model"]

explainer = shap.TreeExplainer(model)


# ============================================================
# 3. INPUT DATA MODEL
# ============================================================

class StudentData(BaseModel):

    school: str
    sex: str
    age: int
    address: str
    famsize: str
    Pstatus: str

    Medu: int
    Fedu: int

    Mjob: str
    Fjob: str

    reason: str
    guardian: str

    traveltime: int
    studytime: int
    failures: int

    schoolsup: str
    famsup: str
    paid: str
    activities: str
    nursery: str
    higher: str
    internet: str
    romantic: str

    famrel: int
    freetime: int
    goout: int

    Dalc: int
    Walc: int

    health: int
    absences: int


# ============================================================
# 4. HEALTH CHECK ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "CampusIQ ML API is running",
        "status": "healthy"
    }


# ============================================================
# 5. PREDICTION ENDPOINT
# ============================================================

@app.post("/predict")
def predict_student(student: StudentData):

    # Convert input to dictionary
    student_dict = student.model_dump()

    # Convert to DataFrame
    student_df = pd.DataFrame([student_dict])

    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    prediction = pipeline.predict(student_df)[0]

    prediction = max(0, min(20, prediction))

    # --------------------------------------------------------
    # Performance category
    # --------------------------------------------------------

    if prediction < 10:
        performance = "At Risk"

    elif prediction < 12:
        performance = "Needs Improvement"

    elif prediction < 15:
        performance = "Good"

    else:
        performance = "Excellent"

    # --------------------------------------------------------
    # SHAP explanation
    # --------------------------------------------------------

    student_processed = preprocessor.transform(student_df)

    feature_names = preprocessor.get_feature_names_out()

    shap_values = explainer.shap_values(
        student_processed
    )

    student_shap = shap_values[0]

    explanation_df = pd.DataFrame({
        "Feature": feature_names,
        "SHAP": student_shap
    })

    # --------------------------------------------------------
    # Aggregate one-hot encoded features
    # --------------------------------------------------------

    original_features = {}

    for feature in explanation_df["Feature"]:

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

    explanation_df["Original_Feature"] = (
        explanation_df["Feature"]
        .map(original_features)
    )

    # --------------------------------------------------------
    # Aggregate SHAP values
    # --------------------------------------------------------

    explanation_df = (
        explanation_df
        .groupby(
            "Original_Feature",
            as_index=False
        )["SHAP"]
        .sum()
    )

    # --------------------------------------------------------
    # Absolute impact
    # --------------------------------------------------------

    explanation_df["Absolute_SHAP"] = (
        explanation_df["SHAP"].abs()
    )

    explanation_df = explanation_df.sort_values(
        by="Absolute_SHAP",
        ascending=False
    )

    # --------------------------------------------------------
    # Human-readable names
    # --------------------------------------------------------

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

    explanation_df["Feature"] = (
        explanation_df["Original_Feature"]
        .map(feature_name_mapping)
        .fillna(
            explanation_df["Original_Feature"]
        )
    )

    # --------------------------------------------------------
    # Top explanations
    # --------------------------------------------------------

    top_explanations = []

    for _, row in explanation_df.head(10).iterrows():

        top_explanations.append({
            "feature": row["Feature"],
            "impact": round(float(row["SHAP"]), 3),
            "direction": (
                "positive"
                if row["SHAP"] > 0
                else "negative"
            )
        })

    # --------------------------------------------------------
    # Return JSON response
    # --------------------------------------------------------

    return {
        "predicted_grade": round(
            float(prediction),
            2
        ),

        "performance_level": performance,

        "explanations": top_explanations
    }