"""evidence_type_mappings, company_badges: huy hiệu EVFTA-verified theo nhóm hàng (SPEC §5.4)

Revision ID: 0051
Revises: 0050
Create Date: 2026-10-02 16:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0051"
down_revision: str | None = "0050"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "evidence_type_mappings",
        sa.Column("compliance_code", sa.String(length=40), nullable=False),
        sa.Column("verification_code", sa.String(length=64), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data_version", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_evidence_type_mappings_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["compliance_code"],
            ["compliance_evidence_types.code"],
            name=op.f("fk_evidence_type_mappings_compliance_code_compliance_evidence_types"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_evidence_type_mappings_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("compliance_code", name=op.f("pk_evidence_type_mappings")),
    )
    op.create_table(
        "company_badges",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_state", sa.String(length=16), nullable=False),
        sa.Column(
            "unreviewed_components",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "missing",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], name=op.f("fk_company_badges_company_id_companies")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_company_badges")),
        sa.UniqueConstraint(
            "company_id", "category", name=op.f("uq_company_badges_company_category")
        ),
    )
    op.create_index(op.f("ix_company_badges_company_id"), "company_badges", ["company_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_company_badges_company_id"), table_name="company_badges")
    op.drop_table("company_badges")
    op.drop_table("evidence_type_mappings")
