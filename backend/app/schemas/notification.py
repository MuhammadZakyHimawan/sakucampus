from __future__ import annotations

import uuid
from datetime import datetime

from app.core.categories import NotificationType
from app.schemas.base import CamelModel


class NotificationOut(CamelModel):
    id: uuid.UUID
    type: NotificationType
    title: str
    message: str
    link: str | None = None
    date: datetime
    read: bool
