"""rfqs.kind: loại Request (báo giá, meeting, đóng gói, chất lượng, khác) (N4)

Revision ID: 0058
Revises: 0057
Create Date: 2026-10-03 15:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0058"
down_revision: str | None = "0057"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

KIND = sa.Enum("quote", "meeting", "packaging", "quality", "other", name="rfq_kind")


def upgrade() -> None:
    KIND.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "rfqs",
        sa.Column(
            "kind",
            sa.Enum(
                "quote",
                "meeting",
                "packaging",
                "quality",
                "other",
                name="rfq_kind",
                create_type=False,
            ),
            server_default="quote",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("rfqs", "kind")
    KIND.drop(op.get_bind(), checkfirst=True)
