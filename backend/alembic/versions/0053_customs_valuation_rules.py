"""customs_valuation_rules: cơ sở trị giá hải quan theo nước đến (C2-A, trị giá tính thuế)

Revision ID: 0053
Revises: 0052
Create Date: 2026-10-02 20:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0053"
down_revision: str | None = "0052"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customs_valuation_rules",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False),
        sa.Column("basis", sa.String(length=3), nullable=False),
        sa.Column("note_vi", sa.Text(), nullable=True),
        sa.Column("note_en", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=1024), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("data_version", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "basis IN ('CIF', 'FOB')", name=op.f("ck_customs_valuation_rules_basis_values")
        ),
        sa.CheckConstraint(
            "country ~ '^[A-Z]{2}$'", name=op.f("ck_customs_valuation_rules_country_iso2")
        ),
        sa.CheckConstraint(
            "valid_until IS NULL OR valid_until > valid_from",
            name=op.f("ck_customs_valuation_rules_valid_window"),
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_customs_valuation_rules_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_customs_valuation_rules_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_customs_valuation_rules")),
        sa.UniqueConstraint(
            "country", "valid_from", name=op.f("uq_customs_valuation_rules_country_from")
        ),
    )


def downgrade() -> None:
    op.drop_table("customs_valuation_rules")
