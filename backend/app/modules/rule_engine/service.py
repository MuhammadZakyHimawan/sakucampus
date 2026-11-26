from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Budget, FinanceSettings, Notification, Transaction
from app.modules.rule_engine.evaluator import (
    RuleFinding,
    SeverityLiteral,
    derive_financial_status,
    evaluate_business_rules,
)
from app.modules.rule_engine.metrics import FinancialMetrics, calculate_financial_metrics
from app.services.goal_service import list_goals


@dataclass(slots=True)
class RuleEvaluationResult:
    metrics: FinancialMetrics
    financial_status: SeverityLiteral
    alerts: list[RuleFinding]
    new_notifications: list[Notification]


def _is_preference_enabled(notification_type: str, settings: FinanceSettings) -> bool:
    if notification_type == "budget":
        return settings.notify_budget
    if notification_type == "balance":
        return settings.notify_balance
    if notification_type == "goal":
        return settings.notify_goal
    return True  # 'info' (e.g. MONTH_END_EVAL) is always allowed


def _already_notified(
    db: Session,
    user_id: uuid.UUID,
    finding: RuleFinding,
    reference_date: date,
) -> bool:
    stmt = select(Notification.id).where(
        Notification.user_id == user_id,
        Notification.rule_code == finding.dedup_key,
    )
    if finding.dedup_scope == "daily":
        day_start = datetime.combine(reference_date, time.min, tzinfo=UTC)
        day_end = day_start + timedelta(days=1)
        stmt = stmt.where(
            Notification.created_at >= day_start,
            Notification.created_at < day_end,
        )
    # For 'monthly' and 'once', dedup_key already encodes YYYY-MM or goal_id
    return db.scalar(stmt.limit(1)) is not None


def evaluate_user_finances(
    db: Session,
    user_id: uuid.UUID,
    *,
    persist_notifications: bool = True,
    reference_date: date | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
    force_month_end: bool = False,
    evaluate_all_budgets: bool = False,
) -> RuleEvaluationResult:
    ref = reference_date or date.today()

    settings = db.get(FinanceSettings, user_id)
    if settings is None:
        settings = FinanceSettings(user_id=user_id)
        db.add(settings)
        db.flush()

    all_transactions = list(
        db.scalars(select(Transaction).where(Transaction.user_id == user_id)).all()
    )
    budgets = list(db.scalars(select(Budget).where(Budget.user_id == user_id)).all())
    goals = list_goals(db, user_id)

    metrics = calculate_financial_metrics(
        settings=settings,
        all_transactions=all_transactions,
        budgets=budgets,
        goals=goals,
        reference_date=ref,
        period_start=period_start,
        period_end=period_end,
    )

    findings = evaluate_business_rules(
        metrics,
        force_month_end=force_month_end,
        evaluate_all_budgets=evaluate_all_budgets,
    )
    financial_status = derive_financial_status(findings)

    new_notifications: list[Notification] = []
    if persist_notifications and findings:
        now_utc = datetime.now(UTC)
        created_ts = datetime.combine(ref, now_utc.timetz())

        for finding in findings:
            if not _is_preference_enabled(finding.notification_type, settings):
                continue
            if _already_notified(db, user_id, finding, ref):
                continue

            notif = Notification(
                user_id=user_id,
                type=finding.notification_type,
                severity=finding.severity,
                rule_code=finding.dedup_key,
                title=finding.title,
                message=finding.message,
                link=finding.link,
                is_read=False,
                sent_to_telegram=False,
                created_at=created_ts,
            )
            db.add(notif)
            new_notifications.append(notif)

        if new_notifications:
            db.commit()
            for notif in new_notifications:
                db.refresh(notif)

    return RuleEvaluationResult(
        metrics=metrics,
        financial_status=financial_status,
        alerts=findings,
        new_notifications=new_notifications,
    )
