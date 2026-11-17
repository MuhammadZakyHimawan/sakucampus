from __future__ import annotations

from pydantic import Field

from app.core.categories import PeriodPreset
from app.schemas.base import CamelModel


class FinanceSettingsOut(CamelModel):
    currency: str
    initial_balance: int
    min_balance: int
    period: PeriodPreset
    notify_budget: bool
    notify_balance: bool
    notify_goal: bool


class FinanceSettingsUpdate(CamelModel):
    initial_balance: int | None = Field(default=None, ge=0)
    min_balance: int | None = Field(default=None, ge=0)
    period: PeriodPreset | None = None
    notify_budget: bool | None = None
    notify_balance: bool | None = None
    notify_goal: bool | None = None
