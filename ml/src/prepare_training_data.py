from pathlib import Path

import pandas as pd

EXCEL_PATH = (
    Path(__file__).resolve().parents[2]
    / "backend"
    / "src"
    / "jobs"
    / "23CSE2003 - Software Engineering.xlsx"
)
ATTENDANCE_COLUMN_INDEX = 8
ATTENDANCE_THRESHOLD = 75.0
MAX_CA_MARKS = 50.0
CA_PASS_RATIO = 0.4


def clean_attendance(path):
    frame = pd.read_excel(path, sheet_name="TH", skiprows=3)
    frame = frame[frame["Enrollment No."].notna()].copy()

    columns = list(frame.columns)
    attendance_column = next(
        (
            column
            for column in columns
            if isinstance(column, str) and "% Attendance" in column
        ),
        columns[ATTENDANCE_COLUMN_INDEX],
    )

    frame = frame[["Enrollment No.", "Name of Student", attendance_column]].copy()
    frame.columns = ["enrollment_no", "name", "attendance_percentage"]
    frame["enrollment_no"] = frame["enrollment_no"].astype(str).str.strip()
    frame["attendance_percentage"] = pd.to_numeric(
        frame["attendance_percentage"], errors="coerce"
    )
    frame["attendance_percentage"] = frame["attendance_percentage"].fillna(
        frame["attendance_percentage"].mean()
    )
    return frame


def clean_assessment(path):
    frame = pd.read_excel(path, sheet_name="TH-CA", skiprows=3)
    frame = frame[frame["Enrollment No."].notna()].copy()
    frame = frame[
        [
            "Enrollment No.",
            "Total Assign. Marks",
            "Total TA Marks",
            "Final CA Marks",
        ]
    ].copy()
    frame.columns = [
        "enrollment_no",
        "total_assignment_marks",
        "total_ta_marks",
        "final_ca_marks",
    ]
    frame["enrollment_no"] = frame["enrollment_no"].astype(str).str.strip()

    mark_columns = [
        "total_assignment_marks",
        "total_ta_marks",
        "final_ca_marks",
    ]
    for column in mark_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0)

    return frame


def build_training_data():
    attendance = clean_attendance(EXCEL_PATH)
    assessment = clean_assessment(EXCEL_PATH)

    merged = attendance.merge(assessment, on="enrollment_no", how="inner")

    numeric_columns = merged.select_dtypes(include="number").columns
    merged[numeric_columns] = merged[numeric_columns].fillna(0)

    ca_pass_marks = MAX_CA_MARKS * CA_PASS_RATIO
    merged["is_at_risk"] = (
        (merged["attendance_percentage"] < ATTENDANCE_THRESHOLD)
        | (merged["final_ca_marks"] < ca_pass_marks)
    ).astype(int)

    return merged


if __name__ == "__main__":
    df = build_training_data()
    print("Final training data shape:", df.shape)
    print("At-risk students:", int(df["is_at_risk"].sum()))
    df.to_csv("training_data.csv", index=False)
    print("Saved to: training_data.csv")
