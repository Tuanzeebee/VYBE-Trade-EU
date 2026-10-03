"""tariff_line_citation: trích dẫn nguồn cho mức thuế ưu đãi (điều khoản, ngày ký, danh mục)

Cột để trống tới khi người duyệt luật TM nhập; máy tính chỉ hiện trích dẫn khi đủ cả ba.

Revision ID: 0061
Revises: 0060
Create Date: 2026-10-03 21:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0061"
down_revision: str | None = "0060"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tariff_lines", sa.Column("legal_article", sa.String(length=255), nullable=True))
    op.add_column("tariff_lines", sa.Column("signed_on", sa.Date(), nullable=True))
    op.add_column("tariff_lines", sa.Column("annex_ref", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("tariff_lines", "annex_ref")
    op.drop_column("tariff_lines", "signed_on")
    op.drop_column("tariff_lines", "legal_article")
