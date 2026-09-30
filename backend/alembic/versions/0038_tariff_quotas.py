"""tariff_quotas (U13): hạn ngạch thuế quan, phân nhóm sản phẩm, kịch bản trong/ngoài hạn ngạch

AGENTS.md §6.4 (sửa đổi 01/10/2026 — cần luật TM ký trước khi dùng dữ liệu thật ở production):
chỉ trả kịch bản khi có dòng tariff_quotas ĐÃ DUYỆT và phân nhóm người dùng chọn nằm trong danh sách
phân nhóm đủ điều kiện ĐÃ DUYỆT. Mọi trường hợp khác → needs_review, không số.

- product_subtypes: phân nhóm (vd gạo thơm theo danh sách giống, gạo xay xát, gạo tấm…).
- tariff_quotas: một hạn ngạch theo (hiệp định, nơi đến, tiền tố HS, năm) với thuế trong / ngoài hạn
  ngạch (theo % hoặc tuyệt đối trên đơn vị).
- tariff_quota_subtypes: phân nhóm đủ điều kiện của từng hạn ngạch.
- compliance_checks: data_status, scenario (JSON đầu vào kịch bản); CHECK trạng thái thêm
  'quota_scenarios' cho loại tariff.
- is_demo có sẵn trên hai bảng mới (U14 dùng).

Revision ID: 0038
Revises: 0037
Create Date: 2026-10-02 10:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0038"
down_revision: str | None = "0037"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_OLD_STATUS = (
    "(check_type = 'tariff' AND status IN ('ok', 'unsupported', 'needs_review'))"
    " OR (check_type = 'roo'"
    " AND status IN ('pass', 'fail', 'inconclusive', 'unsupported'))"
)
_NEW_STATUS = (
    "(check_type = 'tariff'"
    " AND status IN ('ok', 'unsupported', 'needs_review', 'quota_scenarios'))"
    " OR (check_type = 'roo'"
    " AND status IN ('pass', 'fail', 'inconclusive', 'unsupported'))"
)


# NULL trong CHECK được coi là đạt → phải ghi rõ IS NOT NULL.
AD_VALOREM_CHECK = (
    "(in_quota_duty_type <> 'ad_valorem'"
    " OR (in_quota_rate IS NOT NULL AND in_quota_rate BETWEEN 0 AND 100))"
    " AND (out_quota_duty_type <> 'ad_valorem'"
    " OR (out_quota_rate IS NOT NULL AND out_quota_rate BETWEEN 0 AND 100))"
)
SPECIFIC_CHECK = (
    "(in_quota_duty_type <> 'specific'"
    " OR (in_quota_specific IS NOT NULL AND in_quota_specific >= 0 AND specific_unit IS NOT NULL))"
    " AND (out_quota_duty_type <> 'specific'"
    " OR (out_quota_specific IS NOT NULL AND out_quota_specific >= 0"
    " AND specific_unit IS NOT NULL))"
)


def _review_columns() -> list[sa.Column[object]]:
    return [
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
    ]


def upgrade() -> None:
    duty_type = postgresql.ENUM(name="duty_type", create_type=False)
    op.create_table(
        "product_subtypes",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("hs_prefix", sa.String(length=8), nullable=False),
        sa.Column("name_vi", sa.String(length=255), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("description_vi", sa.Text(), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        *_review_columns(),
        sa.CheckConstraint(
            "code ~ '^[a-z0-9_]{2,40}$'", name=op.f("ck_product_subtypes_code_format")
        ),
        sa.CheckConstraint(
            "hs_prefix ~ '^[0-9]{4,8}$'", name=op.f("ck_product_subtypes_hs_prefix_format")
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_product_subtypes_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_product_subtypes_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_subtypes")),
        sa.UniqueConstraint("code", name=op.f("uq_product_subtypes_code")),
    )
    op.create_table(
        "tariff_quotas",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("agreement_code", sa.String(length=16), nullable=False),
        sa.Column("destination", sa.String(length=2), nullable=False),
        sa.Column("hs_prefix", sa.String(length=8), nullable=False),
        sa.Column("quota_code", sa.String(length=32), nullable=True),
        sa.Column("quota_year", sa.SmallInteger(), nullable=True),
        sa.Column("volume", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("volume_unit", sa.String(length=16), server_default="tonne", nullable=False),
        sa.Column("in_quota_duty_type", duty_type, nullable=False),
        sa.Column("in_quota_rate", sa.Numeric(precision=7, scale=4), nullable=True),
        sa.Column("in_quota_specific", sa.Numeric(precision=12, scale=4), nullable=True),
        sa.Column("out_quota_duty_type", duty_type, nullable=False),
        sa.Column("out_quota_rate", sa.Numeric(precision=7, scale=4), nullable=True),
        sa.Column("out_quota_specific", sa.Numeric(precision=12, scale=4), nullable=True),
        sa.Column("specific_unit", sa.String(length=16), nullable=True),
        sa.Column("licence_note_vi", sa.Text(), nullable=True),
        sa.Column("licence_note_en", sa.Text(), nullable=True),
        sa.Column("allocation_note_vi", sa.Text(), nullable=True),
        sa.Column("allocation_note_en", sa.Text(), nullable=True),
        sa.Column("source_url", sa.String(length=1024), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        *_review_columns(),
        sa.CheckConstraint(
            "destination ~ '^[A-Z]{2}$'", name=op.f("ck_tariff_quotas_destination_iso2")
        ),
        sa.CheckConstraint(
            "hs_prefix ~ '^[0-9]{4,8}$'", name=op.f("ck_tariff_quotas_hs_prefix_format")
        ),
        sa.CheckConstraint("volume > 0", name=op.f("ck_tariff_quotas_positive_volume")),
        sa.CheckConstraint(
            "volume_unit IN ('tonne', 'kg', 'piece', 'liter')",
            name=op.f("ck_tariff_quotas_volume_unit"),
        ),
        sa.CheckConstraint(
            AD_VALOREM_CHECK,
            name=op.f("ck_tariff_quotas_ad_valorem_has_rate"),
        ),
        sa.CheckConstraint(
            SPECIFIC_CHECK,
            name=op.f("ck_tariff_quotas_specific_has_amount"),
        ),
        sa.CheckConstraint(
            "valid_until IS NULL OR valid_until > valid_from",
            name=op.f("ck_tariff_quotas_valid_window"),
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_tariff_quotas_reviewed_by_and_at_together"),
        ),
        sa.ForeignKeyConstraint(
            ["agreement_code"],
            ["trade_agreements.code"],
            name=op.f("fk_tariff_quotas_agreement_code_trade_agreements"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_tariff_quotas_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tariff_quotas")),
    )
    op.create_index(
        "ix_tariff_quotas_lookup", "tariff_quotas", ["agreement_code", "destination", "hs_prefix"]
    )
    op.create_table(
        "tariff_quota_subtypes",
        sa.Column("quota_id", sa.Uuid(), nullable=False),
        sa.Column("subtype_code", sa.String(length=40), nullable=False),
        sa.ForeignKeyConstraint(
            ["quota_id"],
            ["tariff_quotas.id"],
            name=op.f("fk_tariff_quota_subtypes_quota_id_tariff_quotas"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["subtype_code"],
            ["product_subtypes.code"],
            name=op.f("fk_tariff_quota_subtypes_subtype_code_product_subtypes"),
        ),
        sa.PrimaryKeyConstraint("quota_id", "subtype_code", name=op.f("pk_tariff_quota_subtypes")),
    )
    op.add_column(
        "compliance_checks", sa.Column("data_status", sa.String(length=24), nullable=True)
    )
    op.add_column(
        "compliance_checks",
        sa.Column("scenario", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.drop_constraint(
        op.f("ck_compliance_checks_status_matches_type"), "compliance_checks", type_="check"
    )
    op.create_check_constraint(
        op.f("ck_compliance_checks_status_matches_type"), "compliance_checks", _NEW_STATUS
    )


def downgrade() -> None:
    # compliance_checks là append-only (trigger chặn UPDATE/DELETE): bản ghi quota_scenarios còn lại
    # sẽ làm CHECK cũ thất bại — hạ cấp chỉ chạy được trên DB chưa có lần tính kịch bản hạn ngạch.
    op.drop_constraint(
        op.f("ck_compliance_checks_status_matches_type"), "compliance_checks", type_="check"
    )
    op.create_check_constraint(
        op.f("ck_compliance_checks_status_matches_type"), "compliance_checks", _OLD_STATUS
    )
    op.drop_column("compliance_checks", "scenario")
    op.drop_column("compliance_checks", "data_status")
    op.drop_table("tariff_quota_subtypes")
    op.drop_index("ix_tariff_quotas_lookup", table_name="tariff_quotas")
    op.drop_table("tariff_quotas")
    op.drop_table("product_subtypes")
