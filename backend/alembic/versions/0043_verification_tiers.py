"""verification tiers (U20, ADR-0004): cấp xác minh 0–3, tier_up / tier_down, yêu cầu theo cấp

- companies.verification_tier (0 chưa xác minh, 1 Cơ bản, 2 Nâng cao, 3 Chuyên sâu),
  tier_reviewed_at, tier_expires_at. Công ty đang verified → cấp 1. verification_level
  (basic/evfta_verified) giữ nội bộ.
- verification_decision thêm tier_up, tier_down; verification_decisions thêm from_tier / to_tier.
- verification_requests.target_tier: 1 = xác minh lần đầu (pháp lý), 2–3 = xin lên cấp.
- tier_requirements: yêu cầu của từng cấp theo loại công ty — DỮ LIỆU, có reviewed_by (nháp chưa
  duyệt chỉ là hướng dẫn, không làm job tự hạ cấp).

Revision ID: 0043
Revises: 0042
Create Date: 2026-10-03 09:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0043"
down_revision: str | None = "0042"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OLD_DECISIONS = ("approve", "reject", "request_info", "expire", "level_up", "level_down", "submit")


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("verification_tier", sa.SmallInteger(), server_default="0", nullable=False),
    )
    op.add_column("companies", sa.Column("tier_reviewed_at", sa.DateTime(timezone=True)))
    op.add_column("companies", sa.Column("tier_expires_at", sa.DateTime(timezone=True)))
    op.create_check_constraint(
        op.f("ck_companies_verification_tier_range"),
        "companies",
        "verification_tier BETWEEN 0 AND 3",
    )
    op.execute(
        "UPDATE companies SET verification_tier = 1, tier_reviewed_at = verified_at "
        "WHERE verification_status = 'verified'"
    )

    for value in ("tier_up", "tier_down"):
        op.execute(f"ALTER TYPE verification_decision ADD VALUE IF NOT EXISTS '{value}'")
    op.add_column("verification_decisions", sa.Column("from_tier", sa.SmallInteger()))
    op.add_column("verification_decisions", sa.Column("to_tier", sa.SmallInteger()))

    op.add_column(
        "verification_requests",
        sa.Column("target_tier", sa.SmallInteger(), server_default="1", nullable=False),
    )
    op.create_check_constraint(
        op.f("ck_verification_requests_target_tier_range"),
        "verification_requests",
        "target_tier BETWEEN 1 AND 3",
    )

    op.create_table(
        "tier_requirements",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("company_kind", sa.String(length=20), nullable=False),
        sa.Column("tier", sa.SmallInteger(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("label_vi", sa.String(length=255), nullable=False),
        sa.Column("label_en", sa.String(length=255), nullable=False),
        sa.Column("is_required", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "company_kind IN ('product_seller', 'service_provider', 'buyer')",
            name=op.f("ck_tier_requirements_company_kind"),
        ),
        sa.CheckConstraint("tier BETWEEN 1 AND 3", name=op.f("ck_tier_requirements_tier")),
        sa.CheckConstraint(
            "kind IN ('evidence', 'check', 'manual')", name=op.f("ck_tier_requirements_kind")
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_tier_requirements_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_tier_requirements_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tier_requirements")),
        sa.UniqueConstraint(
            "company_kind", "tier", "code", name=op.f("uq_tier_requirements_kind_tier_code")
        ),
    )


def downgrade() -> None:
    op.drop_table("tier_requirements")
    op.drop_constraint(
        op.f("ck_verification_requests_target_tier_range"), "verification_requests", type_="check"
    )
    op.drop_column("verification_requests", "target_tier")
    op.drop_column("verification_decisions", "to_tier")
    op.drop_column("verification_decisions", "from_tier")
    # Bảng append-only: tạm tắt trigger để bỏ các dòng tier_up/tier_down rồi dựng lại enum cũ.
    op.execute(
        "ALTER TABLE verification_decisions DISABLE TRIGGER verification_decisions_append_only"
    )
    op.execute("DELETE FROM verification_decisions WHERE decision IN ('tier_up', 'tier_down')")
    op.execute(
        "ALTER TABLE verification_decisions ENABLE TRIGGER verification_decisions_append_only"
    )
    # CHECK reason_required so sánh cột decision với enum → bỏ trước khi đổi kiểu, dựng lại sau.
    op.drop_constraint(
        op.f("ck_verification_decisions_reason_required"), "verification_decisions", type_="check"
    )
    op.execute("ALTER TYPE verification_decision RENAME TO verification_decision_old")
    values = ", ".join(f"'{v}'" for v in OLD_DECISIONS)
    op.execute(f"CREATE TYPE verification_decision AS ENUM ({values})")
    op.execute(
        "ALTER TABLE verification_decisions ALTER COLUMN decision TYPE verification_decision "
        "USING decision::text::verification_decision"
    )
    op.execute("DROP TYPE verification_decision_old")
    op.create_check_constraint(
        op.f("ck_verification_decisions_reason_required"),
        "verification_decisions",
        "decision NOT IN ('reject', 'request_info')"
        " OR (reason IS NOT NULL AND length(btrim(reason)) > 0)",
    )
    op.drop_constraint(op.f("ck_companies_verification_tier_range"), "companies", type_="check")
    op.drop_column("companies", "tier_expires_at")
    op.drop_column("companies", "tier_reviewed_at")
    op.drop_column("companies", "verification_tier")
