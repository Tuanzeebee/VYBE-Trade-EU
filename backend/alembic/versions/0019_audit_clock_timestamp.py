"""audit_logs.created_at dùng clock_timestamp() để thứ tự trong cùng transaction đúng

Revision ID: 0019
Revises: 0018
Create Date: 2026-09-30
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0019"
down_revision: str | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # now() là giờ bắt đầu transaction: nhiều dòng audit trong một transaction trùng thời điểm.
    op.execute("ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT clock_timestamp()")


def downgrade() -> None:
    op.execute("ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT now()")
