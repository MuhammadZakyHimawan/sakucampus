from __future__ import annotations

import uuid
from datetime import date
from typing import Self

from pydantic import Field, model_validator

from app.core.categories import ExpenseCategory
from app.core.constants import MAX_MONEY_AMOUNT
from app.schemas.base import CamelModel


class BudgetPayload(CamelModel):
    category: ExpenseCategory
    limit: int = Field(gt=0, le=MAX_MONEY_AMOUNT)
    period_start: date
    period_end: date

    @model_validator(mode="after")
    def validate_period(self) -> Self:
        if self.period_end < self.period_start:
            raise ValueError("Tanggal selesai tidak boleh sebelum tanggal mulai")
        return self


class BudgetCreate(BudgetPayload):
    pass


class BudgetUpdate(BudgetPayload):
    pass


class BudgetOut(CamelModel):
    id: uuid.UUID
    category: ExpenseCategory
    limit: int
    period_start: date
    period_end: date
