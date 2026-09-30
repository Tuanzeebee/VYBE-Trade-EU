"""hs_codes (B4): danh mục mã HS + hàm immutable_unaccent + chỉ mục tìm kiếm.

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-29
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # unaccent() chỉ STABLE nên không dùng được trong chỉ mục; bọc lại thành IMMUTABLE.
    op.execute(
        """
        CREATE FUNCTION immutable_unaccent(text) RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
        $$ SELECT public.unaccent('public.unaccent', $1) $$
        """
    )
    op.create_table(
        "hs_codes",
        sa.Column("code", sa.String(length=8), nullable=False),
        sa.Column("name_vi", sa.String(length=255), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("chapter", sa.String(length=2), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=True),
        sa.Column(
            "is_calculator_supported", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("code ~ '^[0-9]{6,8}$'", name=op.f("ck_hs_codes_code_format")),
        sa.CheckConstraint(
            "chapter = left(code, 2)", name=op.f("ck_hs_codes_chapter_matches_code")
        ),
        sa.PrimaryKeyConstraint("code", name=op.f("pk_hs_codes")),
    )
    op.create_index(op.f("ix_hs_codes_category"), "hs_codes", ["category"], unique=False)
    # Chỉ mục biểu thức — Alembic không tự sinh; phải khớp đúng biểu thức trong catalog/service.py.
    op.execute(
        "CREATE INDEX ix_hs_codes_name_vi_trgm ON hs_codes "
        "USING gin (immutable_unaccent(lower(name_vi)) gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_hs_codes_name_en_trgm ON hs_codes USING gin (lower(name_en) gin_trgm_ops)"
    )
    op.execute("CREATE INDEX ix_hs_codes_code_prefix ON hs_codes (code text_pattern_ops)")


def downgrade() -> None:
    op.drop_table("hs_codes")  # kéo theo các chỉ mục của bảng
    op.execute("DROP FUNCTION IF EXISTS immutable_unaccent(text)")
