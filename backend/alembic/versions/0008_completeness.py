"""completeness (B3): bảng trọng số điểm hoàn thiện + cột companies.eori_number.

Bảng trọng số được nạp ngay ở đây (dữ liệu cấu hình đã được PO duyệt 29/09/2026); đổi trọng số
sau này là sửa dữ liệu (UPDATE hoặc migration dữ liệu mới), không sửa code.

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (company_type, field_key, group_key, weight, is_enabled)
WEIGHTS: list[tuple[str, str, str, int, bool]] = [
    ("exporter", "tax_id", "legal", 10, True),
    ("exporter", "business_model", "legal", 5, True),
    ("exporter", "founded_year", "legal", 3, True),
    ("exporter", "address", "legal", 7, True),
    ("exporter", "description_en", "intro", 10, True),
    ("exporter", "description_vi", "intro", 6, True),
    ("exporter", "website", "intro", 4, True),
    ("exporter", "logo", "intro", 5, False),  # bật khi form có ô tải logo
    ("exporter", "industry_sector", "capability", 5, True),
    ("exporter", "export_markets", "capability", 5, True),
    ("exporter", "foreign_language", "capability", 5, True),
    ("exporter", "product_hs", "products", 10, True),
    ("exporter", "product_image", "products", 5, True),
    ("exporter", "product_description", "products", 3, True),
    ("exporter", "product_price", "products", 2, True),
    ("exporter", "evidence", "evidence", 15, False),  # bật ở C6, kèm job tính lại hằng ngày
    ("buyer", "sourcing_categories", "needs", 30, True),
    ("buyer", "vat_or_eori", "legal", 21, True),
    ("buyer", "company_size", "profile", 12, True),
    ("buyer", "procurement_estimate", "needs", 12, True),
    ("buyer", "business_type", "profile", 10, True),
    ("buyer", "website", "profile", 10, True),
    ("buyer", "logo", "profile", 5, False),  # bật khi form có ô tải logo
]


def upgrade() -> None:
    company_type = postgresql.ENUM("exporter", "buyer", name="company_type", create_type=False)
    op.create_table(
        "completeness_weights",
        sa.Column("company_type", company_type, nullable=False),
        sa.Column("field_key", sa.String(length=32), nullable=False),
        sa.Column("group_key", sa.String(length=32), nullable=False),
        sa.Column("weight", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.CheckConstraint("weight >= 0", name=op.f("ck_completeness_weights_weight_non_negative")),
        sa.PrimaryKeyConstraint("company_type", "field_key", name=op.f("pk_completeness_weights")),
    )
    op.add_column("companies", sa.Column("eori_number", sa.String(length=20), nullable=True))
    table = sa.table(
        "completeness_weights",
        sa.column("company_type", company_type),
        sa.column("field_key", sa.String),
        sa.column("group_key", sa.String),
        sa.column("weight", sa.Numeric),
        sa.column("is_enabled", sa.Boolean),
    )
    op.bulk_insert(
        table,
        [
            {"company_type": t, "field_key": k, "group_key": g, "weight": w, "is_enabled": e}
            for t, k, g, w, e in WEIGHTS
        ],
    )


def downgrade() -> None:
    op.drop_column("companies", "eori_number")
    op.drop_table("completeness_weights")
