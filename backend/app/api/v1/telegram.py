from __future__ import annotations

import secrets
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.modules.telegram.client import get_telegram_client
from app.modules.telegram.handlers import handle_telegram_update
from app.schemas.telegram import TelegramLinkTokenOut, TelegramStatusOut, TelegramWebhookAck
from app.services import telegram_service

router = APIRouter(prefix="/telegram", tags=["telegram"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/status", response_model=TelegramStatusOut)
def get_status(current_user: CurrentUser) -> TelegramStatusOut:
    return telegram_service.get_telegram_status(current_user)


@router.post(
    "/link-token", response_model=TelegramLinkTokenOut, status_code=status.HTTP_201_CREATED
)
def create_link_token(
    current_user: CurrentUser,
    db: DbSession,
) -> TelegramLinkTokenOut:
    return telegram_service.generate_link_token(db, current_user)


@router.delete("/unlink", response_model=TelegramStatusOut)
def unlink_account(
    current_user: CurrentUser,
    db: DbSession,
) -> TelegramStatusOut:
    return telegram_service.unlink_telegram(db, current_user)


@router.post("/webhook", response_model=TelegramWebhookAck)
async def telegram_webhook(
    update: Annotated[dict[str, Any], Body()],
    db: DbSession,
    secret_header: Annotated[
        str | None,
        Header(alias="X-Telegram-Bot-Api-Secret-Token"),
    ] = None,
) -> TelegramWebhookAck:
    settings = get_settings()
    expected_secret = settings.telegram_webhook_secret
    if expected_secret and (
        not secret_header or not secrets.compare_digest(secret_header, expected_secret)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Secret token webhook tidak valid",
        )

    client = get_telegram_client()
    if client is not None:
        await handle_telegram_update(db, update, client)
    return TelegramWebhookAck(ok=True)
