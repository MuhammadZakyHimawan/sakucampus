from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.notification import NotificationOut
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    current_user: CurrentUser,
    db: DbSession,
    unread_only: Annotated[bool, Query(alias="unreadOnly")] = False,
) -> list[NotificationOut]:
    return notification_service.list_notifications(
        db,
        current_user.id,
        unread_only=unread_only,
    )


@router.patch("/read-all")
def mark_all_notifications_read(current_user: CurrentUser, db: DbSession) -> dict[str, int]:
    updated = notification_service.mark_all_notifications_read(db, current_user.id)
    return {"updated": updated}


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> NotificationOut:
    return notification_service.mark_notification_read(
        db,
        current_user.id,
        notification_id,
    )


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    notification_service.delete_notification(db, current_user.id, notification_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
