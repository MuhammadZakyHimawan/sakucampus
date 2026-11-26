from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.constants import AUDIT_TELEGRAM_SECRET_INVALID
from app.models import TelegramAccount, TelegramLinkToken, TelegramProcessedUpdate, User
from app.schemas.telegram import TelegramLinkTokenOut, TelegramStatusOut
from app.schemas.transaction import TransactionCreate
from app.services import audit_service, transaction_service
from app.services.telegram_parser import parse_transaction

logger = logging.getLogger(__name__)

LINK_TOKEN_BYTES = 32
TELEGRAM_SEND_MAX_ATTEMPTS = 3
PROCESSED_UPDATE_RETENTION_DAYS = 7


@dataclass(frozen=True)
class TelegramReply:
    chat_id: int
    text: str
    user_id: UUID | None = None


def _now() -> datetime:
    return datetime.now(UTC)


def _as_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _telegram_configured() -> bool:
    settings = get_settings()
    return bool(settings.telegram_bot_token and settings.telegram_bot_username)


def _to_status(account: TelegramAccount | None) -> TelegramStatusOut:
    settings = get_settings()

    return TelegramStatusOut(
        connected=account is not None,
        username=(
            f"@{account.telegram_username.lstrip('@')}"
            if account is not None and account.telegram_username
            else None
        ),
        linked_at=account.created_at if account is not None else None,
        bot_username=settings.telegram_bot_username,
        simulated=not _telegram_configured(),
    )


def get_status(db: Session, user: User) -> TelegramStatusOut:
    account = db.scalar(select(TelegramAccount).where(TelegramAccount.user_id == user.id))
    return _to_status(account)


def create_link_token(db: Session, user: User) -> TelegramLinkTokenOut:
    settings = get_settings()
    now = _now()
    raw_token = secrets.token_urlsafe(LINK_TOKEN_BYTES)

    db.execute(
        delete(TelegramLinkToken).where(
            TelegramLinkToken.user_id == user.id,
            TelegramLinkToken.used_at.is_(None),
        )
    )
    token = TelegramLinkToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=now + timedelta(minutes=settings.telegram_link_token_minutes),
    )
    db.add(token)
    db.commit()
    db.refresh(token)

    bot_username = settings.telegram_bot_username
    deep_link = (
        f"https://t.me/{bot_username}?start={raw_token}" if bot_username is not None else None
    )

    return TelegramLinkTokenOut(
        token=raw_token,
        deep_link=deep_link,
        expires_at=token.expires_at,
        bot_username=bot_username,
        simulated=not _telegram_configured(),
    )


def unlink_telegram(db: Session, user: User) -> TelegramStatusOut:
    account = db.scalar(select(TelegramAccount).where(TelegramAccount.user_id == user.id))

    if account is not None:
        db.delete(account)

    db.execute(delete(TelegramLinkToken).where(TelegramLinkToken.user_id == user.id))
    db.commit()

    return _to_status(None)


