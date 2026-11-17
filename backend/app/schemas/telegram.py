from __future__ import annotations

from datetime import datetime

from app.schemas.base import CamelModel


class TelegramStatusOut(CamelModel):
    connected: bool
    username: str | None = None
    linked_at: datetime | None = None
    bot_username: str | None = None
    simulated: bool = True


class TelegramLinkTokenOut(CamelModel):
    token: str
    deep_link: str | None = None
    expires_at: datetime
    bot_username: str | None = None
    simulated: bool = True
