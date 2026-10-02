"""notification_type thêm reengagement (J4): thông báo kéo người dùng quay lại

Revision ID: 0048
Revises: 0047
Create Date: 2026-10-05 10:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0048"
down_revision: str | None = "0047"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reengagement'")


def downgrade() -> None:
    op.execute("DELETE FROM notifications WHERE type::text = 'reengagement'")
    op.execute("ALTER TYPE notification_type RENAME TO notification_type_old")
    op.execute(
        "CREATE TYPE notification_type AS ENUM "
        "('message', 'rfq', 'verification_status', 'new_match', 'expiry_alert', "
        "'profile_viewed', 'sector_alert', 'order')"
    )
    op.execute(
        "ALTER TABLE notifications ALTER COLUMN type TYPE notification_type "
        "USING type::text::notification_type"
    )
    op.execute("DROP TYPE notification_type_old")
