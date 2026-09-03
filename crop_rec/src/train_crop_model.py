from __future__ import annotations

import json
from pathlib import Path
from urllib.request import urlretrieve

import joblib
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    f1_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
REPORT_DIR = PROJECT_ROOT / "reports"
FIGURE_DIR = REPORT_DIR / "figures"
MODEL_DIR = PROJECT_ROOT / "models"

DATA_URL = (
    "https://huggingface.co/datasets/Dukuru/crop_pred/resolve/main/"
    "Crop_recommendation.csv"
)
DATA_PATH = DATA_DIR / "Crop_recommendation.csv"

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"
RANDOM_STATE = 42


def ensure_dirs() -> None:
    for directory in [DATA_DIR, REPORT_DIR, FIGURE_DIR, MODEL_DIR]:
        directory.mkdir(parents=True, exist_ok=True)


def download_dataset() -> None:
    if DATA_PATH.exists():
        return
    print(f"Downloading dataset to {DATA_PATH}")
    urlretrieve(DATA_URL, DATA_PATH)


def load_dataset() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    expected = FEATURES + [TARGET]
    missing = sorted(set(expected) - set(df.columns))
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")
    return df[expected].copy()


def save_eda_figures(df: pd.DataFrame) -> None:
    sns.set_theme(style="whitegrid", context="notebook")

    plt.figure(figsize=(11, 6))
    order = df[TARGET].value_counts().index
    sns.countplot(data=df, y=TARGET, order=order, palette="viridis", hue=TARGET, legend=False)
    plt.title("Crop Label Distribution")
    plt.xlabel("Samples")
    plt.ylabel("Crop")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "crop_distribution.png", dpi=180)
    plt.close()

    plt.figure(figsize=(9, 7))
    corr = df[FEATURES].corr()
    sns.heatmap(corr, annot=True, cmap="crest", fmt=".2f", square=True)
    plt.title("Feature Correlation Heatmap")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "feature_correlation.png", dpi=180)
    plt.close()

    melted = df.melt(id_vars=TARGET, value_vars=FEATURES, var_name="feature", value_name="value")
    g = sns.catplot(
        data=melted,
        x="feature",
        y="value",
        kind="box",
        height=6,
        aspect=1.7,
        palette="Set2",
        hue="feature",
        legend=False,
    )
    g.set_axis_labels("Feature", "Value")
    g.fig.suptitle("Input Feature Ranges", y=1.02)
    plt.xticks(rotation=30, ha="right")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "feature_ranges.png", dpi=180)
    plt.close()


def candidate_models() -> dict[str, Pipeline]:
    return {
        "random_forest": Pipeline(
            [
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=350,
                        random_state=RANDOM_STATE,
                        class_weight="balanced",
                        n_jobs=-1,
                    ),
                )
            ]
        ),
        "extra_trees": Pipeline(
            [
                (
                    "model",
                    ExtraTreesClassifier(
                        n_estimators=350,
                        random_state=RANDOM_STATE,
                        class_weight="balanced",
                        n_jobs=-1,
                    ),
                )
            ]
        ),
        "svm_rbf": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("model", SVC(kernel="rbf", C=10, gamma="scale", probability=True, random_state=RANDOM_STATE)),
            ]
        ),
        "logistic_regression": Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "model",
                    LogisticRegression(
                        max_iter=3000,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
    }


def compare_models(X_train: pd.DataFrame, y_train: pd.Series) -> pd.DataFrame:
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    rows = []
    for name, model in candidate_models().items():
        scores = cross_validate(
            model,
            X_train,
            y_train,
            cv=cv,
            scoring={"accuracy": "accuracy", "macro_f1": "f1_macro"},
            n_jobs=-1,
        )
        rows.append(
            {
                "model": name,
                "cv_accuracy_mean": scores["test_accuracy"].mean(),
                "cv_accuracy_std": scores["test_accuracy"].std(),
                "cv_macro_f1_mean": scores["test_macro_f1"].mean(),
                "cv_macro_f1_std": scores["test_macro_f1"].std(),
            }
        )
    comparison = pd.DataFrame(rows).sort_values("cv_macro_f1_mean", ascending=False)
    comparison.to_csv(REPORT_DIR / "model_comparison.csv", index=False)

    # 1. Model Comparison Bar Plot with Error Bars
    plt.figure(figsize=(10, 6))
    sns.barplot(
        data=comparison,
        x="cv_macro_f1_mean",
        y="model",
        palette="viridis",
        hue="model",
        legend=False,
    )
    plt.errorbar(
        comparison["cv_macro_f1_mean"],
        range(len(comparison)),
        xerr=comparison["cv_macro_f1_std"],
        fmt="none",
        c="black",
        capsize=5,
    )
    plt.title("Model Comparison - CV Macro F1 Score")
    plt.xlabel("Macro F1 Score")
    plt.ylabel("Model")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "model_comparison_f1.png", dpi=180)
    plt.close()

    # 2. Grouped Bar Chart (Accuracy vs F1)
    melted_comparison = comparison.melt(
        id_vars="model", 
        value_vars=["cv_accuracy_mean", "cv_macro_f1_mean"],
        var_name="Metric",
        value_name="Score"
    )
    melted_comparison["Metric"] = melted_comparison["Metric"].replace({
        "cv_accuracy_mean": "Accuracy",
        "cv_macro_f1_mean": "Macro F1"
    })
    
    plt.figure(figsize=(10, 6))
    sns.barplot(
        data=melted_comparison,
        x="Score",
        y="model",
        hue="Metric",
        palette="Set2"
    )
    plt.title("Model Comparison - Accuracy vs Macro F1")
    plt.xlabel("Score")
    plt.ylabel("Model")
    # Setting xlim slightly below minimum score to accentuate differences
    min_score = melted_comparison["Score"].min()
    plt.xlim(max(0, min_score - 0.05), 1.01)
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "model_comparison_grouped.png", dpi=180)
    plt.close()

    return comparison


