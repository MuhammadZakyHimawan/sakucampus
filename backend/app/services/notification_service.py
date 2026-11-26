from __future__ import annotations

import uuid

from sqlalchemy import desc, select, update
from sqlalchemy.orm import Session

from app.models import Notification
from app.services.errors import ResourceNotFoundError


def list_notifications(
    db: Session,
    user_id: uuid.UUID,
    *,
    unread_only: bool = False,
) -> list[Notification]:
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    stmt = stmt.order_by(desc(Notification.created_at))
    return list(db.scalars(stmt).all())


def get_notification(
    db: Session,
    user_id: uuid.UUID,
    notification_id: uuid.UUID,
) -> Notification:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    if notification is None:
        raise ResourceNotFoundError("Notifikasi tidak ditemukan")
    return notification


def mark_notification_read(
    db: Session,
    user_id: uuid.UUID,
    notification_id: uuid.UUID,
) -> Notification:
    notification = get_notification(db, user_id, notification_id)
    if not notification.is_read:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_notifications_read(db: Session, user_id: uuid.UUID) -> int:
    result = db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    db.commit()
    return int(result.rowcount or 0)


def delete_notification(
    db: Session,
    user_id: uuid.UUID,
    notification_id: uuid.UUID,
) -> None:
    notification = get_notification(db, user_id, notification_id)
    db.delete(notification)
    db.commit()
