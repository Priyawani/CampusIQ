import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor

import shap


# ============================================================
# 1. LOAD DATA
# ============================================================

df = pd.read_csv("data/student-mat-clean.csv")

X = df.drop("G3", axis=1)
y = df["G3"]


# ============================================================
# 2. FEATURES
# ============================================================

categorical_features = [
    "school",
    "sex",
    "address",
    "famsize",
    "Pstatus",
    "Mjob",
    "Fjob",
    "reason",
    "guardian",
    "schoolsup",
    "famsup",
    "paid",
    "activities",
    "nursery",
    "higher",
    "internet",
    "romantic"
]

numerical_features = [
    "age",
    "Medu",
    "Fedu",
    "traveltime",
    "studytime",
    "failures",
    "famrel",
    "freetime",
    "goout",
    "Dalc",
    "Walc",
    "health",
    "absences"
]


# ============================================================
# 3. TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)


# ============================================================
# 4. PREPROCESSOR
# ============================================================

preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        )
    ],
    remainder="passthrough"
)


# ============================================================
# 5. RANDOM FOREST
# ============================================================

model = RandomForestRegressor(
    n_estimators=300,
    random_state=42
)


# ============================================================
# 6. CREATE PIPELINE
# ============================================================

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)


# ============================================================
# 7. TRAIN MODEL
# ============================================================

pipeline.fit(X_train, y_train)

print("=" * 70)
print("CAMPUSIQ - RANDOM FOREST EXPLAINABILITY")
print("=" * 70)

print("\nRandom Forest trained successfully.")


# ============================================================
# 8. TRANSFORM TEST DATA
# ============================================================

X_test_processed = pipeline.named_steps[
    "preprocessor"
].transform(X_test)


# ============================================================
# 9. GET FEATURE NAMES
# ============================================================

feature_names = pipeline.named_steps[
    "preprocessor"
].get_feature_names_out()


# ============================================================
# 10. SHAP EXPLAINER
# ============================================================

explainer = shap.TreeExplainer(
    pipeline.named_steps["model"]
)

shap_values = explainer.shap_values(
    X_test_processed
)


# ============================================================
# 11. GLOBAL FEATURE IMPORTANCE
# ============================================================

mean_abs_shap = np.abs(shap_values).mean(axis=0)

importance_df = pd.DataFrame({
    "Feature": feature_names,
    "Importance": mean_abs_shap
})

importance_df = importance_df.sort_values(
    by="Importance",
    ascending=False
)

print("\nTop 15 Features by SHAP Importance:")
print(
    importance_df.head(15).to_string(
        index=False
    )
)


# ============================================================
# 12. SAVE FEATURE IMPORTANCE
# ============================================================

importance_df.to_csv(
    "data/shap_feature_importance.csv",
    index=False
)


# ============================================================
# 13. SHAP SUMMARY PLOT
# ============================================================

plt.figure()

shap.summary_plot(
    shap_values,
    X_test_processed,
    feature_names=feature_names,
    show=False
)

plt.tight_layout()

plt.savefig(
    "data/shap_summary.png",
    bbox_inches="tight"
)

plt.close()


print("\nSHAP summary plot saved to:")
print("data/shap_summary.png")

print("\nExplainability analysis completed successfully!")