def claim_update(db: Session, update_id: int) -> bool:
    db.add(TelegramProcessedUpdate(update_id=update_id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return False
    return True


def release_update(db: Session, update_id: int) -> None:
    db.execute(
        delete(TelegramProcessedUpdate).where(
            TelegramProcessedUpdate.update_id == update_id,
        )
    )
    db.commit()


def cleanup_processed_updates(db: Session) -> int:
    cutoff = _now() - timedelta(days=PROCESSED_UPDATE_RETENTION_DAYS)
    result = db.execute(
        delete(TelegramProcessedUpdate).where(TelegramProcessedUpdate.processed_at < cutoff)
    )
    db.commit()
    return result.rowcount or 0


def _audit_webhook_secret_failure(
    db: Session | None,
    request: Request | None,
    reason: str,
) -> None:
    if db is None:
        return

    audit_service.log_security_event(
        db,
        AUDIT_TELEGRAM_SECRET_INVALID,
        outcome="failure",
        request=request,
        details={"reason": reason},
    )


def verify_webhook_secret(
    secret_header: str | None,
    *,
    request: Request | None = None,
    db: Session | None = None,
) -> None:
    settings = get_settings()
    expected = settings.telegram_webhook_secret
    request_id = getattr(request.state, "request_id", None) if request is not None else None

    if expected is not None:
        provided = secret_header.encode("utf-8") if secret_header is not None else b""
        expected_bytes = expected.encode("utf-8")

        if not hmac.compare_digest(provided, expected_bytes):
            _audit_webhook_secret_failure(db, request, "invalid_or_missing_secret")
            logger.warning(
                "Secret webhook Telegram tidak valid",
                extra={"request_id": request_id},
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Secret webhook Telegram tidak valid",
            )
        return

    if getattr(settings, "allow_insecure_telegram_webhook", False):
        logger.warning(
            "Telegram webhook berjalan tanpa secret (mode tidak aman)",
            extra={"request_id": request_id},
        )
        return

    _audit_webhook_secret_failure(db, request, "secret_not_configured")
    logger.error(
        "TELEGRAM_WEBHOOK_SECRET belum dikonfigurasi",
        extra={"request_id": request_id},
    )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="TELEGRAM_WEBHOOK_SECRET belum dikonfigurasi",
    )


def _parse_message(update: dict[str, Any]) -> tuple[int, int, str | None, str | None] | None:
    message = update.get("message")
    if not isinstance(message, dict):
        return None

    chat = message.get("chat")
    sender = message.get("from")
    chat_id = chat.get("id") if isinstance(chat, dict) else None
    telegram_user_id = sender.get("id") if isinstance(sender, dict) else None
    username = sender.get("username") if isinstance(sender, dict) else None
    text = message.get("text")

    if not isinstance(chat_id, int) or not isinstance(telegram_user_id, int):
        return None

    return (
        chat_id,
        telegram_user_id,
        username if isinstance(username, str) else None,
        text if isinstance(text, str) else None,
    )


def _reply(chat_id: int, text: str, user_id: UUID | None = None) -> TelegramReply:
    return TelegramReply(chat_id=chat_id, text=text, user_id=user_id)


def _link_account(
    db: Session,
    raw_token: str,
    telegram_user_id: int,
    telegram_username: str | None,
) -> str:
    now = _now()
    token = db.scalar(
        select(TelegramLinkToken).where(
            TelegramLinkToken.token_hash == _hash_token(raw_token),
        )
    )

    if token is None:
        return "Tautan tidak valid. Buat tautan baru dari halaman Pengaturan Telegram."

    if token.used_at is not None or _as_aware(token.expires_at) <= now:
        return "Tautan sudah dipakai atau kedaluwarsa. Buat tautan baru dari website."

    token.used_at = now

    existing_for_telegram = db.scalar(
        select(TelegramAccount).where(
            TelegramAccount.telegram_user_id == telegram_user_id,
        )
    )
    if existing_for_telegram is not None and existing_for_telegram.user_id != token.user_id:
        db.commit()
        return "Akun Telegram ini sudah terhubung ke akun SakuCampus lain."

    account = db.scalar(select(TelegramAccount).where(TelegramAccount.user_id == token.user_id))
    if account is None:
        account = TelegramAccount(
            user_id=token.user_id,
            telegram_user_id=telegram_user_id,
            telegram_username=telegram_username,
        )
        db.add(account)
    else:
        account.telegram_user_id = telegram_user_id
        account.telegram_username = telegram_username

    db.commit()

    return (
        "Akun SakuCampus berhasil terhubung. "
        "Ketik /status untuk memeriksa koneksi atau /help untuk melihat bantuan."
    )


def process_update(db: Session, update: dict[str, Any]) -> TelegramReply | None:
    parsed = _parse_message(update)
    if parsed is None:
        return None

    chat_id, telegram_user_id, telegram_username, text = parsed
    if text is None:
        return None

    parts = text.strip().split(maxsplit=1)
    command = parts[0].split("@", 1)[0].lower()
    argument = parts[1].strip() if len(parts) > 1 else ""

    if command == "/start":
        if not argument:
            return _reply(
                chat_id,
                "Halo! Buka halaman Pengaturan Telegram di website SakuCampus "
                "untuk mendapatkan tautan aktivasi.",
            )
        return _reply(
            chat_id,
            _link_account(db, argument, telegram_user_id, telegram_username),
        )

    if command == "/status":
        account = db.scalar(
            select(TelegramAccount).where(
                TelegramAccount.telegram_user_id == telegram_user_id,
            )
        )
        if account is None:
            return _reply(chat_id, "Akun Telegram ini belum terhubung ke SakuCampus.")
        return _reply(chat_id, "Akun Telegram ini sudah terhubung ke SakuCampus.")

    if command == "/unlink":
        account = db.scalar(
            select(TelegramAccount).where(
                TelegramAccount.telegram_user_id == telegram_user_id,
            )
        )
        if account is None:
            return _reply(chat_id, "Akun Telegram ini belum terhubung ke SakuCampus.")
        db.delete(account)
        db.commit()
        return _reply(chat_id, "Koneksi Telegram berhasil diputuskan.")

    if command == "/help":
        return _reply(
            chat_id,
            "Perintah tersedia:\n"
            "/start <token> - menghubungkan akun dari tautan website\n"
            "/status - memeriksa status koneksi\n"
            "/unlink - memutuskan koneksi\n"
            "/help - menampilkan bantuan",
        )

    account = db.scalar(
        select(TelegramAccount).where(
            TelegramAccount.telegram_user_id == telegram_user_id,
        )
    )
    if account is None:
        return _reply(
            chat_id,
            "Akun belum terhubung. Buka Pengaturan Telegram di website SakuCampus "
            "untuk menghubungkan akun.",
        )

    parsed = parse_transaction(text, today=_now().date())
    if parsed is None:
        return _reply(
            chat_id,
            "Belum bisa membaca transaksi dari pesan ini. Kirim seperti "
            "'makan ayam 20rb' atau 'uang saku 500rb', satu transaksi per pesan.",
        )

    payload = TransactionCreate(
        description=parsed.description,
        amount=parsed.amount,
        type=parsed.type,
        category=parsed.category,
        date=parsed.date,
        source="manual",
    )
    payload.source = "telegram"
    transaction_service.create_transaction(db, account.user_id, payload)

    amount = f"{parsed.amount:,}".replace(",", ".")
    return _reply(
        chat_id,
        f"Tercatat: {parsed.description} — Rp{amount} ({parsed.category}).",
        user_id=account.user_id,
    )


async def send_message(chat_id: int, text: str) -> None:
    settings = get_settings()
    if settings.telegram_bot_token is None:
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"

    for attempt in range(1, TELEGRAM_SEND_MAX_ATTEMPTS + 1):
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    url,
                    json={"chat_id": chat_id, "text": text},
                )
                response.raise_for_status()
            return
        except httpx.HTTPError as exc:
            logger.warning(
                "Gagal mengirim pesan Telegram untuk chat_id=%s (percobaan %s/%s): %s",
                chat_id,
                attempt,
                TELEGRAM_SEND_MAX_ATTEMPTS,
                exc,
            )
            if attempt < TELEGRAM_SEND_MAX_ATTEMPTS:
                await asyncio.sleep(0.5 * 2 ** (attempt - 1))

    logger.error(
        "Balasan Telegram gagal dikirim setelah %s percobaan untuk chat_id=%s",
        TELEGRAM_SEND_MAX_ATTEMPTS,
        chat_id,
    )
