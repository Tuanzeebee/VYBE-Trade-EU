"""profile_viewers (U9): "ai đã xem hồ sơ", tuỳ chọn ẩn danh của buyer, loại thông báo mới

- companies.hide_profile_views: buyer bật thì seller không thấy tên khi buyer xem hồ sơ.
- notification_type thêm profile_viewed, sector_alert (U14), order (U19).

Hạ cấp xoá thông báo thuộc ba loại mới rồi dựng lại enum cũ.

Revision ID: 0036
Revises: 0035
Create Date: 2026-10-01 22:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0036"
down_revision: str | None = "0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NEW = ("profile_viewed", "sector_alert", "order")


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column(
            "hide_profile_views", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
    )
    for value in _NEW:
        op.execute(f"ALTER TYPE notification_type ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    op.execute(
        "DELETE FROM notifications WHERE type::text IN ('profile_viewed', 'sector_alert', 'order')"
    )
    op.execute("ALTER TYPE notification_type RENAME TO notification_type_old")
    op.execute(
        "CREATE TYPE notification_type AS ENUM "
        "('message', 'rfq', 'verification_status', 'new_match', 'expiry_alert')"
    )
    op.execute(
        "ALTER TABLE notifications ALTER COLUMN type TYPE notification_type "
        "USING type::text::notification_type"
    )
    op.execute("DROP TYPE notification_type_old")
    op.drop_column("companies", "hide_profile_views")
