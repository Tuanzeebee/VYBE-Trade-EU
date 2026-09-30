"""markets (U15): thống kê thương mại nhập từ Eurostat Comext (hoặc file đã tuyển chọn)

- trade_import_batches: mỗi lần nạp (nguồn, tham số, trạng thái, số dòng, lỗi) — chạy bằng job nền.
- trade_flows: một dòng / (nguồn, nước báo cáo, đối tác, mã hàng, năm, chiều) với trị giá EUR và
  khối lượng kg. Số liệu là thống kê công bố (không phải dữ liệu luật); lời văn báo cáo chỉ được
  dùng các số này (U18).

Revision ID: 0040
Revises: 0039
Create Date: 2026-10-02 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0040"
down_revision: str | None = "0039"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "trade_import_batches",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column(
            "params",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=16), server_default="queued", nullable=False),
        sa.Column("rows_imported", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_by", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'succeeded', 'failed')",
            name=op.f("ck_trade_import_batches_status"),
        ),
        sa.ForeignKeyConstraint(
            ["started_by"], ["users.id"], name=op.f("fk_trade_import_batches_started_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_trade_import_batches")),
    )
    op.create_table(
        "trade_flows",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("reporter", sa.String(length=16), nullable=False),
        sa.Column("partner", sa.String(length=16), nullable=False),
        sa.Column("product", sa.String(length=8), nullable=False),
        sa.Column("year", sa.SmallInteger(), nullable=False),
        sa.Column("flow", sa.String(length=8), nullable=False),
        sa.Column("value_eur", sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column("quantity_kg", sa.Numeric(precision=18, scale=3), nullable=True),
        sa.Column("batch_id", sa.Uuid(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint("flow IN ('import', 'export')", name=op.f("ck_trade_flows_flow")),
        sa.CheckConstraint("product ~ '^[0-9]{2,8}$'", name=op.f("ck_trade_flows_product_format")),
        sa.CheckConstraint("year BETWEEN 1988 AND 2100", name=op.f("ck_trade_flows_year_range")),
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["trade_import_batches.id"],
            name=op.f("fk_trade_flows_batch_id_trade_import_batches"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_trade_flows")),
        sa.UniqueConstraint(
            "source",
            "reporter",
            "partner",
            "product",
            "year",
            "flow",
            name=op.f("uq_trade_flows_key"),
        ),
    )
    op.create_index("ix_trade_flows_product_year", "trade_flows", ["product", "year"])


def downgrade() -> None:
    op.drop_index("ix_trade_flows_product_year", table_name="trade_flows")
    op.drop_table("trade_flows")
    op.drop_table("trade_import_batches")
