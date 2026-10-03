"""product_ext (U3): OEM/thương hiệu riêng, bậc giá theo số lượng, quy cách đóng gói, cờ dịch máy

Revision ID: 0031
Revises: 0030
Create Date: 2026-10-01 11:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0031"
down_revision: str | None = "0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_COLUMNS: list[sa.Column[object]] = [
    sa.Column("brand_model", sa.String(length=16), nullable=True),
    sa.Column("description_source_lang", sa.String(length=2), nullable=True),
    sa.Column(
        "description_vi_machine", sa.Boolean(), server_default=sa.text("false"), nullable=False
    ),
    sa.Column(
        "description_en_machine", sa.Boolean(), server_default=sa.text("false"), nullable=False
    ),
]
_CHECKS = {
    "brand_model_known": "brand_model IS NULL OR brand_model IN ('oem', 'own_brand', 'both')",
    "source_lang_known": (
        "description_source_lang IS NULL OR description_source_lang IN ('vi', 'en')"
    ),
}


def upgrade() -> None:
    for column in _COLUMNS:
        op.add_column("products", column)
    for name, condition in _CHECKS.items():
        op.create_check_constraint(op.f(f"ck_products_{name}"), "products", condition)

    op.create_table(
        "product_packagings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("pack_size", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("pack_unit", sa.String(length=16), nullable=False),
        sa.Column("pack_type", sa.String(length=16), nullable=False),
        sa.Column("channel", sa.String(length=16), server_default="any", nullable=False),
        sa.Column("position", sa.SmallInteger(), nullable=False),
        sa.CheckConstraint("pack_size > 0", name=op.f("ck_product_packagings_pack_size_positive")),
        sa.CheckConstraint(
            "channel IN ('horeca', 'retail', 'industrial', 'any')",
            name=op.f("ck_product_packagings_channel_known"),
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_product_packagings_product_id_products"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_packagings")),
    )
    op.create_index(
        op.f("ix_product_packagings_product_id"), "product_packagings", ["product_id"], unique=False
    )

    op.create_table(
        "product_price_tiers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("min_quantity", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.CheckConstraint(
            "min_quantity > 0 AND unit_price > 0",
            name=op.f("ck_product_price_tiers_positive_amounts"),
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_product_price_tiers_product_id_products"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_price_tiers")),
        sa.UniqueConstraint(
            "product_id", "min_quantity", name=op.f("uq_product_price_tiers_product_id")
        ),
    )
    op.create_index(
        op.f("ix_product_price_tiers_product_id"),
        "product_price_tiers",
        ["product_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_product_price_tiers_product_id"), table_name="product_price_tiers")
    op.drop_table("product_price_tiers")
    op.drop_index(op.f("ix_product_packagings_product_id"), table_name="product_packagings")
    op.drop_table("product_packagings")
    for name in _CHECKS:
        op.drop_constraint(op.f(f"ck_products_{name}"), "products", type_="check")
    for column in reversed(_COLUMNS):
        op.drop_column("products", column.name)
