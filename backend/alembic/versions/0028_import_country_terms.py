"""import_country_terms: VAT nhập khẩu và lưu ý theo (mã HS, nước EU)

Revision ID: 0028
Revises: 0027
Create Date: 2026-09-30 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0028"
down_revision: str | None = "0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "import_country_terms",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("hs_code", sa.String(length=8), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False),
        sa.Column("vat_rate", sa.Numeric(precision=7, scale=4), nullable=False),
        sa.Column("label_languages", sa.String(length=64), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("note_en", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "country ~ '^[A-Z]{2}$'", name=op.f("ck_import_country_terms_country_iso2")
        ),
        sa.CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)",
            name=op.f("ck_import_country_terms_reviewed_by_and_at_together"),
        ),
        sa.CheckConstraint(
            "valid_until IS NULL OR valid_until > valid_from",
            name=op.f("ck_import_country_terms_valid_window"),
        ),
        sa.CheckConstraint(
            "vat_rate BETWEEN 0 AND 100", name=op.f("ck_import_country_terms_vat_is_percentage")
        ),
        sa.ForeignKeyConstraint(
            ["hs_code"], ["hs_codes.code"], name=op.f("fk_import_country_terms_hs_code_hs_codes")
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"], ["users.id"], name=op.f("fk_import_country_terms_reviewed_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_import_country_terms")),
        sa.UniqueConstraint("hs_code", "country", "valid_from", name="hs_country_from"),
    )
    op.create_index(
        op.f("ix_import_country_terms_hs_code"), "import_country_terms", ["hs_code"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_import_country_terms_hs_code"), table_name="import_country_terms")
    op.drop_table("import_country_terms")
