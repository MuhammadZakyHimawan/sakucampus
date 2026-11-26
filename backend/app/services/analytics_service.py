from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import Budget, Transaction, User
from app.modules.rule_engine.evaluator import RuleFinding
from app.modules.rule_engine.metrics import days_in_range, format_rupiah
from app.modules.rule_engine.service import evaluate_user_finances
from app.schemas.analytics import (
    BudgetOverviewItemOut,
    BudgetStatus,
    CashflowPointOut,
    CategoryTotalOut,
    DashboardMetricsOut,
    DashboardSummaryOut,
    FinancialInsightOut,
    InsightTone,
    PeriodRangeOut,
    ReportAnalyticsOut,
    ReportComparisonOut,
    ReportSummaryOut,
)
from app.schemas.budget import BudgetOut
from app.schemas.rule_engine import RuleAlertOut
from app.schemas.settings import PeriodPreset
from app.schemas.transaction import TransactionOut
from app.services.budget_service import list_budgets
from app.services.goal_service import list_goals
from app.services.settings_service import get_or_create_finance_settings
from app.services.transaction_service import list_transactions

_INDONESIAN_MONTHS = (
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

_PERIOD_LABELS: dict[PeriodPreset, str] = {
    "7d": "7 hari terakhir",
    "30d": "30 hari terakhir",
    "month": "Bulan ini",
}


def format_short_date_id(value: date) -> str:
    return f"{value.day:02d} {_INDONESIAN_MONTHS[value.month - 1]}"


def get_period_range(
    preset: PeriodPreset,
    reference: date | None = None,
) -> PeriodRangeOut:
    end = reference or date.today()
    if preset == "month":
        start = end.replace(day=1)
        return PeriodRangeOut(start=start, end=end, label=_PERIOD_LABELS[preset])

    days = 7 if preset == "7d" else 30
    start = end - timedelta(days=days - 1)
    return PeriodRangeOut(start=start, end=end, label=_PERIOD_LABELS[preset])


def get_previous_period_range(
    preset: PeriodPreset | None,
    current_range: PeriodRangeOut,
) -> PeriodRangeOut:
    if preset == "month":
        first_of_current = current_range.start.replace(day=1)
        prev_end = first_of_current - timedelta(days=1)
        prev_start = prev_end.replace(day=1)
        return PeriodRangeOut(start=prev_start, end=prev_end, label="Bulan sebelumnya")

    span_days = days_in_range(current_range.start, current_range.end)
    prev_end = current_range.start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=span_days - 1)
    return PeriodRangeOut(
        start=prev_start,
        end=prev_end,
        label=f"{span_days} hari sebelumnya",
    )


def resolve_range(
    preset: PeriodPreset | None,
    start_date: date | None,
    end_date: date | None,
    *,
    default_preset: PeriodPreset = "30d",
    reference: date | None = None,
) -> tuple[PeriodPreset | None, PeriodRangeOut]:
    if start_date is not None and end_date is not None:
        return None, PeriodRangeOut(
            start=start_date,
            end=end_date,
            label=f"{format_short_date_id(start_date)} – {format_short_date_id(end_date)}",
        )
    effective_preset = preset or default_preset
    return effective_preset, get_period_range(effective_preset, reference)


def sum_by_type(transactions: list[Transaction], tx_type: str) -> int:
    return sum(tx.amount for tx in transactions if tx.type == tx_type)


def compute_burn_rate(transactions: list[Transaction], start: date, end: date) -> int:
    total_expense = sum_by_type(transactions, "expense")
    return round(total_expense / days_in_range(start, end))


def group_expenses_by_category(transactions: list[Transaction]) -> list[CategoryTotalOut]:
    totals: dict[str, int] = defaultdict(int)
    for tx in transactions:
        if tx.type == "expense":
            totals[tx.category] += tx.amount
    return [
        CategoryTotalOut(category=category, total=total)
        for category, total in sorted(totals.items(), key=lambda pair: pair[1], reverse=True)
    ]


def build_cashflow_series(
    transactions: list[Transaction],
    period_range: PeriodRangeOut,
    preset: PeriodPreset | None,
) -> list[CashflowPointOut]:
    total_days = days_in_range(period_range.start, period_range.end)
    should_group_weekly = preset != "7d" and total_days > 10
    points: list[CashflowPointOut] = []

    if should_group_weekly:
        cursor = period_range.start
        index = 1
        while cursor <= period_range.end:
            bucket_end = min(cursor + timedelta(days=6), period_range.end)
            bucket_txs = [tx for tx in transactions if cursor <= tx.date <= bucket_end]
            points.append(
                CashflowPointOut(
                    key=f"week-{index}",
                    label=f"Mgg {index}",
                    range_label=(
                        f"{format_short_date_id(cursor)} – {format_short_date_id(bucket_end)}"
                    ),
                    income=sum_by_type(bucket_txs, "income"),
                    expense=sum_by_type(bucket_txs, "expense"),
                )
            )
            cursor = cursor + timedelta(days=7)
            index += 1
        return points

    cursor = period_range.start
    while cursor <= period_range.end:
        day_txs = [tx for tx in transactions if tx.date == cursor]
        short_label = format_short_date_id(cursor)
        points.append(
            CashflowPointOut(
                key=cursor.isoformat(),
                label=short_label,
                range_label=short_label,
                income=sum_by_type(day_txs, "income"),
                expense=sum_by_type(day_txs, "expense"),
            )
        )
        cursor = cursor + timedelta(days=1)
    return points


