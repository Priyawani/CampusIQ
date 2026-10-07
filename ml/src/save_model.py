import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor


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
# 3. PREPROCESSOR
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
# 4. RANDOM FOREST MODEL
# ============================================================

model = RandomForestRegressor(
    n_estimators=300,
    random_state=42
)


# ============================================================
# 5. PIPELINE
# ============================================================

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)


# ============================================================
# 6. TRAIN ON COMPLETE DATASET
# ============================================================

pipeline.fit(X, y)


# ============================================================
# 7. SAVE MODEL
# ============================================================

model_path = "models/student_performance_model.joblib"

joblib.dump(
    pipeline,
    model_path
)


print("=" * 70)
print("CAMPUSIQ - MODEL SAVING")
print("=" * 70)

print("\nModel trained on complete dataset.")
print("Model saved successfully!")
print("\nLocation:")
print(model_path)