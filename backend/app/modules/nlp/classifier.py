from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib

from app.config import get_settings
from app.core.categories import (
    ExpenseCategory,
    IncomeCategory,
    TransactionType,
    is_valid_category,
)
from app.modules.nlp.preprocessing import preprocess_for_classification

BACKEND_ROOT = Path(__file__).resolve().parents[3]


@dataclass(frozen=True, slots=True)
class ClassificationResult:
    tx_type: TransactionType
    category: ExpenseCategory | IncomeCategory
    confidence: float
    model_name: str


_KEYWORD_RULES: list[tuple[TransactionType, ExpenseCategory | IncomeCategory, tuple[str, ...]]] = [
    (
        "transfer",
        "Lainnya",
        (
            "antar rekening",
            "pindah dana",
            "pindahin saldo",
            "tarik tunai",
            "setor tunai",
            "mutasi internal",
        ),
    ),
    ("income", "Beasiswa", ("beasiswa", "kip kuliah", "baznas")),
    (
        "income",
        "Gaji/Part-time",
        (
            "gaji",
            "honor",
            "asisten praktikum",
            "asisten dosen",
            "freelance",
            "magang",
            "komisi",
            "les privat",
        ),
    ),
    ("income", "Uang Saku", ("uang saku", "orang tua", "kiriman", "jatah bulanan")),
    ("income", "Hadiah", ("thr", "hadiah", "juara", "angpao", "giveaway", "rezeki nomplok")),
    (
        "income",
        "Lainnya",
        ("refund", "bayar utang", "jual buku", "preloved", "cashback", "piutang"),
    ),
    (
        "expense",
        "Pendidikan",
        (
            "fotokopi",
            "print",
            "jilid",
            "buku",
            "ukt",
            "praktikum",
            "skripsi",
            "kuliah",
            "seminar",
            "toefl",
        ),
    ),
    (
        "expense",
        "Transportasi",
        (
            "bensin",
            "pertalite",
            "pertamax",
            "ojek online",
            "taksi online",
            "kereta",
            "transjakarta",
            "parkir",
            "oli",
            "tambal ban",
            "tol",
        ),
    ),
    (
        "expense",
        "Kesehatan",
        (
            "obat",
            "apotek",
            "vitamin",
            "dokter",
            "klinik",
            "puskesmas",
            "rumah sakit",
            "paracetamol",
            "masker",
            "sakit",
        ),
    ),
    (
        "expense",
        "Tagihan",
        ("kos", "listrik", "pln", "kuota", "internet", "pulsa", "laundry", "pdam", "tagihan"),
    ),
    (
        "expense",
        "Gaya Hidup",
        (
            "kopi",
            "boba",
            "bioskop",
            "spotify",
            "netflix",
            "nongkrong",
            "seblak",
            "barbershop",
            "skincare",
            "diamond",
            "konser",
            "karaoke",
        ),
    ),
    (
        "expense",
        "Kebutuhan Primer",
        (
            "makan",
            "sarapan",
            "warteg",
            "nasi",
            "ayam",
            "bakso",
            "soto",
            "beras",
            "galon",
            "indomie",
            "sembako",
            "sayur",
            "buah",
            "roti",
        ),
    ),
]


def resolve_model_path(configured_path: str | None = None) -> Path:
    raw = configured_path or get_settings().nlp_model_path
    candidate = Path(raw)
    if candidate.is_absolute():
        return candidate
    return (BACKEND_ROOT / candidate).resolve()


@lru_cache(maxsize=4)
def _load_artifact_cached(resolved_path_str: str) -> dict[str, Any] | None:
    path = Path(resolved_path_str)
    if not path.exists():
        return None
    loaded = joblib.load(path)
    if isinstance(loaded, dict) and "pipeline" in loaded:
        return loaded
    return None


def clear_classifier_cache() -> None:
    _load_artifact_cached.cache_clear()


def _fallback_keyword_classify(preprocessed: str) -> ClassificationResult:
    padded = f" {preprocessed} "
    for tx_type, category, keywords in _KEYWORD_RULES:
        for kw in keywords:
            if f" {kw} " in padded or kw in preprocessed:
                return ClassificationResult(
                    tx_type=tx_type,
                    category=category,
                    confidence=0.72,
                    model_name="KeywordFallback",
                )
    return ClassificationResult(
        tx_type="expense",
        category="Lainnya",
        confidence=0.40,
        model_name="KeywordFallback",
    )


def classify_text(
    raw_text: str,
    *,
    model_path: str | None = None,
) -> ClassificationResult:
    preprocessed = preprocess_for_classification(raw_text)
    if not preprocessed:
        return ClassificationResult(
            tx_type="expense",
            category="Lainnya",
            confidence=0.0,
            model_name="EmptyInputFallback",
        )

    resolved = resolve_model_path(model_path)
    bundle = _load_artifact_cached(str(resolved))
    if bundle is None:
        return _fallback_keyword_classify(preprocessed)

    pipeline = bundle["pipeline"]
    model_name = str(bundle.get("model_name", "ScikitLearnClassifier"))

    if hasattr(pipeline, "predict_proba"):
        probabilities = pipeline.predict_proba([preprocessed])[0]
        best_idx = int(probabilities.argmax())
        predicted_label = str(pipeline.classes_[best_idx])
        confidence = round(float(probabilities[best_idx]), 4)
    else:
        predicted_label = str(pipeline.predict([preprocessed])[0])
        confidence = 0.75

    if "::" in predicted_label:
        raw_type, raw_category = predicted_label.split("::", 1)
        if is_valid_category(raw_type, raw_category):
            return ClassificationResult(
                tx_type=raw_type,  # type: ignore[arg-type]
                category=raw_category,  # type: ignore[arg-type]
                confidence=confidence,
                model_name=model_name,
            )

    return _fallback_keyword_classify(preprocessed)
