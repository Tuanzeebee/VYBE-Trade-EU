"""freight_benchmarks, insurance_benchmarks: giá cước và phí bảo hiểm tham khảo (N6a)

Revision ID: 0057
Revises: 0056
Create Date: 2026-10-03 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0057"
down_revision: str | None = "0056"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NOW = sa.text("clock_timestamp()")


def upgrade() -> None:
    op.create_table(
        "freight_benchmarks",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("origin_port", sa.String(length=64), nullable=False),
        sa.Column("dest_country", sa.String(length=2), nullable=False),
        sa.Column("dest_port", sa.String(length=64), nullable=True),
        sa.Column("container_type", sa.String(length=16), nullable=False),
        sa.Column("cargo_class", sa.String(length=16), nullable=False),
        sa.Column("price_low", sa.Numeric(12, 2), nullable=False),
        sa.Column("price_typical", sa.Numeric(12, 2), nullable=False),
        sa.Column("price_high", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.CheckConstraint(
            "dest_country ~ '^[A-Z]{2}$'", name=op.f("ck_freight_benchmarks_dest_country_iso2")
        ),
        sa.CheckConstraint(
            "container_type IN ('20GP', '40GP', '40HC', '20RF', '40RF')",
            name=op.f("ck_freight_benchmarks_container_values"),
        ),
        sa.CheckConstraint(
            "cargo_class IN ('dry', 'reefer', 'hazard')",
            name=op.f("ck_freight_benchmarks_cargo_class_values"),
        ),
        sa.CheckConstraint(
            "price_low <= price_typical AND price_typical <= price_high",
            name=op.f("ck_freight_benchmarks_price_order"),
        ),
        sa.CheckConstraint(
            "valid_until >= valid_from", name=op.f("ck_freight_benchmarks_valid_window")
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_freight_benchmarks_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_freight_benchmarks_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_freight_benchmarks")),
    )
    op.create_index(
        op.f("ix_freight_benchmarks_dest_country"), "freight_benchmarks", ["dest_country"]
    )
    op.create_table(
        "insurance_benchmarks",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("cargo_class", sa.String(length=16), nullable=False),
        sa.Column("rate_percent", sa.Numeric(6, 4), nullable=False),
        sa.Column("basis", sa.String(length=8), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=False),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.CheckConstraint(
            "cargo_class IN ('dry', 'reefer', 'hazard')",
            name=op.f("ck_insurance_benchmarks_cargo_class_values"),
        ),
        sa.CheckConstraint(
            "basis IN ('cif', 'invoice')", name=op.f("ck_insurance_benchmarks_basis_values")
        ),
        sa.CheckConstraint(
            "rate_percent >= 0 AND rate_percent <= 100",
            name=op.f("ck_insurance_benchmarks_rate_range"),
        ),
        sa.CheckConstraint(
            "valid_until >= valid_from", name=op.f("ck_insurance_benchmarks_valid_window")
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_insurance_benchmarks_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_insurance_benchmarks_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_insurance_benchmarks")),
    )
    op.create_index(
        op.f("ix_insurance_benchmarks_cargo_class"), "insurance_benchmarks", ["cargo_class"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_insurance_benchmarks_cargo_class"), table_name="insurance_benchmarks")
    op.drop_table("insurance_benchmarks")
    op.drop_index(op.f("ix_freight_benchmarks_dest_country"), table_name="freight_benchmarks")
    op.drop_table("freight_benchmarks")
