from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    Double,
    ForeignKey,
    Index,
    Text,
    Uuid,
    desc,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(
            "length(trim(description)) BETWEEN 1 AND 500",
            name="transactions_description_check",
        ),
        CheckConstraint("amount > 0", name="transactions_amount_check"),
        CheckConstraint(
            "type IN ('income', 'expense', 'transfer')",
            name="transactions_type_check",
        ),
        CheckConstraint(
            "source IN ('manual', 'telegram')",
            name="transactions_source_check",
        ),
        CheckConstraint(
            "("
            "type = 'expense' AND category IN ("
            "'Kebutuhan Primer', 'Gaya Hidup', 'Pendidikan', 'Transportasi', "
            "'Kesehatan', 'Tagihan', 'Lainnya'"
            ") OR "
            "type = 'income' AND category IN ("
            "'Uang Saku', 'Beasiswa', 'Gaji/Part-time', 'Hadiah', 'Lainnya'"
            ") OR "
            "type = 'transfer' AND category = 'Lainnya'"
            ")",
            name="transactions_category_matches_type",
        ),
        CheckConstraint(
            "nlp_confidence IS NULL OR (nlp_confidence >= 0.0 AND nlp_confidence <= 1.0)",
            name="transactions_nlp_confidence_check",
        ),
        Index("transactions_user_date_idx", "user_id", desc("date")),
        Index("transactions_user_type_date_idx", "user_id", "type", desc("date")),
        Index("transactions_user_category_date_idx", "user_id", "category", desc("date")),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="manual",
        server_default=text("'manual'"),
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    nlp_confidence: Mapped[float | None] = mapped_column(Double, nullable=True)
