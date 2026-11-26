"""add telegram and rule engine fields

Revision ID: a7e4c19b2d30
Revises: 0518f1183ace
Create Date: 2026-11-27 00:05:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7e4c19b2d30"
down_revision: str | Sequence[str] | None = "0518f1183ace"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Telegram multi-user columns on users
    op.add_column("users", sa.Column("telegram_user_id", sa.BigInteger(), nullable=True))
    op.add_column("users", sa.Column("telegram_chat_id", sa.BigInteger(), nullable=True))
    op.add_column("users", sa.Column("telegram_username", sa.Text(), nullable=True))
    op.add_column(
        "users",
        sa.Column("telegram_linked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("users_telegram_user_id_key", "users", ["telegram_user_id"], unique=True)

    # 2. One-time hashed pairing tokens table for Telegram account linking
    op.create_table(
        "telegram_link_tokens",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("length(trim(token_hash)) > 0", name="telegram_link_tokens_hash_check"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="telegram_link_tokens_token_hash_key"),
    )
    op.create_index(
        "telegram_link_tokens_user_id_idx",
        "telegram_link_tokens",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "telegram_link_tokens_expires_at_idx",
        "telegram_link_tokens",
        ["expires_at"],
        unique=False,
    )

    # 3. Rule Engine severity, rule_code, and Telegram delivery tracking on notifications
    op.add_column(
        "notifications",
        sa.Column("severity", sa.Text(), server_default=sa.text("'normal'"), nullable=False),
    )
    op.add_column("notifications", sa.Column("rule_code", sa.Text(), nullable=True))
    op.add_column(
        "notifications",
        sa.Column(
            "sent_to_telegram",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "notifications_severity_check",
        "notifications",
        "severity IN ('normal', 'warning', 'critical')",
    )
    op.create_index(
        "notifications_user_rule_created_idx",
        "notifications",
        ["user_id", "rule_code", sa.literal_column("created_at DESC")],
        unique=False,
    )

    # 4. Optional NLP audit columns on transactions
    op.add_column("transactions", sa.Column("raw_text", sa.Text(), nullable=True))
    op.add_column("transactions", sa.Column("nlp_confidence", sa.Double(), nullable=True))
    op.create_check_constraint(
        "transactions_nlp_confidence_check",
        "transactions",
        "nlp_confidence IS NULL OR (nlp_confidence >= 0.0 AND nlp_confidence <= 1.0)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("transactions_nlp_confidence_check", "transactions", type_="check")
    op.drop_column("transactions", "nlp_confidence")
    op.drop_column("transactions", "raw_text")

    op.drop_index("notifications_user_rule_created_idx", table_name="notifications")
    op.drop_constraint("notifications_severity_check", "notifications", type_="check")
    op.drop_column("notifications", "sent_to_telegram")
    op.drop_column("notifications", "rule_code")
    op.drop_column("notifications", "severity")

    op.drop_index("telegram_link_tokens_expires_at_idx", table_name="telegram_link_tokens")
    op.drop_index("telegram_link_tokens_user_id_idx", table_name="telegram_link_tokens")
    op.drop_table("telegram_link_tokens")

    op.drop_index("users_telegram_user_id_key", table_name="users")
    op.drop_column("users", "telegram_linked_at")
    op.drop_column("users", "telegram_username")
    op.drop_column("users", "telegram_chat_id")
    op.drop_column("users", "telegram_user_id")
