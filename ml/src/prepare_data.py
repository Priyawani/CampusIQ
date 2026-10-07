import pandas as pd

# Load the original UCI dataset
input_path = "data/student-mat.csv"
output_path = "data/student-mat-clean.csv"

df = pd.read_csv(input_path, sep=";")

print("Original dataset shape:", df.shape)

# G1 and G2 are excluded because they are previous-period grades.
# We want an early prediction model that does not depend on them.
features = [
    "school",
    "sex",
    "age",
    "address",
    "famsize",
    "Pstatus",
    "Medu",
    "Fedu",
    "Mjob",
    "Fjob",
    "reason",
    "guardian",
    "traveltime",
    "studytime",
    "failures",
    "schoolsup",
    "famsup",
    "paid",
    "activities",
    "nursery",
    "higher",
    "internet",
    "romantic",
    "famrel",
    "freetime",
    "goout",
    "Dalc",
    "Walc",
    "health",
    "absences",
]

target = "G3"

# Keep only selected features + target
clean_df = df[features + [target]].copy()

# Verify missing values
print("\nMissing values:")
print(clean_df.isnull().sum().sum())

# Save cleaned dataset
clean_df.to_csv(output_path, index=False)

print("\nCleaned dataset shape:", clean_df.shape)
print("Saved to:", output_path)

print("\nFirst 5 rows:")
print(clean_df.head().to_string())