def tune_random_forest(X_train: pd.DataFrame, y_train: pd.Series) -> GridSearchCV:
    pipeline = Pipeline(
        [
            (
                "model",
                RandomForestClassifier(
                    random_state=RANDOM_STATE,
                    class_weight="balanced",
                    n_jobs=-1,
                ),
            )
        ]
    )
    param_grid = {
        "model__n_estimators": [250, 450, 650],
        "model__max_depth": [None, 12, 20],
        "model__min_samples_split": [2, 4],
        "model__min_samples_leaf": [1, 2],
        "model__max_features": ["sqrt", "log2"],
    }
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    search = GridSearchCV(
        pipeline,
        param_grid=param_grid,
        scoring="f1_macro",
        cv=cv,
        n_jobs=-1,
        verbose=1,
    )
    search.fit(X_train, y_train)
    return search


def save_evaluation_figures(model: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> None:
    y_pred = model.predict(X_test)

    fig, ax = plt.subplots(figsize=(13, 11))
    ConfusionMatrixDisplay.from_predictions(
        y_test,
        y_pred,
        ax=ax,
        xticks_rotation=90,
        cmap="Blues",
        colorbar=False,
    )
    ax.set_title("Confusion Matrix - Tuned Random Forest")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "confusion_matrix.png", dpi=180)
    plt.close(fig)

    rf = model.named_steps["model"]
    importance = (
        pd.DataFrame({"feature": FEATURES, "importance": rf.feature_importances_})
        .sort_values("importance", ascending=False)
    )
    importance.to_csv(REPORT_DIR / "feature_importance.csv", index=False)

    plt.figure(figsize=(9, 5))
    sns.barplot(data=importance, x="importance", y="feature", palette="mako", hue="feature", legend=False)
    plt.title("Random Forest Feature Importance")
    plt.xlabel("Importance")
    plt.ylabel("Feature")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "feature_importance.png", dpi=180)
    plt.close()


def main() -> None:
    ensure_dirs()
    download_dataset()
    df = load_dataset()

    save_eda_figures(df)

    X = df[FEATURES]
    y = df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=RANDOM_STATE,
    )

    comparison = compare_models(X_train, y_train)
    tuned = tune_random_forest(X_train, y_train)
    best_model = tuned.best_estimator_

    y_pred = best_model.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)
    report_df = pd.DataFrame(report).transpose()
    report_df.to_csv(REPORT_DIR / "classification_report.csv")

    metrics = {
        "dataset": {
            "source_url": DATA_URL,
            "rows": int(df.shape[0]),
            "features": FEATURES,
            "target": TARGET,
            "crop_count": int(df[TARGET].nunique()),
            "crops": sorted(df[TARGET].unique().tolist()),
        },
        "split": {
            "train_rows": int(X_train.shape[0]),
            "test_rows": int(X_test.shape[0]),
            "test_size": 0.2,
            "stratified": True,
            "random_state": RANDOM_STATE,
        },
        "model_comparison": comparison.to_dict(orient="records"),
        "best_params": tuned.best_params_,
        "cv_best_macro_f1": float(tuned.best_score_),
        "test_accuracy": float(accuracy_score(y_test, y_pred)),
        "test_macro_f1": float(f1_score(y_test, y_pred, average="macro")),
        "test_weighted_f1": float(f1_score(y_test, y_pred, average="weighted")),
    }
    (REPORT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    save_evaluation_figures(best_model, X_test, y_test)

    artifact = {
        "model": best_model,
        "features": FEATURES,
        "target": TARGET,
        "crop_labels": sorted(df[TARGET].unique().tolist()),
        "dataset_source_url": DATA_URL,
        "metrics": metrics,
    }
    joblib.dump(artifact, MODEL_DIR / "crop_recommendation_model.joblib")

    print("\nTraining complete")
    print(f"Rows: {df.shape[0]}, crops: {df[TARGET].nunique()}")
    print(f"Best params: {tuned.best_params_}")
    print(f"Test accuracy: {metrics['test_accuracy']:.4f}")
    print(f"Test macro F1: {metrics['test_macro_f1']:.4f}")
    print(f"Saved model: {MODEL_DIR / 'crop_recommendation_model.joblib'}")
    print(f"Saved reports: {REPORT_DIR}")


if __name__ == "__main__":
    main()
