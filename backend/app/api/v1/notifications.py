from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.notification import NotificationOut
from app.services import notification_service
from app.services.errors import ResourceNotFoundError

router = APIRouter(prefix="/notifications", tags=["notifications"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    current_user: CurrentUser,
    db: DbSession,
    unread_only: Annotated[bool, Query()] = False,
) -> list[NotificationOut]:
    items = notification_service.list_notifications(
        db,
        current_user.id,
        unread_only=unread_only,
    )
    return [NotificationOut.model_validate(item) for item in items]


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> NotificationOut:
    try:
        item = notification_service.mark_notification_read(db, current_user.id, notification_id)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return NotificationOut.model_validate(item)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_notifications_read(
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    notification_service.mark_all_notifications_read(db, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    try:
        notification_service.delete_notification(db, current_user.id, notification_id)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
