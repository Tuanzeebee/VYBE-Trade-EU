"""audit_logs append-only + hàm forbid_mutation() dùng chung.

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action_type", sa.String(64), nullable=False),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("entity_id", sa.String(64), nullable=False),
        sa.Column("before_state", postgresql.JSONB(), nullable=True),
        sa.Column("after_state", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_audit_logs"),
    )
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"])
    # Dùng lại cho compliance_checks, verification_decisions, ai_queries.
    op.execute(
        """
        CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'append-only table: %', TG_TABLE_NAME;
        END $$;
        """
    )
    op.execute(
        "CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs "
        "FOR EACH ROW EXECUTE FUNCTION forbid_mutation()"
    )
    op.execute(
        "CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON audit_logs "
        "FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation()"
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.execute("DROP FUNCTION IF EXISTS forbid_mutation()")
