import numpy as np
import pandas as pd

# Make results reproducible
np.random.seed(42)

# Number of student records
NUM_STUDENTS = 2000

# Generate student academic features
attendance_pct = np.random.normal(78, 12, NUM_STUDENTS)
attendance_pct = np.clip(attendance_pct, 40, 100)

internal_avg_pct = np.random.normal(72, 14, NUM_STUDENTS)
internal_avg_pct = np.clip(internal_avg_pct, 30, 100)

midterm_avg_pct = np.random.normal(70, 15, NUM_STUDENTS)
midterm_avg_pct = np.clip(midterm_avg_pct, 25, 100)

assignment_avg_pct = np.random.normal(75, 13, NUM_STUDENTS)
assignment_avg_pct = np.clip(assignment_avg_pct, 30, 100)

quiz_avg_pct = np.random.normal(73, 15, NUM_STUDENTS)
quiz_avg_pct = np.clip(quiz_avg_pct, 20, 100)

previous_cgpa = np.random.normal(7.5, 1.2, NUM_STUDENTS)
previous_cgpa = np.clip(previous_cgpa, 4.0, 10.0)

previous_failed_subjects = np.random.poisson(0.8, NUM_STUDENTS)
previous_failed_subjects = np.clip(previous_failed_subjects, 0, 5)

# Generate realistic end-semester score
cgpa_percentage = previous_cgpa * 10

failure_penalty = previous_failed_subjects * 2

noise = np.random.normal(0, 5, NUM_STUDENTS)

end_semester_score = (
    0.20 * attendance_pct
    + 0.25 * internal_avg_pct
    + 0.20 * midterm_avg_pct
    + 0.10 * assignment_avg_pct
    + 0.10 * quiz_avg_pct
    + 0.15 * cgpa_percentage
    - failure_penalty
    + noise
)

# Keep score between 0 and 100
end_semester_score = np.clip(end_semester_score, 0, 100)

# Create DataFrame
df = pd.DataFrame({
    "attendance_pct": attendance_pct.round(2),
    "internal_avg_pct": internal_avg_pct.round(2),
    "midterm_avg_pct": midterm_avg_pct.round(2),
    "assignment_avg_pct": assignment_avg_pct.round(2),
    "quiz_avg_pct": quiz_avg_pct.round(2),
    "previous_cgpa": previous_cgpa.round(2),
    "previous_failed_subjects": previous_failed_subjects,
    "end_semester_score_pct": end_semester_score.round(2)
})

# Save dataset
output_path = "data/student_academic_performance.csv"
df.to_csv(output_path, index=False)

print("Dataset generated successfully!")
print(f"Number of records: {len(df)}")
print(f"Saved to: {output_path}")
print("\nFirst 5 records:")
print(df.head())

print("\nDataset statistics:")
print(df.describe())