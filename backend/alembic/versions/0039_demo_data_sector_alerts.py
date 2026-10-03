"""demo_data_sector_alerts (U14): cờ is_demo cho dữ liệu minh hoạ, bảng sector_alerts

AGENTS.md §6.2 (sửa đổi 01/10/2026): dòng `is_demo = true AND reviewed_by IS NULL` chỉ được trả
khi cờ DEMO_COMPLIANCE_DATA bật và ENV khác prod, kèm data_status = "demo_unreviewed" và banner.
Dòng nháp không gắn is_demo vẫn không bao giờ lộ.

- tariff_lines.is_demo, import_country_terms.is_demo (tariff_quotas, product_subtypes có từ 0038).
- sector_alerts: cảnh báo ngành (vd thẻ vàng IUU cho thủy sản) theo tiền tố HS, do luật TM duyệt.

Revision ID: 0039
Revises: 0038
Create Date: 2026-10-02 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0039"
down_revision: str | None = "0038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table in ("tariff_lines", "import_country_terms"):
        op.add_column(
            table,
            sa.Column("is_demo", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )
    op.create_table(
        "sector_alerts",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column(
            "hs_prefixes",
            postgresql.ARRAY(sa.String(length=8)),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("severity", sa.String(length=16), server_default="warning", nullable=False),
        sa.Column("title_vi", sa.String(length=255), nullable=False),
        sa.Column("title_en", sa.String(length=255), nullable=False),
        sa.Column("body_vi", sa.Text(), nullable=True),
        sa.Column("body_en", sa.Text(), nullable=True),
        sa.Column("source_url", sa.String(length=1024), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("is_demo", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("code ~ '^[a-z0-9_]{2,40}$'", name=op.f("ck_sector_alerts_code_format")),
        sa.CheckConstraint(
            "severity IN ('info', 'warning', 'critical')", name=op.f("ck_sector_alerts_severity")
        ),
        sa.CheckConstraint(
            "cardinality(hs_prefixes) > 0", name=op.f("ck_sector_alerts_has_prefixes")
        ),
        sa.CheckConstraint(
            "valid_until IS NULL OR valid_until > valid_from",
            name=op.f("ck_sector_alerts_valid_window"),
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_sector_alerts_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_sector_alerts_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sector_alerts")),
        sa.UniqueConstraint("code", name=op.f("uq_sector_alerts_code")),
    )


def downgrade() -> None:
    op.drop_table("sector_alerts")
    for table in ("import_country_terms", "tariff_lines"):
        op.drop_column(table, "is_demo")
