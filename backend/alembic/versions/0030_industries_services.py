"""industries_services (U2): danh mục ngành hàng (có "Khác"), loại dịch vụ, dịch vụ của nhà cung cấp

Revision ID: 0030
Revises: 0029
Create Date: 2026-10-01 09:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0030"
down_revision: str | None = "0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Sáu ngành cũ giữ nguyên mã (dữ liệu hiện có và hs_codes.category dùng); thêm rau quả, cà phê–chè
# và "Khác" (demo 30/9: luôn phải có nhóm cho thứ không nằm trong danh mục).
INDUSTRIES = [
    ("agriculture", "Nông sản", "Agricultural products", 10),
    ("fruits_vegetables", "Rau quả", "Fruits & vegetables", 20),
    ("coffee_tea", "Cà phê & chè", "Coffee & tea", 30),
    ("seafood", "Thủy sản", "Seafood", 40),
    ("food_beverage", "Thực phẩm & Đồ uống", "Food & beverages", 50),
    ("spices", "Gia vị & Hương liệu", "Spices & flavourings", 60),
    ("textiles", "Dệt may", "Textiles & garments", 70),
    ("handicrafts", "Thủ công mỹ nghệ", "Handicrafts", 80),
    ("other", "Khác", "Other", 999),
]

SERVICE_CATEGORIES = [
    ("logistics_freight", "Vận tải & giao nhận", "Freight forwarding & logistics", 10),
    ("customs_brokerage", "Đại lý hải quan", "Customs brokerage", 20),
    ("warehousing", "Kho bãi & kho lạnh", "Warehousing & cold storage", 30),
    ("accounting_tax", "Kế toán & thuế", "Accounting & tax", 40),
    ("legal", "Pháp lý & luật", "Legal services", 50),
    ("certification_testing", "Chứng nhận & kiểm nghiệm", "Certification & testing", 60),
    ("insurance", "Bảo hiểm hàng hóa", "Cargo insurance", 70),
    ("other", "Khác", "Other", 999),
]


def _catalog_table(name: str) -> sa.Table:
    op.create_table(
        name,
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name_vi", sa.String(length=120), nullable=False),
        sa.Column("name_en", sa.String(length=120), nullable=False),
        sa.Column("sort_order", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.PrimaryKeyConstraint("code", name=op.f(f"pk_{name}")),
    )
    return sa.table(
        name,
        sa.column("code", sa.String),
        sa.column("name_vi", sa.String),
        sa.column("name_en", sa.String),
        sa.column("sort_order", sa.SmallInteger),
    )


def upgrade() -> None:
    industries = _catalog_table("industries")
    op.bulk_insert(
        industries,
        [{"code": c, "name_vi": vi, "name_en": en, "sort_order": o} for c, vi, en, o in INDUSTRIES],
    )
    services = _catalog_table("service_categories")
    op.bulk_insert(
        services,
        [
            {"code": c, "name_vi": vi, "name_en": en, "sort_order": o}
            for c, vi, en, o in SERVICE_CATEGORIES
        ],
    )

    op.create_foreign_key(
        op.f("fk_companies_industry_sector_industries"),
        "companies",
        "industries",
        ["industry_sector"],
        ["code"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        op.f("fk_company_sourcing_categories_category_industries"),
        "company_sourcing_categories",
        "industries",
        ["category"],
        ["code"],
        ondelete="RESTRICT",
    )

    op.create_table(
        "company_service_offerings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("category_code", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description_vi", sa.Text(), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column(
            "coverage_countries",
            sa.ARRAY(sa.String(length=2)),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["category_code"],
            ["service_categories.code"],
            name=op.f("fk_company_service_offerings_category_code_service_categories"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name=op.f("fk_company_service_offerings_company_id_companies"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_company_service_offerings")),
    )
    op.create_index(
        op.f("ix_company_service_offerings_company_id"),
        "company_service_offerings",
        ["company_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_company_service_offerings_category_code"),
        "company_service_offerings",
        ["category_code"],
        unique=False,
    )
    op.create_index(
        "ix_company_service_offerings_title_trgm",
        "company_service_offerings",
        [sa.text("immutable_unaccent(lower(title)) gin_trgm_ops")],
        unique=False,
        postgresql_using="gin",
    )


def downgrade() -> None:
    op.drop_index(
        "ix_company_service_offerings_title_trgm",
        table_name="company_service_offerings",
        postgresql_using="gin",
    )
    op.drop_index(
        op.f("ix_company_service_offerings_category_code"), table_name="company_service_offerings"
    )
    op.drop_index(
        op.f("ix_company_service_offerings_company_id"), table_name="company_service_offerings"
    )
    op.drop_table("company_service_offerings")
    op.drop_constraint(
        op.f("fk_company_sourcing_categories_category_industries"),
        "company_sourcing_categories",
        type_="foreignkey",
    )
    op.drop_constraint(
        op.f("fk_companies_industry_sector_industries"), "companies", type_="foreignkey"
    )
    # Ngành mới (rau quả, cà phê–chè, khác) chưa có trước 0030: đưa về trống thay vì làm hỏng.
    op.execute(
        "UPDATE companies SET industry_sector = NULL "
        "WHERE industry_sector IN ('fruits_vegetables', 'coffee_tea', 'other')"
    )
    op.execute(
        "DELETE FROM company_sourcing_categories "
        "WHERE category IN ('fruits_vegetables', 'coffee_tea', 'other')"
    )
    op.drop_table("service_categories")
    op.drop_table("industries")
