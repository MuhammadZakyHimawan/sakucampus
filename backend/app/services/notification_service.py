from __future__ import annotations

import uuid

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Notification
from app.schemas.notification import NotificationOut
from app.services.errors import ResourceNotFoundError


def _to_out(notification: Notification) -> NotificationOut:
    return NotificationOut(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        link=notification.link,
        date=notification.created_at,
        read=notification.is_read,
    )


def _get_notification(
    db: Session,
    user_id: uuid.UUID,
    notification_id: uuid.UUID,
) -> Notification:
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != user_id:
        raise ResourceNotFoundError("Notifikasi tidak ditemukan")
    return notification


def create_notification(
    db: Session,
    user_id: uuid.UUID,
    *,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
    rule_key: str | None = None,
) -> NotificationOut | None:
    if rule_key is not None:
        existing = db.scalar(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.rule_key == rule_key,
            )
        )
        if existing is not None:
            return None

    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
        rule_key=rule_key,
    )
    db.add(notification)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None
    db.refresh(notification)
    return _to_out(notification)


def list_notifications(
    db: Session,
    user_id: uuid.UUID,
    *,
    unread_only: bool = False,
) -> list[NotificationOut]:
    statement = select(Notification).where(Notification.user_id == user_id)

    if unread_only:
        statement = statement.where(Notification.is_read.is_(False))

    statement = statement.order_by(Notification.created_at.desc())

    return [_to_out(notification) for notification in db.scalars(statement).all()]


def mark_notification_read(
    db: Session,
    user_id: uuid.UUID,
    notification_id: uuid.UUID,
) -> NotificationOut:
    notification = _get_notification(db, user_id, notification_id)
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return _to_out(notification)


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
    notification = _get_notification(db, user_id, notification_id)
    db.delete(notification)
    db.commit()
