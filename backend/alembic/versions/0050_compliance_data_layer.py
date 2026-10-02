"""SPEC_compliance_data_20_codes: lớp dữ liệu tuân thủ cho 20 mã Chương 3/7/8 (C1, C4, C6)

Bảng mới: staging_categories, hs_code_compliance, roo_questions, compliance_evidence_types,
compliance_evidence_requirements. Mở rộng tariff_lines, product_specific_rules (6 rule_type mới +
params), compliance_checks (review_state). Tên compliance_evidence_* vì evidence_types đã thuộc
module verification.

Revision ID: 0050
Revises: 0049
Create Date: 2026-10-02 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0050"
down_revision: str | None = "0049"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_RULE_TYPES = (
    "WO_PRODUCT",
    "WO_PRODUCT_VESSEL",
    "WO_MATERIALS",
    "WO_MATERIALS_VESSEL",
    "WO_MATERIALS_TOLERANCE",
    "WO_MATERIALS_SUGAR_CAP",
)
ENUMS = (
    "evidence_layer",
    "evidence_scope",
    "evidence_blocks",
    "evidence_legal_status",
    "evidence_condition",
)


def upgrade() -> None:
    for value in NEW_RULE_TYPES:
        op.execute(f"ALTER TYPE rule_type ADD VALUE IF NOT EXISTS '{value}'")
    op.drop_constraint(
        op.f("ck_product_specific_rules_threshold_matches_rule_type"),
        "product_specific_rules",
        type_="check",
    )
    op.create_check_constraint(
        op.f("ck_product_specific_rules_threshold_matches_rule_type"),
        "product_specific_rules",
        "(rule_type IN ('MaxNOM', 'CTH_OR_MaxNOM')"
        " AND threshold_pct IS NOT NULL AND threshold_pct > 0 AND threshold_pct <= 100)"
        " OR (rule_type NOT IN ('MaxNOM', 'CTH_OR_MaxNOM') AND threshold_pct IS NULL)",
    )
    op.create_table(
        "staging_categories",
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("stages", sa.SmallInteger(), nullable=False),
        sa.Column("zero_from", sa.Date(), nullable=False),
        sa.Column("data_version", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint("stages >= 1", name=op.f("ck_staging_categories_stages_positive")),
        sa.PrimaryKeyConstraint("code", name=op.f("pk_staging_categories")),
    )
    op.create_table(
        "compliance_evidence_types",
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column(
            "layer",
            sa.Enum(
                "TARIFF", "ORIGIN_RECORD", "MARKET_ACCESS", "PLATFORM_BADGE", name="evidence_layer"
            ),
            nullable=False,
        ),
        sa.Column("scope", sa.Enum("SHIPMENT", "COMPANY", name="evidence_scope"), nullable=False),
        sa.Column("name_vi", sa.String(length=255), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=True),
        sa.Column("issuer_vi", sa.String(length=255), nullable=True),
        sa.Column("validity_months", sa.SmallInteger(), nullable=True),
        sa.Column("retention_years", sa.SmallInteger(), nullable=True),
        sa.Column(
            "blocks",
            sa.Enum("TARIFF_PREFERENCE", "IMPORT", "NONE", name="evidence_blocks"),
            nullable=False,
        ),
        sa.Column("legal_basis", sa.Text(), nullable=True),
        sa.Column(
            "legal_status",
            sa.Enum("VERIFIED", "TO_VERIFY", "PLATFORM_RULE", name="evidence_legal_status"),
            nullable=False,
        ),
        sa.Column("source", sa.String(length=1024), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("data_version", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_compliance_evidence_types_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"],
            ["users.id"],
            name=op.f("fk_compliance_evidence_types_reviewed_by_users"),
        ),
        sa.PrimaryKeyConstraint("code", name=op.f("pk_compliance_evidence_types")),
    )
    op.create_table(
        "hs_code_compliance",
        sa.Column("hs_code", sa.String(length=8), nullable=False),
        sa.Column("cn_code_current", sa.String(length=8), nullable=True),
        sa.Column(
            "cn_mapping_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("product_group_vi", sa.String(length=255), nullable=True),
        sa.Column("evidence_group", sa.String(length=32), nullable=True),
        sa.Column("data_version", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["hs_code"], ["hs_codes.code"], name=op.f("fk_hs_code_compliance_hs_code_hs_codes")
        ),
        sa.PrimaryKeyConstraint("hs_code", name=op.f("pk_hs_code_compliance")),
    )
    op.create_table(
        "roo_questions",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("hs_code", sa.String(length=8), nullable=False),
        sa.Column("position", sa.SmallInteger(), nullable=False),
        sa.Column("text_vi", sa.Text(), nullable=False),
        sa.Column("text_en", sa.Text(), nullable=True),
        sa.Column("data_version", sa.String(length=32), nullable=True),
        sa.ForeignKeyConstraint(
            ["hs_code"], ["hs_codes.code"], name=op.f("fk_roo_questions_hs_code_hs_codes")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roo_questions")),
        sa.UniqueConstraint("hs_code", "position", name=op.f("uq_roo_questions_hs_code_position")),
    )
    op.create_index(op.f("ix_roo_questions_hs_code"), "roo_questions", ["hs_code"], unique=False)
    op.create_table(
        "compliance_evidence_requirements",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("hs_code", sa.String(length=8), nullable=False),
        sa.Column("evidence_type", sa.String(length=40), nullable=False),
        sa.Column(
            "condition",
            sa.Enum(
                "ALWAYS",
                "CONSIGNMENT_GT_6000",
                "CONSIGNMENT_LE_6000",
                "IF_TRANSIT_THIRD_COUNTRY",
                "IF_WILD_CAUGHT",
                "IF_AQUACULTURE",
                "IF_LISTED_2019_1793",
                "IF_NOT_PHYTO_EXEMPT",
                "IF_FRESH_AND_NOT_PHYTO_EXEMPT",
                name="evidence_condition",
            ),
            nullable=False,
        ),
        sa.Column("source", sa.String(length=1024), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("data_version", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_compliance_evidence_requirements_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["evidence_type"],
            ["compliance_evidence_types.code"],
            name=op.f(
                "fk_compliance_evidence_requirements_evidence_type_compliance_evidence_types"
            ),
        ),
        sa.ForeignKeyConstraint(
            ["hs_code"],
            ["hs_codes.code"],
            name=op.f("fk_compliance_evidence_requirements_hs_code_hs_codes"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"],
            ["users.id"],
            name=op.f("fk_compliance_evidence_requirements_reviewed_by_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_compliance_evidence_requirements")),
        sa.UniqueConstraint(
            "hs_code",
            "evidence_type",
            "condition",
            "valid_from",
            name=op.f("uq_compliance_evidence_requirements_hs_type_condition_from"),
        ),
    )
    op.create_index(
        op.f("ix_compliance_evidence_requirements_hs_code"),
        "compliance_evidence_requirements",
        ["hs_code"],
        unique=False,
    )
    op.add_column(
        "compliance_checks", sa.Column("review_state", sa.String(length=16), nullable=True)
    )
    op.add_column(
        "compliance_checks",
        sa.Column("unreviewed_components", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "compliance_checks", sa.Column("data_version", sa.String(length=32), nullable=True)
    )
    op.add_column(
        "product_specific_rules",
        sa.Column("params", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("product_specific_rules", sa.Column("rule_text_en", sa.Text(), nullable=True))
    op.add_column(
        "product_specific_rules", sa.Column("insufficient_operations_vi", sa.Text(), nullable=True)
    )
    op.add_column(
        "product_specific_rules", sa.Column("tolerance_note_vi", sa.Text(), nullable=True)
    )
    op.add_column("product_specific_rules", sa.Column("risk_note_vi", sa.Text(), nullable=True))
    op.add_column(
        "product_specific_rules", sa.Column("requires_expert_reason", sa.Text(), nullable=True)
    )
    op.add_column(
        "product_specific_rules", sa.Column("data_version", sa.String(length=32), nullable=True)
    )
    op.add_column(
        "tariff_lines", sa.Column("base_rate", sa.Numeric(precision=7, scale=4), nullable=True)
    )
    op.add_column("tariff_lines", sa.Column("mfn_source", sa.String(length=24), nullable=True))
    op.add_column(
        "tariff_lines",
        sa.Column(
            "mfn_verified_taric", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
    )
    op.add_column("tariff_lines", sa.Column("data_version", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("tariff_lines", "data_version")
    op.drop_column("tariff_lines", "mfn_verified_taric")
    op.drop_column("tariff_lines", "mfn_source")
    op.drop_column("tariff_lines", "base_rate")
    for col in (
        "data_version",
        "requires_expert_reason",
        "risk_note_vi",
        "tolerance_note_vi",
        "insufficient_operations_vi",
        "rule_text_en",
        "params",
    ):
        op.drop_column("product_specific_rules", col)
    for col in ("data_version", "unreviewed_components", "review_state"):
        op.drop_column("compliance_checks", col)
    op.drop_table("compliance_evidence_requirements")
    op.drop_table("roo_questions")
    op.drop_table("hs_code_compliance")
    op.drop_table("compliance_evidence_types")
    op.drop_table("staging_categories")
    for name in ENUMS:
        op.execute(f"DROP TYPE IF EXISTS {name}")
    # Giá trị enum rule_type đã thêm không gỡ được trong PostgreSQL; vô hại khi để lại,
    # ràng buộc threshold cũ được khôi phục bên dưới (dòng dùng rule_type mới phải xoá trước).
    op.drop_constraint(
        op.f("ck_product_specific_rules_threshold_matches_rule_type"),
        "product_specific_rules",
        type_="check",
    )
    op.create_check_constraint(
        op.f("ck_product_specific_rules_threshold_matches_rule_type"),
        "product_specific_rules",
        "(rule_type IN ('MaxNOM', 'CTH_OR_MaxNOM')"
        " AND threshold_pct IS NOT NULL AND threshold_pct > 0 AND threshold_pct <= 100)"
        " OR (rule_type IN ('WO', 'CTH') AND threshold_pct IS NULL)",
    )
