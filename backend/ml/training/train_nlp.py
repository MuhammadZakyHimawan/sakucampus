from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import FeatureUnion, Pipeline

from app.core.categories import is_valid_category
from app.modules.nlp.preprocessing import preprocess_for_classification
from ml.datasets.build_dataset import DATASET_PATH, generate_dataset

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
MODEL_ARTIFACT_PATH = ARTIFACTS_DIR / "category_classifier.joblib"
METRICS_ARTIFACT_PATH = ARTIFACTS_DIR / "metrics.json"


def _build_vectorizer() -> FeatureUnion:
    return FeatureUnion(
        [
            (
                "word_tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    sublinear_tf=True,
                    min_df=1,
                ),
            ),
            (
                "char_tfidf",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    sublinear_tf=True,
                    min_df=2,
                ),
            ),
        ]
    )


def _evaluate_model(
    name: str,
    pipeline: Pipeline,
    x_train: pd.Series,
    y_train: pd.Series,
    x_test: pd.Series,
    y_test: pd.Series,
) -> dict[str, Any]:
    pipeline.fit(x_train, y_train)
    preds = pipeline.predict(x_test)

    report_dict = classification_report(
        y_test,
        preds,
        output_dict=True,
        zero_division=0,
    )
    per_class = {
        label: {
            "precision": round(float(stats["precision"]), 4),
            "recall": round(float(stats["recall"]), 4),
            "f1Score": round(float(stats["f1-score"]), 4),
            "support": int(stats["support"]),
        }
        for label, stats in report_dict.items()
        if "::" in label
    }

    return {
        "modelName": name,
        "accuracy": round(float(accuracy_score(y_test, preds)), 4),
        "macroPrecision": round(
            float(precision_score(y_test, preds, average="macro", zero_division=0)),
            4,
        ),
        "macroRecall": round(
            float(recall_score(y_test, preds, average="macro", zero_division=0)),
            4,
        ),
        "macroF1": round(
            float(f1_score(y_test, preds, average="macro", zero_division=0)),
            4,
        ),
        "weightedF1": round(
            float(f1_score(y_test, preds, average="weighted", zero_division=0)),
            4,
        ),
        "perClass": per_class,
    }


def train_and_evaluate() -> dict[str, Any]:
    if not DATASET_PATH.exists():
        generate_dataset()

    df = pd.read_csv(DATASET_PATH)
    required_cols = {"text", "transaction_type", "category"}
    if not required_cols.issubset(df.columns):
        raise ValueError(f"Dataset wajib memiliki kolom {required_cols}")

    # Validate every row against SakuCampus category contract
    invalid_rows = [
        idx
        for idx, row in df.iterrows()
        if not is_valid_category(str(row["transaction_type"]), str(row["category"]))
    ]
    if invalid_rows:
        raise ValueError(f"Ditemukan baris kategori tidak valid pada index: {invalid_rows[:5]}")

    df["preprocessed"] = df["text"].astype(str).map(preprocess_for_classification)
    df = df[df["preprocessed"].str.len() > 0].copy()

    # Deduplicate on both raw text and preprocessed text BEFORE split to prevent leakage
    before_dedup = len(df)
    df = (
        df.drop_duplicates(subset=["text"])
        .drop_duplicates(subset=["preprocessed"])
        .reset_index(drop=True)
    )
    after_dedup = len(df)

    df["target"] = df["transaction_type"] + "::" + df["category"]

    x_train, x_test, y_train, y_test = train_test_split(
        df["preprocessed"],
        df["target"],
        test_size=0.2,
        random_state=42,
        stratify=df["target"],
    )

    candidates: list[tuple[str, Pipeline]] = [
        (
            "Multinomial Naive Bayes",
            Pipeline(
                [
                    ("features", _build_vectorizer()),
                    ("clf", MultinomialNB(alpha=0.3)),
                ]
            ),
        ),
        (
            "Random Forest",
            Pipeline(
                [
                    ("features", _build_vectorizer()),
                    (
                        "clf",
                        RandomForestClassifier(
                            n_estimators=300,
                            random_state=42,
                        ),
                    ),
                ]
            ),
        ),
    ]

    evaluations: list[dict[str, Any]] = []
    trained_pipelines: dict[str, Pipeline] = {}

    for model_name, pipeline in candidates:
        metrics = _evaluate_model(model_name, pipeline, x_train, y_train, x_test, y_test)
        evaluations.append(metrics)
        trained_pipelines[model_name] = pipeline

    best_eval = max(evaluations, key=lambda item: (item["macroF1"], item["accuracy"]))
    best_name = best_eval["modelName"]
    best_pipeline = trained_pipelines[best_name]

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    artifact_bundle = {
        "model_name": best_name,
        "pipeline": best_pipeline,
        "classes": list(best_pipeline.classes_),
        "trained_at": datetime.now(UTC).isoformat(),
    }
    joblib.dump(artifact_bundle, MODEL_ARTIFACT_PATH)

    class_distribution = {
        str(label): int(count) for label, count in df["target"].value_counts().sort_index().items()
    }

    summary_payload: dict[str, Any] = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "dataset": {
            "totalRowsBeforeDedup": before_dedup,
            "totalUniqueRows": after_dedup,
            "trainSize": int(len(x_train)),
            "testSize": int(len(x_test)),
            "numClasses": int(df["target"].nunique()),
            "classDistribution": class_distribution,
        },
        "selectedModel": best_name,
        "selectedMetrics": {
            "accuracy": best_eval["accuracy"],
            "macroPrecision": best_eval["macroPrecision"],
            "macroRecall": best_eval["macroRecall"],
            "macroF1": best_eval["macroF1"],
            "weightedF1": best_eval["weightedF1"],
        },
        "models": evaluations,
    }

    METRICS_ARTIFACT_PATH.write_text(
        json.dumps(summary_payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("=== SAKUCAMPUS NLP TRAINING SUMMARY ===")
    print(
        f"Dataset: {after_dedup} unique rows "
        f"(Train: {len(x_train)}, Test: {len(x_test)}, Classes: {df['target'].nunique()})"
    )
    for item in evaluations:
        print(
            f"- {item['modelName']:25s} | "
            f"Acc: {item['accuracy']:.4f} | "
            f"Macro-P: {item['macroPrecision']:.4f} | "
            f"Macro-R: {item['macroRecall']:.4f} | "
            f"Macro-F1: {item['macroF1']:.4f}"
        )
    print(f"Selected Best Model: {best_name} -> {MODEL_ARTIFACT_PATH}")
    return summary_payload


if __name__ == "__main__":
    train_and_evaluate()
