from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.modules.rule_engine.metrics import FinancialMetrics, format_rupiah

NotificationTypeLiteral = Literal["budget", "balance", "goal", "info"]
SeverityLiteral = Literal["normal", "warning", "critical"]
DedupScopeLiteral = Literal["daily", "monthly", "once"]


@dataclass(frozen=True, slots=True)
class RuleFinding:
    rule_code: str
    notification_type: NotificationTypeLiteral
    severity: SeverityLiteral
    title: str
    message: str
    dedup_key: str
    dedup_scope: DedupScopeLiteral = "daily"
    link: str = "/dashboard"


def derive_financial_status(findings: list[RuleFinding]) -> SeverityLiteral:
    if any(f.severity == "critical" for f in findings):
        return "critical"
    if any(f.severity == "warning" for f in findings):
        return "warning"
    return "normal"


def evaluate_business_rules(
    metrics: FinancialMetrics,
    *,
    force_month_end: bool = False,
    evaluate_all_budgets: bool = False,
) -> list[RuleFinding]:
    findings: list[RuleFinding] = []

    # 1. Rule: Saldo Rendah / Defisit
    if metrics.balance <= 0:
        findings.append(
            RuleFinding(
                rule_code="BALANCE_NEGATIVE",
                notification_type="balance",
                severity="critical",
                title="Saldo habis atau defisit",
                message=(
                    f"Saldo berjalan kamu saat ini {format_rupiah(metrics.balance)}. "
                    "Tahan pengeluaran non-esensial dan periksa kembali arus kasmu."
                ),
                dedup_key="BALANCE_NEGATIVE",
                dedup_scope="daily",
                link="/dashboard",
            )
        )
    elif metrics.min_balance > 0:
        if metrics.balance <= metrics.min_balance:
            findings.append(
                RuleFinding(
                    rule_code="BALANCE_LOW_CRITICAL",
                    notification_type="balance",
                    severity="critical",
                    title="Saldo menyentuh batas minimum",
                    message=(
                        f"Saldo kamu tinggal {format_rupiah(metrics.balance)} "
                        f"(batas minimum {format_rupiah(metrics.min_balance)}). "
                        "Prioritaskan kebutuhan primer saja ya."
                    ),
                    dedup_key="BALANCE_LOW_CRITICAL",
                    dedup_scope="daily",
                    link="/dashboard",
                )
            )
        elif metrics.balance <= metrics.min_balance * 1.25:
            findings.append(
                RuleFinding(
                    rule_code="BALANCE_LOW_WARNING",
                    notification_type="balance",
                    severity="warning",
                    title="Saldo mulai mendekati batas minimum",
                    message=(
                        f"Saldo kamu saat ini {format_rupiah(metrics.balance)}, "
                        f"mendekati batas minimum {format_rupiah(metrics.min_balance)}. "
                        "Yuk mulai rem pengeluaran harian."
                    ),
                    dedup_key="BALANCE_LOW_WARNING",
                    dedup_scope="daily",
                    link="/dashboard",
                )
            )

    # 2. Rule: Anggaran Terlampaui / Mendekati Batas
    target_budgets = (
        metrics.budget_usages
        if evaluate_all_budgets
        else [b for b in metrics.budget_usages if b.is_active]
    )
    for b in target_budgets:
        period_key = f"{b.period_start.isoformat()}_{b.period_end.isoformat()}"
        if b.percentage >= 100.0:
            code = f"BUDGET_EXCEEDED:{period_key}:{b.category}"
            findings.append(
                RuleFinding(
                    rule_code=code,
                    notification_type="budget",
                    severity="critical",
                    title=f"Anggaran {b.category} terlampaui",
                    message=(
                        f"Pengeluaran {b.category} sudah mencapai {format_rupiah(b.spent)} "
                        f"({b.percentage_int}% dari batas {format_rupiah(b.limit_amount)})."
                    ),
                    dedup_key=code,
                    dedup_scope="daily",
                    link="/budgets",
                )
            )
        elif b.percentage >= 75.0:
            code = f"BUDGET_WARNING:{period_key}:{b.category}"
            findings.append(
                RuleFinding(
                    rule_code=code,
                    notification_type="budget",
                    severity="warning",
                    title=f"Anggaran {b.category} mendekati batas",
                    message=(
                        f"Pengeluaran {b.category} sudah terpakai {b.percentage_int}% "
                        f"({format_rupiah(b.spent)} dari {format_rupiah(b.limit_amount)}). "
                        f"Sisa anggaran {format_rupiah(max(0, b.remaining))}."
                    ),
                    dedup_key=code,
                    dedup_scope="daily",
                    link="/budgets",
                )
            )

    # 3. Rule: Burn Rate Tinggi dibanding Batas Aman Harian
    if metrics.daily_burn_rate > 0 and metrics.safe_daily_spend >= 0:
        if (metrics.safe_daily_spend == 0 and metrics.days_after_today_in_month > 0) or (
            metrics.safe_daily_spend > 0
            and metrics.daily_burn_rate >= 1.5 * metrics.safe_daily_spend
        ):
            findings.append(
                RuleFinding(
                    rule_code="BURN_RATE_CRITICAL",
                    notification_type="balance",
                    severity="critical",
                    title="Laju pengeluaran harian terlalu tinggi",
                    message=(
                        f"Rata-rata pengeluaranmu {format_rupiah(metrics.daily_burn_rate)}/hari, "
                        f"jauh di atas batas aman {format_rupiah(metrics.safe_daily_spend)}/hari "
                        "untuk sisa bulan ini."
                    ),
                    dedup_key="BURN_RATE_CRITICAL",
                    dedup_scope="daily",
                    link="/dashboard",
                )
            )
        elif (
            metrics.safe_daily_spend > 0
            and metrics.daily_burn_rate > 1.15 * metrics.safe_daily_spend
        ):
            findings.append(
                RuleFinding(
                    rule_code="BURN_RATE_WARNING",
                    notification_type="balance",
                    severity="warning",
                    title="Laju pengeluaran harian perlu diwaspadai",
                    message=(
                        f"Burn rate harianmu {format_rupiah(metrics.daily_burn_rate)}/hari "
                        f"melebihi batas aman {format_rupiah(metrics.safe_daily_spend)}/hari."
                    ),
                    dedup_key="BURN_RATE_WARNING",
                    dedup_scope="daily",
                    link="/dashboard",
                )
            )

    # 4. Rule: Kemungkinan Saldo Negatif / Runway Kritis
    if metrics.runway_days is not None:
        if metrics.runway_days <= 3.0:
            findings.append(
                RuleFinding(
                    rule_code="RUNWAY_CRITICAL",
                    notification_type="balance",
                    severity="critical",
                    title="Ketahanan saldo kritis",
                    message=(
                        f"Dengan pola belanja saat ini, saldomu diperkirakan hanya bertahan "
                        f"{metrics.runway_days:g} hari lagi."
                    ),
                    dedup_key="RUNWAY_CRITICAL",
                    dedup_scope="daily",
                    link="/dashboard",
                )
            )
        elif metrics.runway_days < metrics.days_after_today_in_month or metrics.runway_days <= 7.0:
            findings.append(
                RuleFinding(
                    rule_code="RUNWAY_WARNING",
                    notification_type="balance",
                    severity="warning",
                    title="Saldo berisiko habis sebelum akhir bulan",
                    message=(
                        f"Estimasi ketahanan saldomu {metrics.runway_days:g} hari, "
                        f"sementara sisa bulan ini masih {metrics.days_after_today_in_month} hari."
                    ),
                    dedup_key="RUNWAY_WARNING",
                    dedup_scope="daily",
                    link="/dashboard",
                )
            )

    # 5a. Rule: Evaluasi Akhir Bulan
    if metrics.is_month_end_window or force_month_end:
        active_budgets = [b for b in metrics.budget_usages if b.is_active]
        exceeded_count = sum(1 for b in active_budgets if b.status == "exceeded")
        safe_count = len(active_budgets) - exceeded_count
        achieved_goals = sum(1 for g in metrics.goal_progresses if g.percentage >= 100.0)

        is_deficit_or_over = metrics.net_cash_flow < 0 or exceeded_count > 0
        eval_severity: SeverityLiteral = "warning" if is_deficit_or_over else "normal"
        cashflow_phrase = (
            f"surplus {format_rupiah(metrics.net_cash_flow)}"
            if metrics.net_cash_flow >= 0
            else f"defisit {format_rupiah(abs(metrics.net_cash_flow))}"
        )
        month_code = f"MONTH_END_EVAL:{metrics.reference_date.strftime('%Y-%m')}"
        findings.append(
            RuleFinding(
                rule_code=month_code,
                notification_type="info",
                severity=eval_severity,
                title=f"Evaluasi Akhir Bulan ({metrics.reference_date.strftime('%b %Y')})",
                message=(
                    f"Pemasukan {format_rupiah(metrics.period_income)}, "
                    f"pengeluaran {format_rupiah(metrics.period_expense)} ({cashflow_phrase}). "
                    f"Anggaran terkendali: {safe_count}, terlampaui: {exceeded_count}. "
                    f"Target tabungan tercapai: {achieved_goals}/{len(metrics.goal_progresses)}."
                ),
                dedup_key=month_code,
                dedup_scope="monthly",
                link="/reports",
            )
        )

    # 5b. Rule: Progres & Deadline Target Tabungan
    for goal in metrics.goal_progresses:
        if goal.percentage >= 100.0:
            code = f"GOAL_ACHIEVED:{goal.goal_id}"
            findings.append(
                RuleFinding(
                    rule_code=code,
                    notification_type="goal",
                    severity="normal",
                    title=f"Target '{goal.name}' tercapai!",
                    message=(
                        f"Selamat! Tabungan untuk '{goal.name}' telah mencapai "
                        f"{format_rupiah(goal.saved_amount)} dari target "
                        f"{format_rupiah(goal.target_amount)}."
                    ),
                    dedup_key=code,
                    dedup_scope="once",
                    link="/goals",
                )
            )
        elif goal.days_until_deadline <= 14 and goal.percentage < 80.0:
            code = f"GOAL_BEHIND:{goal.goal_id}"
            deadline_info = (
                f"tinggal {goal.days_until_deadline} hari lagi"
                if goal.days_until_deadline >= 0
                else f"sudah lewat {abs(goal.days_until_deadline)} hari"
            )
            findings.append(
                RuleFinding(
                    rule_code=code,
                    notification_type="goal",
                    severity="warning",
                    title=f"Target '{goal.name}' butuh perhatian",
                    message=(
                        f"Progres '{goal.name}' baru {goal.percentage_int}% "
                        f"({format_rupiah(goal.saved_amount)} dari "
                        f"{format_rupiah(goal.target_amount)}), "
                        f"sedangkan deadline {deadline_info}."
                    ),
                    dedup_key=code,
                    dedup_scope="daily",
                    link="/goals",
                )
            )

    return findings
