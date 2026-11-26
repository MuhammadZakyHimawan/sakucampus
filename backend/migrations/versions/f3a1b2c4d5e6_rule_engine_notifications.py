"""rule engine notifications

Revision ID: f3a1b2c4d5e6
Revises: d4f6a8b2c0e1
Create Date: 2026-11-19 13:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f3a1b2c4d5e6"
down_revision: str | Sequence[str] | None = "d4f6a8b2c0e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "notifications",
        sa.Column("rule_key", sa.Text(), nullable=True),
    )
    op.create_unique_constraint(
        "notifications_user_rule_key_key",
        "notifications",
        ["user_id", "rule_key"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "notifications_user_rule_key_key",
        "notifications",
        type_="unique",
    )
    op.drop_column("notifications", "rule_key")