def _map_rule_alerts(findings: list[RuleFinding]) -> list[RuleAlertOut]:
    return [
        RuleAlertOut(
            rule_code=f.rule_code,
            notification_type=f.notification_type,
            severity=f.severity,
            title=f.title,
            message=f.message,
            dedup_key=f.dedup_key,
            link=f.link,
        )
        for f in findings
    ]


def _severity_to_tone(severity: str) -> InsightTone:
    if severity == "critical":
        return "danger"
    if severity == "warning":
        return "warning"
    return "info"


def _build_insights(
    *,
    rule_findings: list[RuleFinding],
    net_cash_flow: int,
    categories: list[CategoryTotalOut],
    previous_transactions: list[Transaction],
    has_transactions: bool,
) -> list[FinancialInsightOut]:
    insights: list[FinancialInsightOut] = []

    # Surface critical/warning Rule Engine alerts first
    for finding in rule_findings:
        if finding.severity in {"critical", "warning"}:
            insights.append(
                FinancialInsightOut(
                    id=f"rule-{finding.rule_code}",
                    tone=_severity_to_tone(finding.severity),
                    title=finding.title,
                    description=finding.message,
                )
            )
        if len(insights) >= 2:
            break

    if not has_transactions:
        return insights[:3]

    previous_totals = {
        item.category: item.total for item in group_expenses_by_category(previous_transactions)
    }
    increasing: tuple[str, float] | None = None
    for category_item in categories:
        prev_total = previous_totals.get(category_item.category, 0)
        if prev_total > 0:
            change = ((category_item.total - prev_total) / prev_total) * 100
            if change >= 15 and (increasing is None or change > increasing[1]):
                increasing = (category_item.category, change)

    if len(insights) < 3 and increasing is not None:
        cat_name, pct_change = increasing
        insights.append(
            FinancialInsightOut(
                id=f"trend-{cat_name}",
                tone="warning",
                title=f"{cat_name} meningkat",
                description=(
                    f"Pengeluaran {cat_name.lower()} naik {round(pct_change)}% "
                    "dibanding periode sebelumnya."
                ),
            )
        )

    if len(insights) < 3:
        if net_cash_flow > 0:
            insights.append(
                FinancialInsightOut(
                    id="net-positive",
                    tone="positive",
                    title="Kamu berhasil menyisihkan",
                    description=(
                        f"Kamu menyisihkan {format_rupiah(net_cash_flow)} pada periode ini."
                    ),
                )
            )
        elif net_cash_flow < 0:
            insights.append(
                FinancialInsightOut(
                    id="net-negative",
                    tone="danger",
                    title="Pengeluaran lebih besar",
                    description=(
                        f"Pengeluaran melebihi pemasukan sebesar "
                        f"{format_rupiah(abs(net_cash_flow))} pada periode ini."
                    ),
                )
            )

    if len(insights) < 3 and categories:
        top = categories[0]
        insights.append(
            FinancialInsightOut(
                id="top-category",
                tone="info",
                title=f"Kategori terbesar: {top.category}",
                description=(
                    f"Pengeluaran terbesar periode ini ada di {top.category} "
                    f"sebesar {format_rupiah(top.total)}."
                ),
            )
        )

    return insights[:3]


def _compute_change_percentage(current: int, previous: int) -> float | None:
    if previous == 0:
        return 0.0 if current == 0 else None
    return round(((current - previous) / previous) * 100, 2)


def _build_report_summary(
    transactions: list[Transaction],
    period_range: PeriodRangeOut,
) -> ReportSummaryOut:
    income = sum_by_type(transactions, "income")
    expense = sum_by_type(transactions, "expense")
    return ReportSummaryOut(
        income=income,
        expense=expense,
        net=income - expense,
        daily_average_expense=compute_burn_rate(
            transactions,
            period_range.start,
            period_range.end,
        ),
        transaction_count=len(transactions),
    )


def _build_budget_overview_from_engine(
    budgets_by_id: dict[object, Budget],
    engine_usages: list,
) -> list[BudgetOverviewItemOut]:
    items: list[BudgetOverviewItemOut] = []
    for usage in engine_usages:
        budget_model = budgets_by_id.get(usage.budget_id)
        if budget_model is None:
            continue
        status_val: BudgetStatus = usage.status
        items.append(
            BudgetOverviewItemOut(
                budget=BudgetOut.model_validate(budget_model),
                used=usage.spent,
                remaining=usage.remaining,
                percentage=usage.percentage_int,
                status=status_val,
            )
        )
    return items


