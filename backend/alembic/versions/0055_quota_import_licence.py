"""Cách phân bổ hạn ngạch: thêm IMPORT_LICENCE (giấy phép nhập khẩu do cơ quan nước nhập cấp)

Revision ID: 0055
Revises: 0054
Create Date: 2026-10-03 09:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0055"
down_revision: str | None = "0054"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NAME = "allocation_method_values"  # tiền tố ck_tariff_quotas_ do naming convention thêm
OLD = (
    "allocation_method IS NULL OR allocation_method IN "
    "('IMPORTER_FIRST_COME', 'EXPORT_LICENCE', 'ALLOCATION', 'OTHER')"
)
NEW = (
    "allocation_method IS NULL OR allocation_method IN "
    "('IMPORTER_FIRST_COME', 'IMPORT_LICENCE', 'EXPORT_LICENCE', 'ALLOCATION', 'OTHER')"
)


def upgrade() -> None:
    op.drop_constraint(NAME, "tariff_quotas", type_="check")
    op.create_check_constraint(NAME, "tariff_quotas", NEW)


def downgrade() -> None:
    op.execute(
        "UPDATE tariff_quotas SET allocation_method = 'OTHER' "
        "WHERE allocation_method = 'IMPORT_LICENCE'"
    )
    op.drop_constraint(NAME, "tariff_quotas", type_="check")
    op.create_check_constraint(NAME, "tariff_quotas", OLD)
