from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import BUDGET_EXCEEDED_THRESHOLD, BUDGET_WARNING_THRESHOLD
from app.models import Budget, FinanceSettings, Transaction, User
from app.schemas.analytics import (
    BudgetOverviewItemOut,
    CashflowPointOut,
    CategoryTotalOut,
    DashboardDataOut,
    DashboardSummaryOut,
    FinancialInsightOut,
    PeriodPreset,
    PeriodRangeOut,
    ReportComparisonOut,
    ReportDataOut,
    ReportSummaryOut,
)
from app.schemas.budget import BudgetOut
from app.schemas.transaction import TransactionOut

MONTH_LABELS_ID = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
)


def _round_half_up(value: float) -> int:
    return math.floor(value + 0.5)


def _format_currency(value: int) -> str:
    return f"Rp{value:,}".replace(",", ".")


def _short_date(value: date) -> str:
    return f"{value.day:02d} {MONTH_LABELS_ID[value.month - 1]}"


def _days_in_range(start: date, end: date) -> int:
    return max(1, (end - start).days + 1)


def _period_range(preset: PeriodPreset, reference: date) -> PeriodRangeOut:
    if preset == "month":
        return PeriodRangeOut(
            start=reference.replace(day=1),
            end=reference,
            label="Bulan ini",
        )

    days = 7 if preset == "7d" else 30
    return PeriodRangeOut(
        start=reference - timedelta(days=days - 1),
        end=reference,
        label=f"{days} hari terakhir",
    )


def _previous_period_range(preset: PeriodPreset, reference: date) -> PeriodRangeOut:
    if preset == "month":
        previous_month_end = reference.replace(day=1) - timedelta(days=1)
        return PeriodRangeOut(
            start=previous_month_end.replace(day=1),
            end=previous_month_end,
            label="Bulan sebelumnya",
        )

    days = 7 if preset == "7d" else 30
    current_start = _period_range(preset, reference).start
    end = current_start - timedelta(days=1)
    return PeriodRangeOut(
        start=end - timedelta(days=days - 1),
        end=end,
        label=f"{days} hari sebelumnya",
    )


def _within(value: date, period: PeriodRangeOut) -> bool:
    return period.start <= value <= period.end


def _total_by_type(transactions: list[TransactionOut], transaction_type: str) -> int:
    return sum(item.amount for item in transactions if item.type == transaction_type)


def _compute_balance(initial_balance: int, transactions: list[TransactionOut]) -> int:
    return (
        initial_balance
        + _total_by_type(transactions, "income")
        - _total_by_type(transactions, "expense")
    )


def _compute_burn_rate(
    transactions: list[TransactionOut],
    period: PeriodRangeOut,
) -> int:
    return _round_half_up(
        _total_by_type(transactions, "expense") / _days_in_range(period.start, period.end)
    )


def _group_expenses(transactions: list[TransactionOut]) -> list[CategoryTotalOut]:
    totals: dict[str, int] = defaultdict(int)
    for item in transactions:
        if item.type == "expense":
            totals[item.category] += item.amount

    return [
        CategoryTotalOut(category=category, total=total)
        for category, total in sorted(totals.items(), key=lambda row: row[1], reverse=True)
    ]


def _build_cashflow(
    transactions: list[TransactionOut],
    period: PeriodRangeOut,
    preset: PeriodPreset,
) -> list[CashflowPointOut]:
    should_group_weekly = preset != "7d" and _days_in_range(period.start, period.end) > 10
    points: list[CashflowPointOut] = []
    cursor = period.start

    if should_group_weekly:
        index = 1
        while cursor <= period.end:
            bucket_end = min(cursor + timedelta(days=6), period.end)
            bucket = PeriodRangeOut(start=cursor, end=bucket_end, label="")
            bucket_transactions = [item for item in transactions if _within(item.date, bucket)]
            points.append(
                CashflowPointOut(
                    key=f"week-{index}",
                    label=f"Mgg {index}",
                    range_label=f"{_short_date(cursor)} – {_short_date(bucket_end)}",
                    income=_total_by_type(bucket_transactions, "income"),
                    expense=_total_by_type(bucket_transactions, "expense"),
                )
            )
            cursor += timedelta(days=7)
            index += 1
        return points

    while cursor <= period.end:
        day = PeriodRangeOut(start=cursor, end=cursor, label="")
        day_transactions = [item for item in transactions if _within(item.date, day)]
        points.append(
            CashflowPointOut(
                key=cursor.isoformat(),
                label=_short_date(cursor),
                range_label=_short_date(cursor),
                income=_total_by_type(day_transactions, "income"),
                expense=_total_by_type(day_transactions, "expense"),
            )
        )
        cursor += timedelta(days=1)

    return points


