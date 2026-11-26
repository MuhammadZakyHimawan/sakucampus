from __future__ import annotations

from typing import Annotated, Any

from pydantic import Field, StringConstraints

from app.core.categories import ExpenseCategory, IncomeCategory, TransactionType
from app.schemas.base import CamelModel

RawTextInput = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]


class NlpParseRequest(CamelModel):
    text: RawTextInput


class NlpParseResponse(CamelModel):
    raw_text: str
    amount: int | None = None
    type: TransactionType
    category: ExpenseCategory | IncomeCategory
    description: str
    confidence: float = Field(ge=0.0, le=1.0)
    needs_confirmation: bool
    model_name: str


class ClassMetricOut(CamelModel):
    precision: float
    recall: float
    f1_score: float
    support: int


class ModelEvaluationOut(CamelModel):
    model_name: str
    accuracy: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    weighted_f1: float
    per_class: dict[str, ClassMetricOut]


class DatasetSummaryOut(CamelModel):
    total_rows_before_dedup: int
    total_unique_rows: int
    train_size: int
    test_size: int
    num_classes: int
    class_distribution: dict[str, int]


class SelectedMetricsOut(CamelModel):
    accuracy: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    weighted_f1: float


class NlpMetricsResponse(CamelModel):
    generated_at: str
    dataset: DatasetSummaryOut
    selected_model: str
    selected_metrics: SelectedMetricsOut
    models: list[dict[str, Any] | ModelEvaluationOut]