def build_dashboard_summary(
    db: Session,
    user: User,
    *,
    preset: PeriodPreset | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    reference: date | None = None,
) -> DashboardSummaryOut:
    settings = get_or_create_finance_settings(db, user.id)
    effective_preset, period_range = resolve_range(
        preset,
        start_date,
        end_date,
        default_preset=settings.period,  # type: ignore[arg-type]
        reference=reference,
    )
    previous_range = get_previous_period_range(effective_preset, period_range)

    all_transactions = list_transactions(db, user.id)
    period_transactions = [
        tx for tx in all_transactions if period_range.start <= tx.date <= period_range.end
    ]
    previous_transactions = [
        tx for tx in all_transactions if previous_range.start <= tx.date <= previous_range.end
    ]
    budgets = list_budgets(db, user.id)
    budgets_by_id = {b.id: b for b in budgets}
    goals = list_goals(db, user.id)

    # Single source of truth via Rule Engine
    eval_result = evaluate_user_finances(
        db,
        user.id,
        persist_notifications=False,
        reference_date=period_range.end,
        period_start=period_range.start,
        period_end=period_range.end,
        evaluate_all_budgets=True,
    )
    metrics = eval_result.metrics

    budget_overview = _build_budget_overview_from_engine(budgets_by_id, metrics.budget_usages)
    categories = group_expenses_by_category(period_transactions)
    insights = _build_insights(
        rule_findings=eval_result.alerts,
        net_cash_flow=metrics.net_cash_flow,
        categories=categories,
        previous_transactions=previous_transactions,
        has_transactions=len(period_transactions) > 0,
    )
    recent_transactions = [TransactionOut.model_validate(tx) for tx in period_transactions[:6]]

    return DashboardSummaryOut(
        period=effective_preset or settings.period,  # type: ignore[arg-type]
        range=period_range,
        summary=DashboardMetricsOut(
            balance=metrics.balance,
            min_balance=metrics.min_balance,
            total_income=metrics.period_income,
            total_expense=metrics.period_expense,
            net_cash_flow=metrics.net_cash_flow,
            daily_burn_rate=metrics.daily_burn_rate,
            runway_days=metrics.runway_days,
            safe_daily_spend=metrics.safe_daily_spend,
            financial_status=eval_result.financial_status,
        ),
        cashflow=build_cashflow_series(period_transactions, period_range, effective_preset),
        categories=categories,
        budgets=budget_overview,
        goals=goals,
        insights=insights,
        rule_alerts=_map_rule_alerts(eval_result.alerts),
        recent_transactions=recent_transactions,
        transaction_count=len(period_transactions),
    )


def build_report_analytics(
    db: Session,
    user: User,
    *,
    preset: PeriodPreset | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    reference: date | None = None,
) -> ReportAnalyticsOut:
    effective_preset, period_range = resolve_range(
        preset,
        start_date,
        end_date,
        default_preset="30d",
        reference=reference,
    )
    previous_range = get_previous_period_range(effective_preset, period_range)

    all_transactions = list_transactions(db, user.id)
    period_transactions = [
        tx for tx in all_transactions if period_range.start <= tx.date <= period_range.end
    ]
    previous_transactions = [
        tx for tx in all_transactions if previous_range.start <= tx.date <= previous_range.end
    ]
    budgets = list_budgets(db, user.id)
    budgets_by_id = {b.id: b for b in budgets}
    goals = list_goals(db, user.id)

    eval_result = evaluate_user_finances(
        db,
        user.id,
        persist_notifications=False,
        reference_date=period_range.end,
        period_start=period_range.start,
        period_end=period_range.end,
        evaluate_all_budgets=True,
    )
    metrics = eval_result.metrics

    summary = _build_report_summary(period_transactions, period_range)
    previous = _build_report_summary(previous_transactions, previous_range)
    budget_overview = _build_budget_overview_from_engine(budgets_by_id, metrics.budget_usages)

    return ReportAnalyticsOut(
        range=period_range,
        previous_range=previous_range,
        balance=metrics.balance,
        min_balance=metrics.min_balance,
        daily_burn_rate=metrics.daily_burn_rate,
        runway_days=metrics.runway_days,
        safe_daily_spend=metrics.safe_daily_spend,
        financial_status=eval_result.financial_status,
        summary=summary,
        comparison=ReportComparisonOut(
            previous=previous,
            income_change=_compute_change_percentage(summary.income, previous.income),
            expense_change=_compute_change_percentage(summary.expense, previous.expense),
            net_change=_compute_change_percentage(summary.net, previous.net),
        ),
        cashflow=build_cashflow_series(period_transactions, period_range, effective_preset),
        categories=group_expenses_by_category(period_transactions),
        budgets=budget_overview,
        goals=goals,
        rule_alerts=_map_rule_alerts(eval_result.alerts),
        transactions=[TransactionOut.model_validate(tx) for tx in period_transactions],
    )
