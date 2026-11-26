from __future__ import annotations

import uuid
from datetime import date
from typing import Self

from pydantic import AliasChoices, Field, model_validator

from app.core.categories import ExpenseCategory
from app.schemas.base import CamelModel


class BudgetPayload(CamelModel):
    category: ExpenseCategory
    limit: int = Field(gt=0)
    period_start: date
    period_end: date

    @model_validator(mode="after")
    def validate_period(self) -> Self:
        if self.period_end < self.period_start:
            raise ValueError("Tanggal selesai tidak boleh sebelum tanggal mulai")
        return self


class BudgetCreate(BudgetPayload):
    pass


class BudgetUpdate(CamelModel):
    category: ExpenseCategory | None = None
    limit: int | None = Field(default=None, gt=0)
    period_start: date | None = None
    period_end: date | None = None

    @model_validator(mode="after")
    def validate_period(self) -> Self:
        if (
            self.period_start is not None
            and self.period_end is not None
            and self.period_end < self.period_start
        ):
            raise ValueError("Tanggal selesai tidak boleh sebelum tanggal mulai")
        return self


class BudgetOut(CamelModel):
    id: uuid.UUID
    category: ExpenseCategory
    limit: int = Field(
        validation_alias=AliasChoices("limit", "limit_amount"),
        serialization_alias="limit",
    )
    period_start: date
    period_end: date
