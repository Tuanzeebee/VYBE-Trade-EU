"""plan_limits: giới hạn số lượng theo gói (N8) và mục thu phí "products_plus"

Revision ID: 0060
Revises: 0059
Create Date: 2026-10-03 17:00:00.000000
"""

from collections.abc import Sequence
from decimal import Decimal

import sqlalchemy as sa

from alembic import op

revision: str = "0060"
down_revision: str | None = "0059"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    plan_limits = op.create_table(
        "plan_limits",
        sa.Column("key", sa.String(length=32), nullable=False),
        sa.Column("free_limit", sa.Integer(), nullable=False),
        sa.CheckConstraint("free_limit >= 0", name=op.f("ck_plan_limits_free_limit_non_negative")),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_plan_limits")),
    )
    op.bulk_insert(plan_limits, [{"key": "max_products", "free_limit": 3}])
    # Mục thu phí nâng giới hạn sản phẩm. Giá là PLACEHOLDER chờ khách chốt (như ba mục cũ).
    items = sa.table(
        "billing_items",
        sa.column("code", sa.String),
        sa.column("name_vi", sa.String),
        sa.column("name_en", sa.String),
        sa.column("description_vi", sa.Text),
        sa.column("description_en", sa.Text),
        sa.column("audience", sa.String),
        sa.column("feature", sa.String),
        sa.column("price", sa.Numeric),
        sa.column("currency", sa.String),
        sa.column("duration_days", sa.Integer),
        sa.column("sort_order", sa.Integer),
    )
    op.bulk_insert(
        items,
        [
            {
                "code": "products_plus",
                "name_vi": "Đăng thêm sản phẩm",
                "name_en": "More product listings",
                "description_vi": "Bỏ giới hạn 3 sản phẩm của gói Cơ bản, trong một năm.",
                "description_en": "Lift the 3-product limit of the Basic plan, for one year.",
                "audience": "exporter",
                "feature": "more_products",
                "price": Decimal("1000000"),
                "currency": "VND",
                "duration_days": 365,
                "sort_order": 4,
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM billing_items WHERE code = 'products_plus'")
    op.drop_table("plan_limits")
