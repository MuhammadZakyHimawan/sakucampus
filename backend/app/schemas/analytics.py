from __future__ import annotations

from datetime import date
from typing import Literal

from app.schemas.base import CamelModel
from app.schemas.budget import BudgetOut
from app.schemas.goal import GoalOut
from app.schemas.rule_engine import RuleAlertOut
from app.schemas.settings import PeriodPreset
from app.schemas.transaction import TransactionOut

BudgetStatus = Literal["safe", "warning", "exceeded"]
FinancialStatus = Literal["normal", "warning", "critical"]
InsightTone = Literal["positive", "warning", "danger", "info"]


class PeriodRangeOut(CamelModel):
    start: date
    end: date
    label: str


class CategoryTotalOut(CamelModel):
    category: str
    total: int


class CashflowPointOut(CamelModel):
    key: str
    label: str
    range_label: str
    income: int
    expense: int


class BudgetOverviewItemOut(CamelModel):
    budget: BudgetOut
    used: int
    remaining: int
    percentage: int
    status: BudgetStatus


class FinancialInsightOut(CamelModel):
    id: str
    tone: InsightTone
    title: str
    description: str


class DashboardMetricsOut(CamelModel):
    balance: int
    min_balance: int
    total_income: int
    total_expense: int
    net_cash_flow: int
    daily_burn_rate: int
    runway_days: float | None
    safe_daily_spend: int
    financial_status: FinancialStatus


class DashboardSummaryOut(CamelModel):
    period: PeriodPreset
    range: PeriodRangeOut
    summary: DashboardMetricsOut
    cashflow: list[CashflowPointOut]
    categories: list[CategoryTotalOut]
    budgets: list[BudgetOverviewItemOut]
    goals: list[GoalOut]
    insights: list[FinancialInsightOut]
    rule_alerts: list[RuleAlertOut]
    recent_transactions: list[TransactionOut]
    transaction_count: int


class ReportSummaryOut(CamelModel):
    income: int
    expense: int
    net: int
    daily_average_expense: int
    transaction_count: int


class ReportComparisonOut(CamelModel):
    previous: ReportSummaryOut
    income_change: float | None
    expense_change: float | None
    net_change: float | None


class ReportAnalyticsOut(CamelModel):
    range: PeriodRangeOut
    previous_range: PeriodRangeOut
    balance: int
    min_balance: int
    daily_burn_rate: int
    runway_days: float | None
    safe_daily_spend: int
    financial_status: FinancialStatus
    summary: ReportSummaryOut
    comparison: ReportComparisonOut
    cashflow: list[CashflowPointOut]
    categories: list[CategoryTotalOut]
    budgets: list[BudgetOverviewItemOut]
    goals: list[GoalOut]
    rule_alerts: list[RuleAlertOut]
    transactions: list[TransactionOut]
