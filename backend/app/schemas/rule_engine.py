from __future__ import annotations

import datetime as dt
from typing import Literal

from app.schemas.base import CamelModel
from app.schemas.notification import NotificationOut

SeverityType = Literal["normal", "warning", "critical"]
NotificationCategoryType = Literal["budget", "balance", "goal", "info"]


class RuleEvaluateRequest(CamelModel):
    force_month_end: bool = False
    persist_notifications: bool = True
    reference_date: dt.date | None = None


class RuleAlertOut(CamelModel):
    rule_code: str
    notification_type: NotificationCategoryType
    severity: SeverityType
    title: str
    message: str
    dedup_key: str
    link: str


class RuleMetricsOut(CamelModel):
    reference_date: dt.date
    period_start: dt.date
    period_end: dt.date
    elapsed_days: int
    remaining_days_in_month: int
    initial_balance: int
    min_balance: int
    balance: int
    period_income: int
    period_expense: int
    net_cash_flow: int
    daily_burn_rate: int
    runway_days: float | None
    safe_daily_spend: int


class RuleEvaluationResponse(CamelModel):
    financial_status: SeverityType
    metrics: RuleMetricsOut
    alerts: list[RuleAlertOut]
    new_notifications: list[NotificationOut]
