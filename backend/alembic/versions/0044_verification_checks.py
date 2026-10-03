"""verification_checks (U21, ADR-0003): kết quả kiểm tự động / kiểm tay — tín hiệu cho admin

- verification_checks: mỗi lần kiểm là một dòng (giữ lịch sử); status pass | fail | warning |
  unknown; checked_by NULL = hệ thống, có giá trị = admin kiểm tay (vd Cổng ĐKDN quốc gia). Không
  bao giờ đổi trạng thái xác minh.
- approved_establishments: danh sách cơ sở được EU cấp phép (TRACES-NT) do admin nạp từ file CSV.

Revision ID: 0044
Revises: 0043
Create Date: 2026-10-03 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0044"
down_revision: str | None = "0043"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "verification_checks",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("check_code", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column(
            "detail",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("checked_by", sa.Uuid(), nullable=True),
        sa.Column(
            "checked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pass', 'fail', 'warning', 'unknown')",
            name=op.f("ck_verification_checks_status"),
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name=op.f("fk_verification_checks_company_id_companies"),
        ),
        sa.ForeignKeyConstraint(
            ["checked_by"], ["users.id"], name=op.f("fk_verification_checks_checked_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_verification_checks")),
    )
    op.create_index(
        "ix_verification_checks_company_code",
        "verification_checks",
        ["company_id", "check_code", "checked_at"],
    )
    op.create_table(
        "approved_establishments",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("list_code", sa.String(length=32), server_default="traces_nt", nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False),
        sa.Column("approval_number", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("section", sa.String(length=128), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("imported_by", sa.Uuid(), nullable=True),
        sa.Column(
            "imported_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["imported_by"], ["users.id"], name=op.f("fk_approved_establishments_imported_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_approved_establishments")),
        sa.UniqueConstraint(
            "list_code",
            "country",
            "approval_number",
            name=op.f("uq_approved_establishments_list_country_number"),
        ),
    )


def downgrade() -> None:
    op.drop_table("approved_establishments")
    op.drop_index("ix_verification_checks_company_code", table_name="verification_checks")
    op.drop_table("verification_checks")
