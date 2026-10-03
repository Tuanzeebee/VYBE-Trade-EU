"""evidence_extractions (U24, X8): AI đọc chứng nhận — CHỈ gợi ý, không đổi trạng thái duyệt

Mỗi bằng chứng có tối đa một bản trích xuất hiện hành (chạy lại thì thay). fields: loại, số, tổ
chức cấp, ngày cấp, ngày hết hạn, tên và địa chỉ đơn vị được cấp. Seller xác nhận gợi ý mới áp vào
bằng chứng.

Revision ID: 0046
Revises: 0045
Create Date: 2026-10-04 09:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0046"
down_revision: str | None = "0045"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "evidence_extractions",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("evidence_id", sa.Uuid(), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=16), server_default="queued", nullable=False),
        sa.Column("method", sa.String(length=16), nullable=True),
        sa.Column("model", sa.String(length=64), nullable=True),
        sa.Column(
            "fields",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("error", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'ready', 'failed', 'skipped')",
            name=op.f("ck_evidence_extractions_status"),
        ),
        sa.CheckConstraint(
            "method IS NULL OR method IN ('text', 'vision')",
            name=op.f("ck_evidence_extractions_method"),
        ),
        sa.ForeignKeyConstraint(
            ["evidence_id"],
            ["evidences.id"],
            name=op.f("fk_evidence_extractions_evidence_id_evidences"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name=op.f("fk_evidence_extractions_company_id_companies"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_evidence_extractions")),
        sa.UniqueConstraint("evidence_id", name=op.f("uq_evidence_extractions_evidence_id")),
    )
    op.create_index(
        "ix_evidence_extractions_company", "evidence_extractions", ["company_id", "status"]
    )


def downgrade() -> None:
    op.drop_index("ix_evidence_extractions_company", table_name="evidence_extractions")
    op.drop_table("evidence_extractions")
