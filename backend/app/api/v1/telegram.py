from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.telegram import TelegramLinkTokenOut, TelegramStatusOut, TelegramUpdateIn
from app.services import rule_engine, telegram_service

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
    request: Request,
    db: DbSession,
    x_telegram_bot_api_secret_token: Annotated[
        str | None,
        Header(alias="X-Telegram-Bot-Api-Secret-Token"),
    ] = None,
) -> dict[str, bool]:
    telegram_service.verify_webhook_secret(
        x_telegram_bot_api_secret_token,
        request=request,
        db=db,
    )

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Payload webhook Telegram tidak valid",
        ) from exc

    try:
        update = TelegramUpdateIn.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=exc.errors(),
        ) from exc

    if not telegram_service.claim_update(db, update.update_id):
        return {"ok": True}

    try:
        reply = telegram_service.process_update(
            db,
            update.model_dump(by_alias=True, exclude_none=True),
        )
        if reply is not None:
            await telegram_service.send_message(reply.chat_id, reply.text)
            if reply.user_id is not None:
                user = db.get(User, reply.user_id)
                if user is not None:
                    await rule_engine.evaluate_and_notify(db, user)
    except Exception:
        telegram_service.release_update(db, update_id=update.update_id)
        raise

    return {"ok": True}
