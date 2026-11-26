"""auth hardening and security audit

Revision ID: a7c9e1b2d3f4
Revises: f3a1b2c4d5e6
Create Date: 2026-11-26 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7c9e1b2d3f4"
down_revision: str | Sequence[str] | None = "f3a1b2c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column(
            "token_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.create_table(
        "security_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("outcome", sa.Text(), server_default="failure", nullable=False),
        sa.Column("ip_address", sa.Text(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("request_id", sa.Text(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(event_type) BETWEEN 1 AND 120",
            name="security_events_event_type_check",
        ),
        sa.CheckConstraint(
            "outcome IN ('success', 'failure')",
            name="security_events_outcome_check",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("security_events_user_id_idx", "security_events", ["user_id"], unique=False)
    op.create_index(
        "security_events_event_type_idx", "security_events", ["event_type"], unique=False
    )
    op.create_index(
        "security_events_created_at_idx", "security_events", ["created_at"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("security_events_created_at_idx", table_name="security_events")
    op.drop_index("security_events_event_type_idx", table_name="security_events")
    op.drop_index("security_events_user_id_idx", table_name="security_events")
    op.drop_table("security_events")
    op.drop_column("users", "token_version")
