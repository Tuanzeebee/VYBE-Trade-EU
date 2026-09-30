"""rfq_quotes (U8): báo giá có cấu trúc của seller cho một RFQ; buyer chấp nhận / từ chối

Mỗi RFQ có tối đa một báo giá đang mở (status 'sent') và một báo giá được chấp nhận. Đặt cọc 100%
thì không có điều khoản phần còn lại ('none'), và ngược lại.

Revision ID: 0035
Revises: 0034
Create Date: 2026-10-01 20:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0035"
down_revision: str | None = "0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_BALANCE = "('tt_before_shipment', 'against_bl_copy', 'lc_at_sight', 'none')"
_STATUS = "('sent', 'accepted', 'declined', 'withdrawn', 'superseded')"


def upgrade() -> None:
    incoterm = postgresql.ENUM(name="incoterm", create_type=False)
    op.create_table(
        "rfq_quotes",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("rfq_id", sa.Uuid(), nullable=False),
        sa.Column("exporter_company_id", sa.Uuid(), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=False),
        sa.Column("incoterm", incoterm, nullable=False),
        sa.Column("named_place", sa.String(length=100), nullable=True),
        sa.Column("deposit_percent", sa.SmallInteger(), nullable=False),
        sa.Column("balance_terms", sa.String(length=32), nullable=False),
        sa.Column("lead_time_days", sa.SmallInteger(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), server_default="sent", nullable=False),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint("unit_price > 0", name=op.f("ck_rfq_quotes_positive_price")),
        sa.CheckConstraint("quantity > 0", name=op.f("ck_rfq_quotes_positive_quantity")),
        sa.CheckConstraint(
            "deposit_percent BETWEEN 0 AND 100", name=op.f("ck_rfq_quotes_deposit_range")
        ),
        sa.CheckConstraint(f"balance_terms IN {_BALANCE}", name=op.f("ck_rfq_quotes_balance")),
        sa.CheckConstraint(
            "(deposit_percent = 100) = (balance_terms = 'none')",
            name=op.f("ck_rfq_quotes_balance_matches_deposit"),
        ),
        sa.CheckConstraint(
            "lead_time_days BETWEEN 1 AND 365", name=op.f("ck_rfq_quotes_lead_time_range")
        ),
        sa.CheckConstraint(f"status IN {_STATUS}", name=op.f("ck_rfq_quotes_status")),
        sa.ForeignKeyConstraint(["rfq_id"], ["rfqs.id"], name=op.f("fk_rfq_quotes_rfq_id_rfqs")),
        sa.ForeignKeyConstraint(
            ["exporter_company_id"],
            ["companies.id"],
            name=op.f("fk_rfq_quotes_exporter_company_id_companies"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rfq_quotes")),
    )
    op.create_index("ix_rfq_quotes_rfq_created", "rfq_quotes", ["rfq_id", "created_at"])
    op.create_index(
        "uq_rfq_quotes_one_open",
        "rfq_quotes",
        ["rfq_id"],
        unique=True,
        postgresql_where=sa.text("status = 'sent'"),
    )
    op.create_index(
        "uq_rfq_quotes_one_accepted",
        "rfq_quotes",
        ["rfq_id"],
        unique=True,
        postgresql_where=sa.text("status = 'accepted'"),
    )


def downgrade() -> None:
    op.drop_index("uq_rfq_quotes_one_accepted", table_name="rfq_quotes")
    op.drop_index("uq_rfq_quotes_one_open", table_name="rfq_quotes")
    op.drop_index("ix_rfq_quotes_rfq_created", table_name="rfq_quotes")
    op.drop_table("rfq_quotes")