def _budget_status(percentage: float) -> str:
    if percentage >= BUDGET_EXCEEDED_THRESHOLD:
        return "exceeded"
    if percentage >= BUDGET_WARNING_THRESHOLD:
        return "warning"
    return "safe"


def _build_budget_overview(
    budgets: list[BudgetOut],
    transactions: list[TransactionOut],
) -> list[BudgetOverviewItemOut]:
    items: list[BudgetOverviewItemOut] = []
    for budget in budgets:
        used = sum(
            item.amount
            for item in transactions
            if item.type == "expense"
            and item.category == budget.category
            and budget.period_start <= item.date <= budget.period_end
        )
        percentage = _round_half_up(used / budget.limit * 100)
        items.append(
            BudgetOverviewItemOut(
                budget=budget,
                used=used,
                remaining=budget.limit - used,
                percentage=percentage,
                status=_budget_status(used / budget.limit * 100),
            )
        )

    return sorted(items, key=lambda item: item.percentage, reverse=True)


def _build_insights(
    summary: DashboardSummaryOut,
    categories: list[CategoryTotalOut],
    previous_transactions: list[TransactionOut],
    budgets: list[BudgetOverviewItemOut],
    has_transactions: bool,
) -> list[FinancialInsightOut]:
    if not has_transactions:
        return []

    insights: list[FinancialInsightOut] = []
    highlighted_budget = next(
        (item for item in budgets if item.status == "exceeded"),
        next((item for item in budgets if item.status == "warning"), None),
    )

    if highlighted_budget is not None:
        is_exceeded = highlighted_budget.status == "exceeded"
        condition = "terlampaui" if is_exceeded else "hampir habis"
        insights.append(
            FinancialInsightOut(
                id=f"budget-{highlighted_budget.budget.id}",
                tone="danger" if is_exceeded else "warning",
                title=f"Anggaran {highlighted_budget.budget.category} {condition}",
                description=(
                    f"Sudah terpakai {highlighted_budget.percentage}% dari batas "
                    f"{_format_currency(highlighted_budget.budget.limit)} bulan ini."
                ),
            )
        )

    previous_totals = {item.category: item.total for item in _group_expenses(previous_transactions)}
    increasing_categories = [
        {
            "category": item.category,
            "previous": previous_totals.get(item.category, 0),
            "change": (
                (item.total - previous_totals[item.category]) / previous_totals[item.category] * 100
            ),
        }
        for item in categories
        if previous_totals.get(item.category, 0) > 0
    ]
    increasing_categories = [item for item in increasing_categories if item["change"] >= 15]
    increasing_categories.sort(key=lambda item: item["change"], reverse=True)

    if increasing_categories:
        top = increasing_categories[0]
        insights.append(
            FinancialInsightOut(
                id=f"trend-{top['category']}",
                tone="warning",
                title=f"{top['category']} meningkat",
                description=(
                    f"Pengeluaran {top['category'].lower()} naik "
                    f"{_round_half_up(top['change'])}% dibanding periode sebelumnya."
                ),
            )
        )

    if summary.net > 0:
        insights.append(
            FinancialInsightOut(
                id="net-positive",
                tone="positive",
                title="Kamu berhasil menyisihkan",
                description=(f"Kamu menyisihkan {_format_currency(summary.net)} pada periode ini."),
            )
        )
    elif summary.net < 0:
        insights.append(
            FinancialInsightOut(
                id="net-negative",
                tone="danger",
                title="Pengeluaran lebih besar",
                description=(
                    f"Pengeluaran melebihi pemasukan sebesar "
                    f"{_format_currency(abs(summary.net))} pada periode ini."
                ),
            )
        )

    if len(insights) < 3 and categories:
        top_category = categories[0]
        insights.append(
            FinancialInsightOut(
                id="top-category",
                tone="info",
                title=f"Kategori terbesar: {top_category.category}",
                description=(
                    f"Pengeluaran terbesar periode ini ada di {top_category.category} "
                    f"sebesar {_format_currency(top_category.total)}."
                ),
            )
        )

    return insights[:3]


