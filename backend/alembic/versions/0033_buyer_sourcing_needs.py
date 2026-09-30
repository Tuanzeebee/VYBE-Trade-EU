"""buyer_sourcing_needs (U5): nhu cầu mua hàng của buyer lưu trên server; người liên hệ của công ty

Revision ID: 0033
Revises: 0032
Create Date: 2026-10-01 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0033"
down_revision: str | None = "0032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("contact_name", sa.String(length=255), nullable=True))
    op.add_column("companies", sa.Column("city", sa.String(length=120), nullable=True))
    op.create_table(
        "buyer_sourcing_needs",
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("products_text", sa.Text(), nullable=True),
        sa.Column("quantity", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("quantity_unit", sa.String(length=32), nullable=True),
        sa.Column("frequency", sa.String(length=16), nullable=True),
        sa.Column(
            "certifications_wanted",
            sa.ARRAY(sa.String(length=64)),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("min_supplier_tier", sa.SmallInteger(), nullable=True),
        sa.Column("destination_country", sa.String(length=2), nullable=True),
        sa.Column("destination_port", sa.String(length=120), nullable=True),
        sa.Column("incoterm", sa.String(length=8), nullable=True),
        sa.Column("budget_amount", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("budget_currency", sa.String(length=3), server_default="EUR", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "quantity IS NULL OR quantity > 0",
            name=op.f("ck_buyer_sourcing_needs_quantity_positive"),
        ),
        sa.CheckConstraint(
            "budget_amount IS NULL OR budget_amount > 0",
            name=op.f("ck_buyer_sourcing_needs_budget_positive"),
        ),
        sa.CheckConstraint(
            "min_supplier_tier IS NULL OR min_supplier_tier BETWEEN 0 AND 3",
            name=op.f("ck_buyer_sourcing_needs_tier_range"),
        ),
        sa.CheckConstraint(
            "frequency IS NULL OR frequency IN ('one_off', 'monthly', 'quarterly', 'yearly')",
            name=op.f("ck_buyer_sourcing_needs_frequency_known"),
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name=op.f("fk_buyer_sourcing_needs_company_id_companies"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("company_id", name=op.f("pk_buyer_sourcing_needs")),
    )


def downgrade() -> None:
    op.drop_table("buyer_sourcing_needs")
    op.drop_column("companies", "city")
    op.drop_column("companies", "contact_name")
