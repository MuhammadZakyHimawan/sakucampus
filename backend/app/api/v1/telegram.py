from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.telegram import TelegramLinkTokenOut, TelegramStatusOut
from app.services import telegram_service

router = APIRouter(prefix="/telegram", tags=["telegram"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/status", response_model=TelegramStatusOut)
def get_telegram_status(current_user: CurrentUser, db: DbSession) -> TelegramStatusOut:
    return telegram_service.get_status(db, current_user)


@router.post("/link-token", response_model=TelegramLinkTokenOut, status_code=201)
def create_telegram_link_token(
    current_user: CurrentUser,
    db: DbSession,
) -> TelegramLinkTokenOut:
    return telegram_service.create_link_token(db, current_user)


@router.delete("/unlink", response_model=TelegramStatusOut)
def unlink_telegram(current_user: CurrentUser, db: DbSession) -> TelegramStatusOut:
    return telegram_service.unlink_telegram(db, current_user)


@router.post("/webhook")
async def telegram_webhook(
    update: dict[str, Any],
    db: DbSession,
    x_telegram_bot_api_secret_token: Annotated[
        str | None,
        Header(alias="X-Telegram-Bot-Api-Secret-Token"),
    ] = None,
) -> dict[str, bool]:
    telegram_service.verify_webhook_secret(x_telegram_bot_api_secret_token)

    update_id = update.get("update_id")
    if isinstance(update_id, int) and telegram_service.was_processed(db, update_id):
        return {"ok": True}

    reply = telegram_service.process_update(db, update)

    if isinstance(update_id, int):
        telegram_service.mark_processed(db, update_id)

    if reply is not None:
        await telegram_service.send_message(reply.chat_id, reply.text)

    return {"ok": True}
