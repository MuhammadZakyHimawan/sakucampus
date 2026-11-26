from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.core.categories import ExpenseCategory, IncomeCategory, TransactionType
from app.modules.nlp.amount_parser import parse_amount_and_description
from app.modules.nlp.classifier import BACKEND_ROOT, classify_text

CONFIDENCE_CONFIRMATION_THRESHOLD = 0.55
DEFAULT_METRICS_PATH = BACKEND_ROOT / "ml" / "artifacts" / "metrics.json"


@dataclass(frozen=True, slots=True)
class ParsedTransactionResult:
    raw_text: str
    amount: int | None
    type: TransactionType
    category: ExpenseCategory | IncomeCategory
    description: str
    confidence: float
    needs_confirmation: bool
    model_name: str


def parse_transaction_text(
    raw_text: str,
    *,
    model_path: str | None = None,
) -> ParsedTransactionResult:
    stripped = raw_text.strip()
    amount_info = parse_amount_and_description(stripped)
    cls_info = classify_text(stripped, model_path=model_path)

    needs_confirmation = (
        amount_info.amount is None or cls_info.confidence < CONFIDENCE_CONFIRMATION_THRESHOLD
    )

    return ParsedTransactionResult(
        raw_text=stripped,
        amount=amount_info.amount,
        type=cls_info.tx_type,
        category=cls_info.category,
        description=amount_info.clean_description,
        confidence=cls_info.confidence,
        needs_confirmation=needs_confirmation,
        model_name=cls_info.model_name,
    )


def load_nlp_metrics(metrics_path: Path | None = None) -> dict[str, Any] | None:
    target = metrics_path or DEFAULT_METRICS_PATH
    if not target.exists():
        return None
    return json.loads(target.read_text(encoding="utf-8"))
