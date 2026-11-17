from __future__ import annotations

import hashlib
import logging
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import TelegramAccount, TelegramLinkToken, User
from app.schemas.telegram import TelegramLinkTokenOut, TelegramStatusOut

logger = logging.getLogger(__name__)

LINK_TOKEN_BYTES = 32


@dataclass(frozen=True)
class TelegramReply:
    chat_id: int
    text: str


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


def verify_webhook_secret(secret_header: str | None) -> None:
    settings = get_settings()
    expected = settings.telegram_webhook_secret

    if expected is not None:
        if secret_header is None or not secrets.compare_digest(secret_header, expected):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Secret webhook Telegram tidak valid",
            )
        return

    if settings.environment.lower() not in {"development", "test"}:
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


def _reply(chat_id: int, text: str) -> TelegramReply:
    return TelegramReply(chat_id=chat_id, text=text)


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

    return _reply(
        chat_id,
        "Pencatatan transaksi lewat chat belum aktif pada tahap ini. "
        "Untuk sementara, catat transaksi melalui website.",
    )


async def send_message(chat_id: int, text: str) -> None:
    settings = get_settings()
    if settings.telegram_bot_token is None:
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url,
                json={"chat_id": chat_id, "text": text},
            )
            response.raise_for_status()
    except httpx.HTTPError:
        logger.warning("Gagal mengirim pesan Telegram untuk chat_id=%s", chat_id)
