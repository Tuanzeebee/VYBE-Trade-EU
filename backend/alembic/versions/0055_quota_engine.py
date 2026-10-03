"""Hạn ngạch (C2-C): chu kỳ, cách phân bổ có cấu trúc và số dư theo ngày

Revision ID: 0055
Revises: 0054
Create Date: 2026-10-02 22:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0055"
down_revision: str | None = "0054"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tariff_quotas", sa.Column("period_start", sa.Date(), nullable=True))
    op.add_column("tariff_quotas", sa.Column("period_end", sa.Date(), nullable=True))
    op.add_column(
        "tariff_quotas", sa.Column("allocation_method", sa.String(length=24), nullable=True)
    )
    op.add_column(
        "tariff_quotas",
        sa.Column(
            "licence_required", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
    )
    op.add_column("tariff_quotas", sa.Column("licence_issuer_vi", sa.Text(), nullable=True))
    op.create_check_constraint(
        op.f("ck_tariff_quotas_period_window"),
        "tariff_quotas",
        "period_start IS NULL OR period_end IS NULL OR period_end > period_start",
    )
    op.create_check_constraint(
        op.f("ck_tariff_quotas_allocation_method_values"),
        "tariff_quotas",
        "allocation_method IS NULL OR allocation_method IN "
        "('IMPORTER_FIRST_COME', 'EXPORT_LICENCE', 'ALLOCATION', 'OTHER')",
    )
    op.create_table(
        "tariff_quota_balances",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("quota_id", sa.Uuid(), nullable=False),
        sa.Column("as_of", sa.Date(), nullable=False),
        sa.Column("used_volume", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("source", sa.String(length=1024), nullable=False),
        sa.Column("entered_by", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "used_volume >= 0", name=op.f("ck_tariff_quota_balances_non_negative_used")
        ),
        sa.ForeignKeyConstraint(
            ["quota_id"],
            ["tariff_quotas.id"],
            name=op.f("fk_tariff_quota_balances_quota_id_tariff_quotas"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["entered_by"], ["users.id"], name=op.f("fk_tariff_quota_balances_entered_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tariff_quota_balances")),
        sa.UniqueConstraint("quota_id", "as_of", name=op.f("uq_tariff_quota_balances_quota_as_of")),
    )
    op.create_index(
        op.f("ix_tariff_quota_balances_quota_id"), "tariff_quota_balances", ["quota_id"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_tariff_quota_balances_quota_id"), table_name="tariff_quota_balances")
    op.drop_table("tariff_quota_balances")
    op.drop_constraint(
        op.f("ck_tariff_quotas_allocation_method_values"), "tariff_quotas", type_="check"
    )
    op.drop_constraint(op.f("ck_tariff_quotas_period_window"), "tariff_quotas", type_="check")
    for col in (
        "licence_issuer_vi",
        "licence_required",
        "allocation_method",
        "period_end",
        "period_start",
    ):
        op.drop_column("tariff_quotas", col)
