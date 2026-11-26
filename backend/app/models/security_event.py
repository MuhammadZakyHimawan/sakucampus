from __future__ import annotations

import uuid

from sqlalchemy import JSON, CheckConstraint, ForeignKey, Index, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class SecurityEvent(TimestampMixin, Base):
    __tablename__ = "security_events"
    __table_args__ = (
        CheckConstraint(
            "length(event_type) BETWEEN 1 AND 120",
            name="security_events_event_type_check",
        ),
        CheckConstraint(
            "outcome IN ('success', 'failure')",
            name="security_events_outcome_check",
        ),
        Index("security_events_user_id_idx", "user_id"),
        Index("security_events_event_type_idx", "event_type"),
        Index("security_events_created_at_idx", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str] = mapped_column(Text, nullable=False, default="failure")
    ip_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
