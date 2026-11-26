from __future__ import annotations

import html
import logging
import uuid

from sqlalchemy import select

from app.database import get_session_factory
from app.models import Notification, User
from app.modules.telegram.client import TelegramClientProtocol, get_telegram_client

logger = logging.getLogger(__name__)

_SEVERITY_HEADER: dict[str, str] = {
    "critical": "PERINGATAN KRITIS",
    "warning": "PERINGATAN DINI",
    "normal": "INFO KEUANGAN",
}


def format_notification_alert_html(notification: Notification) -> str:
    header = _SEVERITY_HEADER.get(notification.severity, "INFO KEUANGAN")
    title = html.escape(notification.title)
    message = html.escape(notification.message)
    return f"<b>[{header}] {title}</b>\n{message}"


async def dispatch_notifications_to_telegram(
    user_id: uuid.UUID,
    notification_ids: list[uuid.UUID],
    *,
    client: TelegramClientProtocol | None = None,
) -> int:
    """Push newly created notifications to the user's Telegram chat using a fresh DB session."""
    if not notification_ids:
        return 0

    tg_client = client or get_telegram_client()
    if tg_client is None:
        return 0

    session_factory = get_session_factory()
    sent_count = 0

    with session_factory() as db:
        user = db.get(User, user_id)
        if user is None or user.telegram_chat_id is None:
            return 0

        stmt = (
            select(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.id.in_(notification_ids),
                Notification.sent_to_telegram.is_(False),
            )
            .order_by(Notification.created_at.asc())
        )
        pending = list(db.scalars(stmt).all())
        if not pending:
            return 0

        blocks = [format_notification_alert_html(item) for item in pending]
        combined_text = "<b>Notifikasi SakuCampus</b>\n\n" + "\n\n".join(blocks)

        delivered = await tg_client.send_message(user.telegram_chat_id, combined_text)
        if delivered:
            for item in pending:
                item.sent_to_telegram = True
                sent_count += 1
            db.commit()
        else:
            logger.warning(
                "Failed to push %d Telegram notification(s) for user %s",
                len(pending),
                user_id,
            )

    return sent_count
