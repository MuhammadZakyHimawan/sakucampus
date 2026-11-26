from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import TelegramLinkToken, User
from app.schemas.telegram import TelegramLinkTokenOut, TelegramStatusOut
from app.services.errors import InvalidTelegramTokenError, TelegramAlreadyLinkedError

LINK_TOKEN_TTL_MINUTES = 10


def hash_link_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


def _normalize_bot_username(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = raw.strip().lstrip("@")
    return cleaned or None


def _normalize_tg_username(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = raw.strip().lstrip("@")
    return f"@{cleaned}" if cleaned else None


def _ensure_utc(dt_value: datetime) -> datetime:
    if dt_value.tzinfo is None:
        return dt_value.replace(tzinfo=UTC)
    return dt_value.astimezone(UTC)


def get_telegram_status(user: User) -> TelegramStatusOut:
    settings = get_settings()
    bot_username = _normalize_bot_username(settings.telegram_bot_username)
    connected = user.telegram_user_id is not None
    return TelegramStatusOut(
        connected=connected,
        telegram_username=user.telegram_username,
        telegram_user_id=str(user.telegram_user_id) if user.telegram_user_id is not None else None,
        linked_at=user.telegram_linked_at,
        bot_username=bot_username,
        bot_configured=bool(settings.telegram_bot_token),
        mode=settings.effective_telegram_mode,
    )


def generate_link_token(db: Session, user: User) -> TelegramLinkTokenOut:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=LINK_TOKEN_TTL_MINUTES)

    # Invalidate/remove any previous unused tokens for this user
    db.execute(
        delete(TelegramLinkToken).where(
            TelegramLinkToken.user_id == user.id,
            TelegramLinkToken.used_at.is_(None),
        )
    )

    raw_token = secrets.token_urlsafe(24)
    token_hash = hash_link_token(raw_token)

    link_row = TelegramLinkToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        used_at=None,
    )
    db.add(link_row)
    db.commit()

    bot_username = _normalize_bot_username(settings.telegram_bot_username)
    deep_link = f"https://t.me/{bot_username}?start={raw_token}" if bot_username else None
    return TelegramLinkTokenOut(
        token=raw_token,
        expires_at=expires_at,
        deep_link=deep_link,
        start_command=f"/start {raw_token}",
    )


def consume_link_token(
    db: Session,
    *,
    raw_token: str,
    telegram_user_id: int,
    telegram_chat_id: int,
    telegram_username: str | None = None,
) -> User:
    cleaned_token = raw_token.strip()
    if not cleaned_token:
        raise InvalidTelegramTokenError(
            "Kode tautan kosong. Buat kode baru melalui halaman Pengaturan Telegram di web."
        )

    now = datetime.now(UTC)
    token_hash = hash_link_token(cleaned_token)

    token_row = db.scalar(
        select(TelegramLinkToken).where(TelegramLinkToken.token_hash == token_hash)
    )
    if token_row is None or token_row.used_at is not None:
        raise InvalidTelegramTokenError(
            "Kode tautan tidak valid atau sudah pernah digunakan. "
            "Silakan buat kode baru di halaman Pengaturan Telegram."
        )

    if _ensure_utc(token_row.expires_at) <= now:
        raise InvalidTelegramTokenError(
            "Kode tautan sudah kedaluwarsa (batas 10 menit). "
            "Silakan buat kode baru di halaman Pengaturan Telegram."
        )

    existing_owner = db.scalar(select(User).where(User.telegram_user_id == telegram_user_id))
    if existing_owner is not None and existing_owner.id != token_row.user_id:
        raise TelegramAlreadyLinkedError(
            "Akun Telegram ini sudah tertaut ke akun SakuCampus lain. "
            "Putuskan tautan pada akun sebelumnya terlebih dahulu."
        )

    user = db.get(User, token_row.user_id)
    if user is None:
        raise InvalidTelegramTokenError("Akun pengguna SakuCampus tidak ditemukan.")

    user.telegram_user_id = telegram_user_id
    user.telegram_chat_id = telegram_chat_id
    user.telegram_username = _normalize_tg_username(telegram_username)
    user.telegram_linked_at = now
    token_row.used_at = now

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise TelegramAlreadyLinkedError(
            "Akun Telegram ini sudah tertaut ke akun SakuCampus lain."
        ) from exc

    db.refresh(user)
    return user


def unlink_telegram(db: Session, user: User) -> TelegramStatusOut:
    user.telegram_user_id = None
    user.telegram_chat_id = None
    user.telegram_username = None
    user.telegram_linked_at = None

    db.execute(
        delete(TelegramLinkToken).where(
            TelegramLinkToken.user_id == user.id,
            TelegramLinkToken.used_at.is_(None),
        )
    )
    db.commit()
    db.refresh(user)
    return get_telegram_status(user)


def get_user_by_telegram_id(db: Session, telegram_user_id: int) -> User | None:
    return db.scalar(select(User).where(User.telegram_user_id == telegram_user_id))
