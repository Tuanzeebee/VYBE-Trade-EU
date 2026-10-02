"""companies.lei_code: mã LEI để đối chiếu GLEIF (onboarding buyer, bước giấy phép & chứng nhận)

Tuỳ chọn, cho cả buyer và exporter. Kiểm tự động chỉ là tín hiệu cho admin.

Revision ID: 0049
Revises: 0048
Create Date: 2026-10-05 11:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0049"
down_revision: str | None = "0048"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("lei_code", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "lei_code")
