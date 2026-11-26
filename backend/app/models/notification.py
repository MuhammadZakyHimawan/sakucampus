from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Text,
    Uuid,
    desc,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "type IN ('budget', 'balance', 'goal', 'info')",
            name="notifications_type_check",
        ),
        CheckConstraint(
            "severity IN ('normal', 'warning', 'critical')",
            name="notifications_severity_check",
        ),
        CheckConstraint("length(trim(title)) BETWEEN 1 AND 200", name="notifications_title_check"),
        CheckConstraint("length(trim(message)) > 0", name="notifications_message_check"),
        Index("notifications_user_created_idx", "user_id", desc("created_at")),
        Index("notifications_user_rule_created_idx", "user_id", "rule_code", desc("created_at")),
        Index(
            "notifications_user_unread_idx",
            "user_id",
            postgresql_where=text("is_read = false"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="normal",
        server_default=text("'normal'"),
    )
    rule_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    sent_to_telegram: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
