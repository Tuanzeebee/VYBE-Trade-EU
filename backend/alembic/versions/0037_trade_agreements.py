"""trade_agreements (U12): nhiều hiệp định FTA; tariff_lines.agreement_code (mặc định EVFTA)

- Bảng trade_agreements: danh sách FTA của Việt Nam. Dòng seed là BẢN NHÁP (reviewed_by NULL) —
  tên và nước đối tác chỉ để hiển thị; hiệp định nào áp dụng cho một thị trường luôn suy ra từ
  dòng thuế ĐÃ DUYỆT, không từ bảng này. Luật TM rà và duyệt (ngày hiệu lực, nguồn).
- tariff_lines.agreement_code NOT NULL DEFAULT 'EVFTA' (khóa ngoại tới trade_agreements.code):
  dữ liệu và file Excel cũ của luật TM vẫn nạp được. KHÔNG đổi tên cột evfta_rate_current.
- compliance_checks.agreement_code: hiệp định của lần tính (NULL với RoO / không có dữ liệu).

Revision ID: 0037
Revises: 0036
Create Date: 2026-10-02 08:00:00.000000
"""

import datetime as dt
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0037"
down_revision: str | None = "0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ASEAN = ["BN", "KH", "ID", "LA", "MY", "MM", "PH", "SG", "TH"]

# BẢN NHÁP — chưa duyệt. in_force_from chỉ điền cho EVFTA (theo bản nháp chuyên môn
# docs/roadmap/tariff_20_draft.csv); các hiệp định khác luật TM điền và duyệt.
AGREEMENTS: list[tuple[str, str, str, list[str], str | None]] = [
    ("EVFTA", "Hiệp định EVFTA (Việt Nam – EU)", "EU–Vietnam FTA (EVFTA)", ["EU"], "2020-08-01"),
    ("UKVFTA", "Hiệp định UKVFTA (Việt Nam – Anh)", "UK–Vietnam FTA (UKVFTA)", ["GB"], None),
    (
        "CPTPP",
        "Hiệp định CPTPP",
        "CPTPP",
        ["AU", "BN", "CA", "CL", "JP", "MY", "MX", "NZ", "PE", "SG", "GB"],
        None,
    ),
    (
        "RCEP",
        "Hiệp định RCEP",
        "RCEP",
        ["AU", "BN", "KH", "CN", "ID", "JP", "KR", "LA", "MY", "MM", "NZ", "PH", "SG", "TH"],
        None,
    ),
    ("VJEPA", "Hiệp định VJEPA (Việt Nam – Nhật Bản)", "Vietnam–Japan EPA (VJEPA)", ["JP"], None),
    ("AJCEP", "Hiệp định AJCEP (ASEAN – Nhật Bản)", "ASEAN–Japan CEP (AJCEP)", ["JP"], None),
    ("VKFTA", "Hiệp định VKFTA (Việt Nam – Hàn Quốc)", "Korea–Vietnam FTA (VKFTA)", ["KR"], None),
    ("AKFTA", "Hiệp định AKFTA (ASEAN – Hàn Quốc)", "ASEAN–Korea FTA (AKFTA)", ["KR"], None),
    ("ACFTA", "Hiệp định ACFTA (ASEAN – Trung Quốc)", "ASEAN–China FTA (ACFTA)", ["CN"], None),
    ("AIFTA", "Hiệp định AIFTA (ASEAN – Ấn Độ)", "ASEAN–India FTA (AIFTA)", ["IN"], None),
    (
        "AANZFTA",
        "Hiệp định AANZFTA (ASEAN – Úc – New Zealand)",
        "ASEAN–Australia–New Zealand FTA (AANZFTA)",
        ["AU", "NZ"],
        None,
    ),
    (
        "ATIGA",
        "Hiệp định ATIGA (thương mại hàng hóa ASEAN)",
        "ASEAN Trade in Goods (ATIGA)",
        _ASEAN,
        None,
    ),
    ("VCFTA", "Hiệp định VCFTA (Việt Nam – Chile)", "Vietnam–Chile FTA (VCFTA)", ["CL"], None),
    (
        "VN_EAEU",
        "Hiệp định Việt Nam – Liên minh Kinh tế Á Âu",
        "Vietnam–Eurasian Economic Union FTA",
        ["RU", "BY", "KZ", "AM", "KG"],
        None,
    ),
    (
        "AHKFTA",
        "Hiệp định AHKFTA (ASEAN – Hồng Kông)",
        "ASEAN–Hong Kong FTA (AHKFTA)",
        ["HK"],
        None,
    ),
    ("VIFTA", "Hiệp định VIFTA (Việt Nam – Israel)", "Vietnam–Israel FTA (VIFTA)", ["IL"], None),
    ("VN_UAE", "Hiệp định CEPA Việt Nam – UAE", "Vietnam–UAE CEPA", ["AE"], None),
]


DRAFT_NOTE = "Bản nháp — luật TM rà tên, nước đối tác, ngày hiệu lực và nguồn rồi duyệt."


def upgrade() -> None:
    table = op.create_table(
        "trade_agreements",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("name_vi", sa.String(length=255), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column(
            "partners",
            postgresql.ARRAY(sa.String(length=2)),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column("in_force_from", sa.Date(), nullable=True),
        sa.Column("source_url", sa.String(length=1024), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
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
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_trade_agreements_reviewed_by_and_at_together"),
        ),
        sa.CheckConstraint(
            "code ~ '^[A-Z0-9_]{2,16}$'", name=op.f("ck_trade_agreements_code_format")
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_trade_agreements_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_trade_agreements")),
        sa.UniqueConstraint("code", name=op.f("uq_trade_agreements_code")),
    )
    op.bulk_insert(
        table,
        [
            {
                "code": code,
                "name_vi": name_vi,
                "name_en": name_en,
                "partners": partners,
                "in_force_from": None if since is None else dt.date.fromisoformat(since),
                "note": DRAFT_NOTE,
            }
            for code, name_vi, name_en, partners, since in AGREEMENTS
        ],
    )
    op.add_column(
        "tariff_lines",
        sa.Column(
            "agreement_code",
            sa.String(length=16),
            server_default="EVFTA",
            nullable=False,
        ),
    )
    op.create_foreign_key(
        op.f("fk_tariff_lines_agreement_code_trade_agreements"),
        "tariff_lines",
        "trade_agreements",
        ["agreement_code"],
        ["code"],
    )
    op.create_index(
        "ix_tariff_lines_agreement_destination", "tariff_lines", ["agreement_code", "destination"]
    )
    op.add_column(
        "compliance_checks", sa.Column("agreement_code", sa.String(length=16), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("compliance_checks", "agreement_code")
    op.drop_index("ix_tariff_lines_agreement_destination", table_name="tariff_lines")
    op.drop_constraint(
        op.f("fk_tariff_lines_agreement_code_trade_agreements"), "tariff_lines", type_="foreignkey"
    )
    op.drop_column("tariff_lines", "agreement_code")
    op.drop_table("trade_agreements")
