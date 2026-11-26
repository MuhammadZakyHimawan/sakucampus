from __future__ import annotations

from datetime import date
from typing import Literal

from app.schemas.base import CamelModel
from app.schemas.budget import BudgetOut
from app.schemas.transaction import TransactionOut

PeriodPreset = Literal["7d", "30d", "month"]
BudgetStatus = Literal["safe", "warning", "exceeded"]
InsightTone = Literal["positive", "warning", "danger", "info"]


class PeriodRangeOut(CamelModel):
    start: date
    end: date
    label: str


class DashboardSummaryOut(CamelModel):
    balance: int
    min_balance: int
    income: int
    expense: int
    net: int
    burn_rate: int


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


class DashboardDataOut(CamelModel):
    period: PeriodPreset
    range: PeriodRangeOut
    summary: DashboardSummaryOut
    cashflow: list[CashflowPointOut]
    categories: list[CategoryTotalOut]
    budgets: list[BudgetOverviewItemOut]
    insights: list[FinancialInsightOut]
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


class ReportDataOut(CamelModel):
    range: PeriodRangeOut
    previous_range: PeriodRangeOut
    summary: ReportSummaryOut
    comparison: ReportComparisonOut
    cashflow: list[CashflowPointOut]
    categories: list[CategoryTotalOut]
    transactions: list[TransactionOut]
