"""trust_criteria (U23, ADR-0004): tiêu chí và trọng số điểm tín nhiệm là DỮ LIỆU có người duyệt

Tiêu chí chưa duyệt bị bỏ qua; dòng is_demo chỉ dùng được khi bật DEMO ngoài production.

Revision ID: 0045
Revises: 0044
Create Date: 2026-10-03 18:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0045"
down_revision: str | None = "0044"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "trust_criteria",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("component", sa.String(length=16), nullable=False),
        sa.Column("fact_key", sa.String(length=64), nullable=False),
        sa.Column("label_vi", sa.String(length=255), nullable=False),
        sa.Column("label_en", sa.String(length=255), nullable=False),
        sa.Column("weight", sa.Numeric(5, 2), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("is_demo", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "component IN ('documents', 'automated', 'behaviour')",
            name=op.f("ck_trust_criteria_component"),
        ),
        sa.CheckConstraint("weight >= 0", name=op.f("ck_trust_criteria_weight_non_negative")),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_trust_criteria_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_trust_criteria_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_trust_criteria")),
        sa.UniqueConstraint("fact_key", name=op.f("uq_trust_criteria_fact_key")),
    )


def downgrade() -> None:
    op.drop_table("trust_criteria")
