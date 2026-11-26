from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, Field

from app.schemas.base import CamelModel

NotificationType = Literal["budget", "balance", "goal", "info"]
NotificationSeverity = Literal["normal", "warning", "critical"]


class NotificationOut(CamelModel):
    id: uuid.UUID
    type: NotificationType
    severity: NotificationSeverity = "normal"
    rule_code: str | None = None
    title: str
    message: str
    date: datetime = Field(
        validation_alias=AliasChoices("date", "created_at"),
        serialization_alias="date",
    )
    read: bool = Field(
        validation_alias=AliasChoices("read", "is_read"),
        serialization_alias="read",
    )
    link: str | None = None
    sent_to_telegram: bool = False
