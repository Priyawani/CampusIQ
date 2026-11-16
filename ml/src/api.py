from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import os
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

model_path = os.getenv(
    "MODEL_PATH",
    "models/student_performance_model.joblib",
)

pipeline = joblib.load(model_path)

preprocessor = pipeline.named_steps["preprocessor"]
model = pipeline.named_steps["model"]

explainer = shap.TreeExplainer(model)


# ============================================================
# 3. INPUT DATA MODEL
# ------------------------------------------------------------
# Accepts the live PostgreSQL-backed payload sent by Node.js:
#   { studentId, attendanceRate, averageScore, ...modelFeatures }
# `attendanceRate`  = Attendance % aggregated from Attendance table.
# `averageScore`    = Average % aggregated from Mark table.
# These live fields are mapped onto the CatBoost model's native
# features (absences / failures) at inference time below, so the
# prediction always uses the incoming live values — never a CSV lookup.
# ============================================================

class StudentData(BaseModel):

    # --- Live dynamic fields from Node.js / PostgreSQL (optional) ---
    studentId: Optional[int] = None
    attendanceRate: Optional[float] = None
    averageScore: Optional[float] = None

    # --- Native CatBoost model features (UCI student-mat schema) ---
    school: str = "GP"
    sex: str = "F"
    age: int = 18
    address: str = "U"
    famsize: str = "GT3"
    Pstatus: str = "T"

    Medu: int = 3
    Fedu: int = 3

    Mjob: str = "services"
    Fjob: str = "services"

    reason: str = "course"
    guardian: str = "mother"

    traveltime: int = 1
    studytime: int = 2
    failures: int = 0

    schoolsup: str = "no"
    famsup: str = "yes"
    paid: str = "no"
    activities: str = "yes"
    nursery: str = "yes"
    higher: str = "yes"
    internet: str = "yes"
    romantic: str = "no"

    famrel: int = 4
    freetime: int = 3
    goout: int = 3

    Dalc: int = 1
    Walc: int = 1

    health: int = 5
    absences: int = 0


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

    # Convert input to dictionary.
    # NOTE: inference uses ONLY these incoming live payload values.
    # There is intentionally no CSV / static-dataset lookup here —
    # Node.js already aggregated the student's live PostgreSQL rows
    # (Attendance %, average Mark score) into this payload.
    student_dict = student.model_dump()

    # --------------------------------------------------------
    # Map live PostgreSQL fields onto native model features
    # --------------------------------------------------------
    # attendanceRate (0-100 %) -> absences (model-native count).
    # Node.js already sends an accurate `absences` count, so only
    # derive it when the caller sent attendanceRate without absences.
    live_attendance = student_dict.get("attendanceRate")
    live_score = student_dict.get("averageScore")

    if live_attendance is not None:
        try:
            rate = max(0.0, min(100.0, float(live_attendance)))
            # Heuristic fallback: ~0.25 absences per missed percent point.
            derived_absences = int(round((100.0 - rate) * 0.25))
            # Prefer the explicit live `absences` count when provided
            # (Node sends both); otherwise use the derived value.
            if student_dict.get("absences", 0) == 0 and derived_absences > 0:
                student_dict["absences"] = max(0, min(75, derived_absences))
        except (TypeError, ValueError):
            pass

    # averageScore (0-100 %) -> failures (model-native signal).
    # A live average below 50% indicates a prior-failure pattern.
    if live_score is not None:
        try:
            score = float(live_score)
            if score <= 0:
                pass  # no marks yet — keep caller-supplied failures
            elif score < 40:
                student_dict["failures"] = max(int(student_dict.get("failures", 0)), 2)
            elif score < 50:
                student_dict["failures"] = max(int(student_dict.get("failures", 0)), 1)
            else:
                # Strong live average clears a stale default failure flag
                # only when the caller did not explicitly send failures.
                pass
        except (TypeError, ValueError):
            pass

    # Keep ONLY the columns the CatBoost pipeline was trained on.
    # Extra live fields (studentId, attendanceRate, averageScore)
    # are metadata for traceability — they must not reach the model.
    model_features = [
        "school", "sex", "age", "address", "famsize", "Pstatus",
        "Medu", "Fedu", "Mjob", "Fjob", "reason", "guardian",
        "traveltime", "studytime", "failures", "schoolsup", "famsup",
        "paid", "activities", "nursery", "higher", "internet",
        "romantic", "famrel", "freetime", "goout", "Dalc", "Walc",
        "health", "absences",
    ]
    model_dict = {k: student_dict[k] for k in model_features}

    # Convert to DataFrame
    student_df = pd.DataFrame([model_dict])

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

        "explanations": top_explanations,

        # Echo the live PostgreSQL-derived inputs used for this
        # inference (traceability for the Node.js caller).
        "live_inputs": {
            "studentId": student_dict.get("studentId"),
            "attendanceRate": student_dict.get("attendanceRate"),
            "averageScore": student_dict.get("averageScore"),
            "absences": model_dict["absences"],
            "failures": model_dict["failures"],
        },
    }