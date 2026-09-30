"""Bật dòng 'evidence' của điểm hoàn thiện hồ sơ (C6)

Revision ID: 0015
Revises: 0014
Create Date: 2026-09-29
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE completeness_weights SET is_enabled = true WHERE field_key = 'evidence'")


def downgrade() -> None:
    op.execute("UPDATE completeness_weights SET is_enabled = false WHERE field_key = 'evidence'")
