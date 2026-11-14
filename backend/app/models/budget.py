from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Budget(TimestampMixin, Base):
    __tablename__ = "budgets"
    __table_args__ = (
        CheckConstraint(
            "category IN ("
            "'Kebutuhan Primer', 'Gaya Hidup', 'Pendidikan', 'Transportasi', "
            "'Kesehatan', 'Tagihan', 'Lainnya'"
            ")",
            name="budgets_category_check",
        ),
        CheckConstraint("limit_amount > 0", name="budgets_limit_amount_check"),
        CheckConstraint("period_end >= period_start", name="budgets_period_valid"),
        UniqueConstraint(
            "user_id",
            "category",
            "period_start",
            "period_end",
            name="budgets_unique_period",
        ),
        Index("budgets_user_period_idx", "user_id", "period_start", "period_end"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(Text, nullable=False)
    limit_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