def _load_domain(
    db: Session,
    user: User,
) -> tuple[list[TransactionOut], list[BudgetOut], int, int]:
    transactions = [
        TransactionOut.model_validate(item)
        for item in db.scalars(
            select(Transaction)
            .where(Transaction.user_id == user.id)
            .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        )
    ]
    budgets = [
        BudgetOut(
            id=item.id,
            category=item.category,
            limit=item.limit_amount,
            period_start=item.period_start,
            period_end=item.period_end,
        )
        for item in db.scalars(select(Budget).where(Budget.user_id == user.id))
    ]
    settings = db.scalar(select(FinanceSettings).where(FinanceSettings.user_id == user.id))

    return (
        transactions,
        budgets,
        settings.initial_balance if settings is not None else 0,
        settings.min_balance if settings is not None else 0,
    )


def build_dashboard_data(
    db: Session,
    user: User,
    preset: PeriodPreset,
    reference: date | None = None,
) -> DashboardDataOut:
    today = reference or date.today()
    transactions, budgets, initial_balance, min_balance = _load_domain(db, user)
    period = _period_range(preset, today)
    previous_period = _previous_period_range(preset, today)
    period_transactions = [item for item in transactions if _within(item.date, period)]
    previous_transactions = [item for item in transactions if _within(item.date, previous_period)]
    income = _total_by_type(period_transactions, "income")
    expense = _total_by_type(period_transactions, "expense")
    categories = _group_expenses(period_transactions)
    budget_overview = _build_budget_overview(budgets, transactions)
    summary = DashboardSummaryOut(
        balance=_compute_balance(initial_balance, transactions),
        min_balance=min_balance,
        income=income,
        expense=expense,
        net=income - expense,
        burn_rate=_compute_burn_rate(period_transactions, period),
    )

    return DashboardDataOut(
        period=preset,
        range=period,
        summary=summary,
        cashflow=_build_cashflow(period_transactions, period, preset),
        categories=categories,
        budgets=budget_overview,
        insights=_build_insights(
            summary,
            categories,
            previous_transactions,
            budget_overview,
            bool(period_transactions),
        ),
        recent_transactions=period_transactions[:6],
        transaction_count=len(period_transactions),
    )


def _build_report_summary(
    transactions: list[TransactionOut],
    period: PeriodRangeOut,
) -> ReportSummaryOut:
    income = _total_by_type(transactions, "income")
    expense = _total_by_type(transactions, "expense")
    return ReportSummaryOut(
        income=income,
        expense=expense,
        net=income - expense,
        daily_average_expense=_compute_burn_rate(transactions, period),
        transaction_count=len(transactions),
    )


def _compute_change(current: int, previous: int) -> float | None:
    if previous == 0:
        return 0 if current == 0 else None
    return (current - previous) / previous * 100


def build_report_data(
    db: Session,
    user: User,
    preset: PeriodPreset,
    reference: date | None = None,
) -> ReportDataOut:
    today = reference or date.today()
    transactions, _, _, _ = _load_domain(db, user)
    period = _period_range(preset, today)
    previous_period = _previous_period_range(preset, today)
    period_transactions = [item for item in transactions if _within(item.date, period)]
    previous_transactions = [item for item in transactions if _within(item.date, previous_period)]
    summary = _build_report_summary(period_transactions, period)
    previous = _build_report_summary(previous_transactions, previous_period)

    return ReportDataOut(
        range=period,
        previous_range=previous_period,
        summary=summary,
        comparison=ReportComparisonOut(
            previous=previous,
            income_change=_compute_change(summary.income, previous.income),
            expense_change=_compute_change(summary.expense, previous.expense),
            net_change=_compute_change(summary.net, previous.net),
        ),
        cashflow=_build_cashflow(period_transactions, period, preset),
        categories=_group_expenses(period_transactions),
        transactions=sorted(period_transactions, key=lambda item: item.date, reverse=True),
    )
