from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.base import CamelModel


class TelegramUserIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    username: str | None = None


class TelegramChatIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int


class TelegramMessageIn(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    message_id: int | None = None
    text: str | None = None
    chat: TelegramChatIn
    sender: TelegramUserIn = Field(alias="from")


class TelegramUpdateIn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    update_id: int
    message: TelegramMessageIn | None = None


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
