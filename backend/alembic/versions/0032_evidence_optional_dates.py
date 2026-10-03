"""evidence_optional_dates (U4): chứng nhận chỉ bắt buộc loại + file, ngày cấp tùy chọn, loại "Khác"

Revision ID: 0032
Revises: 0031
Create Date: 2026-10-01 13:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0032"
down_revision: str | None = "0031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("evidences", "issued_at", existing_type=sa.Date(), nullable=True)
    op.add_column("evidences", sa.Column("custom_type_name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("evidences", "custom_type_name")
    # Bằng chứng nộp không kèm ngày cấp: lấy ngày tạo bản ghi để cột trở lại NOT NULL được.
    op.execute("UPDATE evidences SET issued_at = created_at::date WHERE issued_at IS NULL")
    op.alter_column("evidences", "issued_at", existing_type=sa.Date(), nullable=False)
