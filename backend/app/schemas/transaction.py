from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated, Self

from pydantic import Field, StringConstraints, model_validator

from app.core.categories import (
    ExpenseCategory,
    IncomeCategory,
    TransactionSource,
    TransactionType,
    categories_for_type,
)
from app.schemas.base import CamelModel

Description = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]


class TransactionPayload(CamelModel):
    description: Description
    amount: int = Field(gt=0)
    type: TransactionType
    category: ExpenseCategory | IncomeCategory
    date: date
    source: TransactionSource = "manual"
    note: Note | None = None

    @model_validator(mode="after")
    def validate_payload(self) -> Self:
        if self.category not in categories_for_type(self.type):
            raise ValueError("Kategori tidak sesuai dengan jenis transaksi")
        if self.note == "":
            self.note = None
        return self


class TransactionCreate(TransactionPayload):
    pass


class TransactionUpdate(TransactionPayload):
    pass


class TransactionOut(CamelModel):
    id: uuid.UUID
    description: str
    amount: int
    type: TransactionType
    category: ExpenseCategory | IncomeCategory
    date: date
    source: TransactionSource
    note: str | None = None
