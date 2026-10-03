"""company_profile_ext (U2): sản phẩm/dịch vụ, người đại diện, cơ quan cấp, năng lực, mã cơ sở

Revision ID: 0029
Revises: 0028
Create Date: 2026-10-01 09:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0029"
down_revision: str | None = "0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_COLUMNS: list[sa.Column[object]] = [
    sa.Column("offering_type", sa.String(length=16), server_default="products", nullable=False),
    sa.Column("industry_other", sa.String(length=120), nullable=True),
    sa.Column("phone", sa.String(length=40), nullable=True),
    sa.Column("legal_rep_name", sa.String(length=255), nullable=True),
    sa.Column("legal_rep_title", sa.String(length=120), nullable=True),
    sa.Column("issuing_authority", sa.String(length=255), nullable=True),
    sa.Column("factory_address", sa.String(length=500), nullable=True),
    sa.Column("capacity_value", sa.Numeric(precision=14, scale=2), nullable=True),
    sa.Column("capacity_unit", sa.String(length=32), nullable=True),
    sa.Column("capacity_period", sa.String(length=8), nullable=True),
    sa.Column("main_customers", sa.Text(), nullable=True),
    sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=True),
    sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=True),
    sa.Column("location_public", sa.Boolean(), server_default=sa.text("false"), nullable=False),
]

_CHECKS = {
    "offering_type_known": "offering_type IN ('products', 'services', 'both')",
    "capacity_period_known": "capacity_period IS NULL OR capacity_period IN ('month', 'year')",
    "capacity_positive": "capacity_value IS NULL OR capacity_value > 0",
    "lat_lng_together": "(latitude IS NULL) = (longitude IS NULL)",
}


def upgrade() -> None:
    for column in _COLUMNS:
        op.add_column("companies", column)
    for name, condition in _CHECKS.items():
        op.create_check_constraint(op.f(f"ck_companies_{name}"), "companies", condition)

    op.create_table(
        "company_facility_codes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("code_type", sa.String(length=24), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.CheckConstraint(
            "code_type IN ('growing_area', 'packing_facility', 'establishment', 'other')",
            name=op.f("ck_company_facility_codes_code_type_known"),
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name=op.f("fk_company_facility_codes_company_id_companies"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_company_facility_codes")),
        sa.UniqueConstraint(
            "company_id",
            "code_type",
            "code",
            name=op.f("uq_company_facility_codes_company_id"),
        ),
    )
    op.create_index(
        op.f("ix_company_facility_codes_company_id"),
        "company_facility_codes",
        ["company_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_company_facility_codes_company_id"), table_name="company_facility_codes")
    op.drop_table("company_facility_codes")
    for name in _CHECKS:
        op.drop_constraint(op.f(f"ck_companies_{name}"), "companies", type_="check")
    for column in reversed(_COLUMNS):
        op.drop_column("companies", column.name)
