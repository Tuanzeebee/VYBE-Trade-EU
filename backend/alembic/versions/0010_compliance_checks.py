"""compliance_checks append-only

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-29
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "compliance_checks",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=True),
        sa.Column("check_type", sa.Enum("tariff", "roo", name="check_type"), nullable=False),
        sa.Column("hs_code", sa.String(length=8), nullable=False),
        sa.Column("product_value", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("origin_country", sa.String(length=2), nullable=True),
        sa.Column("destination_country", sa.String(length=2), nullable=False),
        sa.Column("mfn_duty_rate", sa.Numeric(precision=7, scale=4), nullable=True),
        sa.Column("evfta_duty_rate", sa.Numeric(precision=7, scale=4), nullable=True),
        sa.Column("savings_amount", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("regional_value_content_pct", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("originating_status", sa.String(length=16), nullable=True),
        sa.Column("tariff_line_id", sa.Uuid(), nullable=True),
        sa.Column("rule_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "hs_code ~ '^[0-9]{6,8}$'", name=op.f("ck_compliance_checks_hs_code_format")
        ),
        sa.CheckConstraint(
            "destination_country ~ '^[A-Z]{2}$'",
            name=op.f("ck_compliance_checks_destination_iso2"),
        ),
        sa.CheckConstraint(
            "product_value IS NULL OR product_value > 0",
            name=op.f("ck_compliance_checks_positive_value"),
        ),
        sa.CheckConstraint(
            "(check_type = 'tariff' AND status IN ('ok', 'unsupported', 'needs_review'))"
            " OR (check_type = 'roo'"
            " AND status IN ('pass', 'fail', 'inconclusive', 'unsupported'))",
            name=op.f("ck_compliance_checks_status_matches_type"),
        ),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], name=op.f("fk_compliance_checks_company_id_companies")
        ),
        sa.ForeignKeyConstraint(
            ["tariff_line_id"],
            ["tariff_lines.id"],
            name=op.f("fk_compliance_checks_tariff_line_id_tariff_lines"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_compliance_checks")),
    )
    op.create_index(
        op.f("ix_compliance_checks_company_id"), "compliance_checks", ["company_id"], unique=False
    )
    # forbid_mutation() tạo ở migration 0002; dùng lại cho mọi bảng append-only.
    op.execute(
        "CREATE TRIGGER compliance_checks_append_only BEFORE UPDATE OR DELETE ON compliance_checks "
        "FOR EACH ROW EXECUTE FUNCTION forbid_mutation()"
    )
    op.execute(
        "CREATE TRIGGER compliance_checks_no_truncate BEFORE TRUNCATE ON compliance_checks "
        "FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation()"
    )


def downgrade() -> None:
    op.drop_table("compliance_checks")  # kéo theo trigger và chỉ mục
    op.execute("DROP TYPE IF EXISTS check_type")
