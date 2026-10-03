"""company_export_markets.trade_channel (B10): chính ngạch / tiểu ngạch theo từng thị trường

Tự khai, tuỳ chọn. Không ảnh hưởng điểm tín nhiệm, cấp xác minh hay máy tính tuân thủ.

Revision ID: 0047
Revises: 0046
Create Date: 2026-10-05 09:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0047"
down_revision: str | None = "0046"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_CONSTRAINT = "ck_company_export_markets_trade_channel_known"


def upgrade() -> None:
    op.add_column(
        "company_export_markets", sa.Column("trade_channel", sa.String(length=16), nullable=True)
    )
    op.create_check_constraint(
        op.f(_CONSTRAINT),
        "company_export_markets",
        "trade_channel IS NULL OR trade_channel IN ('official', 'unofficial')",
    )


def downgrade() -> None:
    op.drop_constraint(op.f(_CONSTRAINT), "company_export_markets", type_="check")
    op.drop_column("company_export_markets", "trade_channel")
