"""direct_conversations (U7): hội thoại trực tiếp giữa hai công ty, không cần RFQ

- conversations.rfq_id cho phép NULL (hội thoại trực tiếp); hội thoại theo RFQ giữ nguyên.
- Mỗi cặp công ty có tối đa MỘT hội thoại trực tiếp (không phân biệt chiều): unique index trên
  (least(a, b), greatest(a, b)) WHERE rfq_id IS NULL.
- CHECK company_a_id <> company_b_id.

Hạ cấp XOÁ các hội thoại trực tiếp (và tin nhắn của chúng) vì schema cũ bắt buộc rfq_id.

Revision ID: 0034
Revises: 0033
Create Date: 2026-10-01 18:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0034"
down_revision: str | None = "0033"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("conversations", "rfq_id", existing_type=sa.Uuid(), nullable=True)
    op.create_check_constraint(
        op.f("ck_conversations_two_companies"), "conversations", "company_a_id <> company_b_id"
    )
    op.create_index(
        "uq_conversations_direct_pair",
        "conversations",
        [
            sa.text("least(company_a_id, company_b_id)"),
            sa.text("greatest(company_a_id, company_b_id)"),
        ],
        unique=True,
        postgresql_where=sa.text("rfq_id IS NULL"),
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM messages WHERE conversation_id IN "
        "(SELECT id FROM conversations WHERE rfq_id IS NULL)"
    )
    op.execute("DELETE FROM conversations WHERE rfq_id IS NULL")
    op.drop_index("uq_conversations_direct_pair", table_name="conversations")
    op.drop_constraint(op.f("ck_conversations_two_companies"), "conversations", type_="check")
    op.alter_column("conversations", "rfq_id", existing_type=sa.Uuid(), nullable=False)
