"""market_reports (U18): báo cáo go-to-market theo công ty, sản phẩm; yêu cầu tư vấn qua VBA

- market_reports: ảnh chụp chỉ số (metrics, JSON), lời văn (narrative, JSON) và nguồn lời văn (model
  | template), file PDF, trạng thái job.
- consulting_leads: yêu cầu tư vấn triển khai từ báo cáo; admin theo dõi trạng thái.

Revision ID: 0041
Revises: 0040
Create Date: 2026-10-02 16:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0041"
down_revision: str | None = "0040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "market_reports",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("requested_by", sa.Uuid(), nullable=True),
        sa.Column("product_id", sa.Uuid(), nullable=True),
        sa.Column("query", sa.String(length=100), nullable=False),
        sa.Column("language", sa.String(length=2), server_default="vi", nullable=False),
        sa.Column("status", sa.String(length=16), server_default="queued", nullable=False),
        sa.Column(
            "input",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("narrative", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("narrative_source", sa.String(length=16), nullable=True),
        sa.Column("pdf_key", sa.String(length=512), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'ready', 'failed')",
            name=op.f("ck_market_reports_status"),
        ),
        sa.CheckConstraint(
            "narrative_source IS NULL OR narrative_source IN ('model', 'template')",
            name=op.f("ck_market_reports_narrative_source"),
        ),
        sa.CheckConstraint("language IN ('vi', 'en')", name=op.f("ck_market_reports_language")),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], name=op.f("fk_market_reports_company_id_companies")
        ),
        sa.ForeignKeyConstraint(
            ["requested_by"], ["users.id"], name=op.f("fk_market_reports_requested_by_users")
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_market_reports_product_id_products"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_market_reports")),
    )
    op.create_index(
        "ix_market_reports_company_created", "market_reports", ["company_id", "created_at"]
    )
    op.create_table(
        "consulting_leads",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("report_id", sa.Uuid(), nullable=True),
        sa.Column("contact_name", sa.String(length=255), nullable=False),
        sa.Column("contact_email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), server_default="new", nullable=False),
        sa.Column("handled_by", sa.Uuid(), nullable=True),
        sa.Column("handled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('new', 'contacted', 'closed')", name=op.f("ck_consulting_leads_status")
        ),
        sa.ForeignKeyConstraint(
            ["company_id"], ["companies.id"], name=op.f("fk_consulting_leads_company_id_companies")
        ),
        sa.ForeignKeyConstraint(
            ["report_id"],
            ["market_reports.id"],
            name=op.f("fk_consulting_leads_report_id_market_reports"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["handled_by"], ["users.id"], name=op.f("fk_consulting_leads_handled_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_consulting_leads")),
    )


def downgrade() -> None:
    op.drop_table("consulting_leads")
    op.drop_index("ix_market_reports_company_created", table_name="market_reports")
    op.drop_table("market_reports")
