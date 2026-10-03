"""market_insights: dữ kiện thị trường do người duyệt nhập (N5)

Revision ID: 0059
Revises: 0058
Create Date: 2026-10-03 16:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0059"
down_revision: str | None = "0058"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "market_insights",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False),
        sa.Column("hs_prefix", sa.String(length=6), nullable=False),
        sa.Column("segment", sa.String(length=32), nullable=False),
        sa.Column("note_vi", sa.Text(), nullable=False),
        sa.Column("note_en", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint("country ~ '^[A-Z]{2}$'", name=op.f("ck_market_insights_country_iso2")),
        sa.CheckConstraint(
            "hs_prefix ~ '^[0-9]{2,6}$'", name=op.f("ck_market_insights_hs_prefix_digits")
        ),
        sa.CheckConstraint(
            "segment IN ('horeca', 'retail', 'industrial_kitchen', 'consumer_asian', "
            "'consumer_european', 'general')",
            name=op.f("ck_market_insights_segment_values"),
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_market_insights_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_market_insights_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_market_insights")),
    )
    op.create_index(op.f("ix_market_insights_country"), "market_insights", ["country"])


def downgrade() -> None:
    op.drop_index(op.f("ix_market_insights_country"), table_name="market_insights")
    op.drop_table("market_insights")
