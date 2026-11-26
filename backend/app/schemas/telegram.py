from __future__ import annotations

from datetime import datetime

from app.config import TelegramMode
from app.schemas.base import CamelModel


class TelegramStatusOut(CamelModel):
    connected: bool
    telegram_username: str | None = None
    telegram_user_id: str | None = None
    linked_at: datetime | None = None
    bot_username: str | None = None
    bot_configured: bool = False
    mode: TelegramMode = "disabled"


class TelegramLinkTokenOut(CamelModel):
    token: str
    expires_at: datetime
    deep_link: str | None = None
    start_command: str


class TelegramWebhookAck(CamelModel):
    ok: bool = True
