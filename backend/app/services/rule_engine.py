from __future__ import annotations

import math
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import FinanceSettings, TelegramAccount, User
from app.schemas.notification import NotificationOut
from app.services import analytics_service, goal_service, notification_service, telegram_service

GOAL_MILESTONES = (60, 80, 100)


def _format_currency(value: int) -> str:
    return f"Rp{value:,}".replace(",", ".")


def _rule_currency(value: int) -> str:
    return _format_currency(value)


def _evaluate_budget(
    db: Session,
    user: User,
    dashboard,
) -> list[NotificationOut]:
    created: list[NotificationOut] = []
    for item in dashboard.budgets:
        if item.status not in {"warning", "exceeded"}:
            continue

        is_exceeded = item.status == "exceeded"
        period_key = item.budget.period_start.strftime("%Y-%m")
        notification = notification_service.create_notification(
            db,
            user.id,
            type="budget",
            title=(
                f"Anggaran {item.budget.category} terlampaui"
                if is_exceeded
                else f"Anggaran {item.budget.category} hampir habis"
            ),
            message=(
                f"Penggunaan anggaran {item.budget.category} sudah mencapai "
                f"{item.percentage}% dari {_rule_currency(item.budget.limit)}. "
                "Coba periksa transaksi beberapa hari terakhir."
            ),
            link="/budgets",
            rule_key=f"budget:{item.budget.id}:{item.status}:{period_key}",
        )
        if notification is not None:
            created.append(notification)

    return created


def _evaluate_balance(
    db: Session,
    user: User,
    dashboard,
) -> list[NotificationOut]:
    if dashboard.summary.balance >= dashboard.summary.min_balance:
        return []

    notification = notification_service.create_notification(
        db,
        user.id,
        type="balance",
        title="Saldo mulai menipis",
        message=(
            "Saldo kamu berada di bawah batas minimum. Coba periksa pengeluaran "
            "beberapa hari terakhir."
        ),
        link="/settings/finance",
        rule_key=f"balance:{date.today().isoformat()}",
    )
    return [notification] if notification is not None else []


def _evaluate_goals(db: Session, user: User) -> list[NotificationOut]:
    created: list[NotificationOut] = []
    for goal in goal_service.list_goals(db, user.id):
        if goal.target_amount <= 0:
            continue

        progress = math.floor(goal.saved_amount / goal.target_amount * 100 + 0.5)
        milestone = next(
            (value for value in reversed(GOAL_MILESTONES) if progress >= value),
            None,
        )
        if milestone is None:
            continue

        notification = notification_service.create_notification(
            db,
            user.id,
            type="goal",
            title=f"Target {goal.name} mencapai {milestone}%",
            message=(
                f"Bagus! Target tabunganmu untuk {goal.name} sudah mencapai "
                f"{milestone}%. Pertahankan ritmenya."
            ),
            link="/goals",
            rule_key=f"goal:{goal.id}:{milestone}",
        )
        if notification is not None:
            created.append(notification)

    return created


async def _send_telegram_notifications(
    db: Session,
    user: User,
    notifications: list[NotificationOut],
) -> None:
    account = db.scalar(select(TelegramAccount).where(TelegramAccount.user_id == user.id))
    if account is None:
        return

    lines = ["Pemberitahuan SakuCampus:"]
    lines.extend(f"- {item.title}: {item.message}" for item in notifications)
    await telegram_service.send_message(account.telegram_user_id, "\n".join(lines))


async def evaluate_and_notify(db: Session, user: User) -> list[NotificationOut]:
    settings = db.scalar(select(FinanceSettings).where(FinanceSettings.user_id == user.id))
    if settings is None:
        return []

    created: list[NotificationOut] = []
    if settings.notify_budget or settings.notify_balance:
        dashboard = analytics_service.build_dashboard_data(db, user, preset="month")
        if settings.notify_budget:
            created.extend(_evaluate_budget(db, user, dashboard))
        if settings.notify_balance:
            created.extend(_evaluate_balance(db, user, dashboard))

    if settings.notify_goal:
        created.extend(_evaluate_goals(db, user))

    if created:
        await _send_telegram_notifications(db, user, created)

    return created
