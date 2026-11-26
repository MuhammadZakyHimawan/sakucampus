from __future__ import annotations

import calendar
import uuid
from dataclasses import dataclass
from datetime import date

from app.models import Budget, FinanceSettings, Transaction
from app.schemas.goal import GoalOut

BUDGET_WARNING_THRESHOLD = 75.0
BUDGET_EXCEEDED_THRESHOLD = 100.0


@dataclass(frozen=True, slots=True)
class BudgetUsageMetric:
    budget_id: uuid.UUID
    category: str
    period_start: date
    period_end: date
    period_kind: str
    limit_amount: int
    spent: int
    remaining: int
    percentage: float
    percentage_int: int
    status: str  # 'safe' | 'warning' | 'exceeded'
    is_active: bool


@dataclass(frozen=True, slots=True)
class GoalProgressMetric:
    goal_id: uuid.UUID
    name: str
    target_amount: int
    saved_amount: int
    percentage: float
    percentage_int: int
    deadline: date
    days_until_deadline: int


@dataclass(frozen=True, slots=True)
class FinancialMetrics:
    reference_date: date
    period_start: date
    period_end: date
    elapsed_days: int
    remaining_days_in_month: int
    days_after_today_in_month: int
    is_month_end_window: bool
    initial_balance: int
    min_balance: int
    total_income_all_time: int
    total_expense_all_time: int
    balance: int
    period_income: int
    period_expense: int
    net_cash_flow: int
    daily_burn_rate: int
    runway_days: float | None
    safe_daily_spend: int
    budget_usages: list[BudgetUsageMetric]
    goal_progresses: list[GoalProgressMetric]


def format_rupiah(amount: int) -> str:
    sign = "-" if amount < 0 else ""
    formatted = f"{abs(amount):,}".replace(",", ".")
    return f"{sign}Rp{formatted}"


def days_in_range(start: date, end: date) -> int:
    return max(1, (end - start).days + 1)


def infer_period_kind(start: date, end: date) -> str:
    span = days_in_range(start, end)
    if span <= 1:
        return "daily"
    if span <= 8:
        return "weekly"
    return "monthly"


def classify_budget_status(percentage: float) -> str:
    if percentage >= BUDGET_EXCEEDED_THRESHOLD:
        return "exceeded"
    if percentage >= BUDGET_WARNING_THRESHOLD:
        return "warning"
    return "safe"


def calculate_financial_metrics(
    *,
    settings: FinanceSettings,
    all_transactions: list[Transaction],
    budgets: list[Budget],
    goals: list[GoalOut],
    reference_date: date | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> FinancialMetrics:
    ref = reference_date or date.today()
    last_day = calendar.monthrange(ref.year, ref.month)[1]

    # Default evaluation period: current month up to reference_date (min 1 elapsed day)
    eval_start = period_start or ref.replace(day=1)
    eval_end = period_end or ref
    elapsed_days = days_in_range(eval_start, eval_end)

    days_after_today = max(0, last_day - ref.day)
    remaining_days_inclusive = max(1, days_after_today + 1)
    is_month_end_window = days_after_today <= 2  # Last 3 days of the month

    # Transfers are strictly excluded from income and expense calculations
    total_income_all = sum(tx.amount for tx in all_transactions if tx.type == "income")
    total_expense_all = sum(tx.amount for tx in all_transactions if tx.type == "expense")
    balance = settings.initial_balance + total_income_all - total_expense_all

    period_txs = [tx for tx in all_transactions if eval_start <= tx.date <= eval_end]
    period_income = sum(tx.amount for tx in period_txs if tx.type == "income")
    period_expense = sum(tx.amount for tx in period_txs if tx.type == "expense")
    net_cash_flow = period_income - period_expense

    daily_burn_rate = round(period_expense / elapsed_days)

    if daily_burn_rate <= 0:
        runway_days: float | None = None
    elif balance <= 0:
        runway_days = 0.0
    else:
        runway_days = round(balance / daily_burn_rate, 1)

    safe_daily_spend = max(0, round((balance - settings.min_balance) / remaining_days_inclusive))

    budget_usages: list[BudgetUsageMetric] = []
    for budget in budgets:
        spent = sum(
            tx.amount
            for tx in all_transactions
            if tx.type == "expense"
            and tx.category == budget.category
            and budget.period_start <= tx.date <= budget.period_end
        )
        pct_float = (
            round((spent / budget.limit_amount) * 100, 1) if budget.limit_amount > 0 else 0.0
        )
        pct_int = round((spent / budget.limit_amount) * 100) if budget.limit_amount > 0 else 0
        is_active = budget.period_start <= ref <= budget.period_end
        budget_usages.append(
            BudgetUsageMetric(
                budget_id=budget.id,
                category=budget.category,
                period_start=budget.period_start,
                period_end=budget.period_end,
                period_kind=infer_period_kind(budget.period_start, budget.period_end),
                limit_amount=budget.limit_amount,
                spent=spent,
                remaining=budget.limit_amount - spent,
                percentage=pct_float,
                percentage_int=pct_int,
                status=classify_budget_status(pct_float),
                is_active=is_active,
            )
        )
    budget_usages.sort(key=lambda item: item.percentage, reverse=True)

    goal_progresses: list[GoalProgressMetric] = []
    for goal in goals:
        pct_float = (
            round((goal.saved_amount / goal.target_amount) * 100, 1)
            if goal.target_amount > 0
            else 0.0
        )
        pct_int = (
            min(100, round((goal.saved_amount / goal.target_amount) * 100))
            if goal.target_amount > 0
            else 0
        )
        goal_progresses.append(
            GoalProgressMetric(
                goal_id=goal.id,
                name=goal.name,
                target_amount=goal.target_amount,
                saved_amount=goal.saved_amount,
                percentage=pct_float,
                percentage_int=pct_int,
                deadline=goal.deadline,
                days_until_deadline=(goal.deadline - ref).days,
            )
        )

    return FinancialMetrics(
        reference_date=ref,
        period_start=eval_start,
        period_end=eval_end,
        elapsed_days=elapsed_days,
        remaining_days_in_month=remaining_days_inclusive,
        days_after_today_in_month=days_after_today,
        is_month_end_window=is_month_end_window,
        initial_balance=settings.initial_balance,
        min_balance=settings.min_balance,
        total_income_all_time=total_income_all,
        total_expense_all_time=total_expense_all,
        balance=balance,
        period_income=period_income,
        period_expense=period_expense,
        net_cash_flow=net_cash_flow,
        daily_burn_rate=daily_burn_rate,
        runway_days=runway_days,
        safe_daily_spend=safe_daily_spend,
        budget_usages=budget_usages,
        goal_progresses=goal_progresses,
    )
