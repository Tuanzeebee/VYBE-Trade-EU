"""tariff_lines: ghi chú tiếng Anh (quota_note_en, condition_note_en)

Revision ID: 0027
Revises: 0026
Create Date: 2026-09-30 10:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0027"
down_revision: str | None = "0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tariff_lines", sa.Column("quota_note_en", sa.Text(), nullable=True))
    op.add_column("tariff_lines", sa.Column("condition_note_en", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tariff_lines", "condition_note_en")
    op.drop_column("tariff_lines", "quota_note_en")
