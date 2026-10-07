import pandas as pd
import numpy as np

from sklearn.model_selection import KFold, cross_validate
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline

from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor


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
# 4. MODELS
# ============================================================

models = {

    "Random Forest": RandomForestRegressor(
        n_estimators=300,
        random_state=42
    ),

    "XGBoost": XGBRegressor(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42
    ),

    "LightGBM": LGBMRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=4,
        num_leaves=15,
        random_state=42,
        verbosity=-1
    ),

    "CatBoost": CatBoostRegressor(
        iterations=300,
        depth=5,
        learning_rate=0.05,
        loss_function="RMSE",
        verbose=False,
        random_seed=42
    )
}


# ============================================================
# 5. 5-FOLD CROSS VALIDATION
# ============================================================

cv = KFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)


results = []


for name, model in models.items():

    print("\n" + "-" * 70)
    print("Cross-validating:", name)
    print("-" * 70)

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model)
        ]
    )

    scores = cross_validate(
        pipeline,
        X,
        y,
        cv=cv,
        scoring={
            "mae": "neg_mean_absolute_error",
            "rmse": "neg_root_mean_squared_error",
            "r2": "r2"
        },
        n_jobs=-1
    )

    mae = -scores["test_mae"]
    rmse = -scores["test_rmse"]
    r2 = scores["test_r2"]

    print("MAE per fold :", np.round(mae, 3))
    print("RMSE per fold:", np.round(rmse, 3))
    print("R² per fold  :", np.round(r2, 3))

    print("\nAverage MAE :", round(mae.mean(), 3))
    print("Average RMSE:", round(rmse.mean(), 3))
    print("Average R²  :", round(r2.mean(), 3))

    results.append({
        "Model": name,
        "Mean MAE": mae.mean(),
        "Mean RMSE": rmse.mean(),
        "Mean R2": r2.mean()
    })


# ============================================================
# 6. FINAL COMPARISON
# ============================================================

results_df = pd.DataFrame(results)

results_df = results_df.sort_values(
    by="Mean RMSE"
)

print("\n")
print("=" * 70)
print("5-FOLD CROSS-VALIDATION RESULTS")
print("=" * 70)

print(
    results_df.to_string(
        index=False,
        formatters={
            "Mean MAE": "{:.3f}".format,
            "Mean RMSE": "{:.3f}".format,
            "Mean R2": "{:.3f}".format
        }
    )
)

print("\nCross-validation completed successfully!")