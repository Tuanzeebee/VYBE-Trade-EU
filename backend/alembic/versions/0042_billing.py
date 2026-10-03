"""billing (U19, ADR-0005): mục thu phí, đơn chuyển khoản, quyền dùng

- billing_items: danh mục thu phí là dữ liệu. Ba mục khởi tạo có giá PLACEHOLDER (chờ khách chốt):
  duyệt xác minh Nâng cao, báo cáo go-to-market đầy đủ, danh sách "ai đã xem hồ sơ" đầy đủ.
- orders: đơn mua, mã tham chiếu duy nhất (nội dung chuyển khoản); mỗi công ty tối đa một đơn
  đang chờ cho một mục.
- entitlements: quyền dùng có hạn, gắn đơn gốc (một đơn cấp tối đa một quyền → xác nhận lặp vô hại).

Revision ID: 0042
Revises: 0041
Create Date: 2026-10-02 20:00:00.000000
"""

from collections.abc import Sequence
from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0042"
down_revision: str | None = "0041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _created_at() -> sa.Column[object]:
    return sa.Column(
        "created_at",
        sa.DateTime(timezone=True),
        server_default=sa.text("clock_timestamp()"),
        nullable=False,
    )


def upgrade() -> None:
    items = op.create_table(
        "billing_items",
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name_vi", sa.String(length=255), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("description_vi", sa.Text(), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column("audience", sa.String(length=16), nullable=False),
        sa.Column("feature", sa.String(length=64), nullable=False),
        sa.Column("price", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="VND", nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("price_is_placeholder", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_by", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "audience IN ('exporter', 'buyer')", name=op.f("ck_billing_items_audience")
        ),
        sa.CheckConstraint("price >= 0", name=op.f("ck_billing_items_price_non_negative")),
        sa.CheckConstraint(
            "currency IN ('VND', 'EUR', 'USD')", name=op.f("ck_billing_items_currency")
        ),
        sa.CheckConstraint(
            "duration_days IS NULL OR duration_days > 0", name=op.f("ck_billing_items_duration")
        ),
        sa.ForeignKeyConstraint(
            ["updated_by"], ["users.id"], name=op.f("fk_billing_items_updated_by_users")
        ),
        sa.PrimaryKeyConstraint("code", name=op.f("pk_billing_items")),
    )
    op.bulk_insert(
        items,
        [
            {
                "code": "verification_enhanced",
                "name_vi": "Duyệt xác minh Nâng cao",
                "name_en": "Enhanced verification review",
                "description_vi": "Đối chiếu chứng nhận với tổ chức cấp, mã cơ sở, bằng chứng xuất"
                " khẩu; huy hiệu cấp Nâng cao trong một năm.",
                "description_en": "Certificates checked with issuers, facility codes and export"
                " evidence; Enhanced badge for one year.",
                "audience": "exporter",
                "feature": "verification_enhanced_review",
                "price": Decimal("2000000"),
                "currency": "VND",
                "duration_days": 365,
                "sort_order": 1,
            },
            {
                "code": "gtm_report_full",
                "name_vi": "Báo cáo go-to-market đầy đủ",
                "name_en": "Full go-to-market report",
                "description_vi": "Mọi phần của báo cáo (đối thủ, định vị giá, thuế, OEM hay thương"
                " hiệu riêng, rủi ro) và file PDF, trong 90 ngày.",
                "description_en": "All report sections (competitors, pricing, tariffs, OEM or own"
                " brand, risks) and the PDF file, for 90 days.",
                "audience": "exporter",
                "feature": "gtm_report_full",
                "price": Decimal("1500000"),
                "currency": "VND",
                "duration_days": 90,
                "sort_order": 2,
            },
            {
                "code": "profile_viewers_full",
                "name_vi": "Danh sách đầy đủ ai đã xem hồ sơ",
                "name_en": "Full profile viewers list",
                "description_vi": "Xem tất cả buyer đã xác minh xem hồ sơ của bạn, trong 90 ngày.",
                "description_en": "See every verified buyer who viewed your profile, for 90 days.",
                "audience": "exporter",
                "feature": "profile_viewers_full",
                "price": Decimal("500000"),
                "currency": "VND",
                "duration_days": 90,
                "sort_order": 3,
            },
        ],
    )
    op.create_table(
        "orders",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("item_code", sa.String(length=64), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("reference", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=16), server_default="pending", nullable=False),
        sa.Column(
            "invoice_info",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        _created_at(),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_by", sa.Uuid(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending', 'paid', 'cancelled')", name=op.f("ck_orders_status")
        ),
        sa.CheckConstraint("amount >= 0", name=op.f("ck_orders_amount_non_negative")),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], name=op.f("fk_orders_company_id_companies")
        ),
        sa.ForeignKeyConstraint(
            ["item_code"], ["billing_items.code"], name=op.f("fk_orders_item_code_billing_items")
        ),
        sa.ForeignKeyConstraint(
            ["created_by"], ["users.id"], name=op.f("fk_orders_created_by_users")
        ),
        sa.ForeignKeyConstraint(
            ["confirmed_by"], ["users.id"], name=op.f("fk_orders_confirmed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_orders")),
        sa.UniqueConstraint("reference", name=op.f("uq_orders_reference")),
    )
    op.create_index("ix_orders_company_created", "orders", ["company_id", "created_at"])
    op.create_index(
        "uq_orders_pending_item",
        "orders",
        ["company_id", "item_code"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )
    op.create_table(
        "entitlements",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("feature", sa.String(length=64), nullable=False),
        sa.Column("order_id", sa.Uuid(), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        _created_at(),
        sa.CheckConstraint(
            "valid_until IS NULL OR valid_until > valid_from", name=op.f("ck_entitlements_window")
        ),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], name=op.f("fk_entitlements_company_id_companies")
        ),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name=op.f("fk_entitlements_order_id_orders")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_entitlements")),
        sa.UniqueConstraint("order_id", name=op.f("uq_entitlements_order_id")),
    )
    op.create_index(
        "ix_entitlements_company_feature", "entitlements", ["company_id", "feature", "valid_until"]
    )


def downgrade() -> None:
    op.drop_index("ix_entitlements_company_feature", table_name="entitlements")
    op.drop_table("entitlements")
    op.drop_index("uq_orders_pending_item", table_name="orders")
    op.drop_index("ix_orders_company_created", table_name="orders")
    op.drop_table("orders")
    op.drop_table("billing_items")
