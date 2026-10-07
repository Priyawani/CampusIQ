import pandas as pd
import matplotlib.pyplot as plt

# Load cleaned dataset
df = pd.read_csv("data/student-mat-clean.csv")

print("=" * 60)
print("CAMPUSIQ - EXPLORATORY DATA ANALYSIS")
print("=" * 60)

# --------------------------------------------------
# 1. Dataset information
# --------------------------------------------------

print("\nDataset Shape:")
print(df.shape)

print("\nColumns:")
print(df.columns.tolist())

# --------------------------------------------------
# 2. Basic statistics
# --------------------------------------------------

print("\nBasic Statistics:")
print(df.describe().T)

# --------------------------------------------------
# 3. Missing values
# --------------------------------------------------

print("\nMissing Values:")
print(df.isnull().sum())

# --------------------------------------------------
# 4. Target distribution
# --------------------------------------------------

print("\nFinal Grade (G3) Statistics:")
print(df["G3"].describe())

# --------------------------------------------------
# 5. Correlation with target
# --------------------------------------------------

numeric_df = df.select_dtypes(include=["int64", "float64"])

correlation = numeric_df.corr()["G3"].sort_values(ascending=False)

print("\nCorrelation with Final Grade (G3):")
print(correlation)

# --------------------------------------------------
# 6. Study time vs final grade
# --------------------------------------------------

print("\nAverage G3 by Study Time:")
print(
    df.groupby("studytime")["G3"]
    .mean()
    .round(2)
)

# --------------------------------------------------
# 7. Failures vs final grade
# --------------------------------------------------

print("\nAverage G3 by Previous Failures:")
print(
    df.groupby("failures")["G3"]
    .mean()
    .round(2)
)

# --------------------------------------------------
# 8. Absences vs final grade
# --------------------------------------------------

print("\nAverage G3 by Absences:")
print(
    df.groupby("absences")["G3"]
    .mean()
    .round(2)
)

# --------------------------------------------------
# 9. Visualization - Target distribution
# --------------------------------------------------

plt.figure(figsize=(8, 5))

plt.hist(df["G3"], bins=21, edgecolor="black")

plt.title("Distribution of Final Grades")
plt.xlabel("Final Grade (G3)")
plt.ylabel("Number of Students")

plt.tight_layout()
plt.savefig("data/g3_distribution.png")

plt.show()

# --------------------------------------------------
# 10. Study time vs final grade
# --------------------------------------------------

studytime_avg = df.groupby("studytime")["G3"].mean()

plt.figure(figsize=(8, 5))

plt.bar(
    studytime_avg.index.astype(str),
    studytime_avg.values
)

plt.title("Study Time vs Final Grade")
plt.xlabel("Study Time Category")
plt.ylabel("Average Final Grade")

plt.tight_layout()
plt.savefig("data/studytime_vs_g3.png")

plt.show()

# --------------------------------------------------
# 11. Previous failures vs final grade
# --------------------------------------------------

failure_avg = df.groupby("failures")["G3"].mean()

plt.figure(figsize=(8, 5))

plt.bar(
    failure_avg.index.astype(str),
    failure_avg.values
)

plt.title("Previous Failures vs Final Grade")
plt.xlabel("Number of Previous Failures")
plt.ylabel("Average Final Grade")

plt.tight_layout()
plt.savefig("data/failures_vs_g3.png")

plt.show()

print("\nEDA completed successfully!")
print("Charts saved inside the data/ folder.")