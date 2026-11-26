from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(trim(name)) BETWEEN 1 AND 120", name="users_name_check"),
        CheckConstraint("length(trim(email)) BETWEEN 3 AND 255", name="users_email_check"),
        CheckConstraint("length(password_hash) > 0", name="users_password_hash_check"),
        Index("users_telegram_user_id_key", "telegram_user_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    telegram_chat_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    telegram_username: Mapped[str | None] = mapped_column(Text, nullable=True)
    telegram_linked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    finance_settings: Mapped[FinanceSettings | None] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


Index("users_email_lower_key", func.lower(User.email), unique=True)


class FinanceSettings(TimestampMixin, Base):
    __tablename__ = "finance_settings"
    __table_args__ = (
        CheckConstraint(
            "length(currency) = 3 AND currency = upper(currency)",
            name="finance_settings_currency_check",
        ),
        CheckConstraint("initial_balance >= 0", name="finance_settings_initial_balance_check"),
        CheckConstraint("min_balance >= 0", name="finance_settings_min_balance_check"),
        CheckConstraint("period IN ('7d', '30d', 'month')", name="finance_settings_period_check"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="IDR",
        server_default=text("'IDR'"),
    )
    initial_balance: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    min_balance: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    period: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="30d",
        server_default=text("'30d'"),
    )
    notify_budget: Mapped[bool] = mapped_column(
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    notify_balance: Mapped[bool] = mapped_column(
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    notify_goal: Mapped[bool] = mapped_column(
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    user: Mapped[User] = relationship(back_populates="finance_settings")
