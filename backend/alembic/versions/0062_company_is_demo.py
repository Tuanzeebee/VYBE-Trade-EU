"""company_is_demo: đánh dấu công ty dữ liệu giả lập để giao diện hiện nhãn "Dữ liệu minh hoạ"

Revision ID: 0062
Revises: 0061
Create Date: 2026-10-03 22:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0062"
down_revision: str | None = "0061"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("is_demo", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("companies", "is_demo")
