"""Chỉ mục tìm kiếm danh bạ công khai (E2): trigram không dấu cho tên công ty và sản phẩm

Revision ID: 0022
Revises: 0021
Create Date: 2026-09-30
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0022"
down_revision: str | None = "0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX ix_companies_legal_name_trgm ON companies "
        "USING gin (immutable_unaccent(lower(legal_name)) gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_companies_directory ON companies (legal_name, id) "
        "WHERE verification_status = 'verified' AND NOT is_hidden"
    )
    op.execute(
        "CREATE INDEX ix_products_name_trgm ON products "
        "USING gin (immutable_unaccent(lower(name)) gin_trgm_ops)"
    )
    op.execute("CREATE INDEX ix_products_company_hs ON products (company_id, hs_code)")


def downgrade() -> None:
    op.execute("DROP INDEX ix_products_company_hs")
    op.execute("DROP INDEX ix_products_name_trgm")
    op.execute("DROP INDEX ix_companies_directory")
    op.execute("DROP INDEX ix_companies_legal_name_trgm")
