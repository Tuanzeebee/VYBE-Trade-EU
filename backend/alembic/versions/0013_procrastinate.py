"""Bảng của Procrastinate (hàng đợi job nền trên Postgres)

Revision ID: 0013
Revises: 0012
Create Date: 2026-09-29
"""

from collections.abc import Sequence

from procrastinate.schema import SchemaManager
from sqlalchemy.util import await_only

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _execute_script(sql: str) -> None:
    """Chạy script nhiều câu lệnh (schema.sql của Procrastinate có hàm plpgsql, kiểu, trigger).

    asyncpg chỉ nhận nhiều câu lệnh qua giao thức đơn giản, mà SQLAlchemy luôn prepare từng câu;
    nên lấy kết nối asyncpg thật và chạy nguyên script trong cùng transaction của migration.
    """
    driver_connection = op.get_bind().connection.driver_connection
    await_only(driver_connection.execute(sql))  # type: ignore[union-attr]


def upgrade() -> None:
    _execute_script(SchemaManager.get_schema())


def downgrade() -> None:
    # Xóa mọi bảng, hàm và kiểu procrastinate_* (số hàm/kiểu đổi theo phiên bản nên quét theo tên).
    _execute_script(
        r"""
        DROP TABLE IF EXISTS procrastinate_events, procrastinate_periodic_defers,
            procrastinate_workers, procrastinate_jobs CASCADE;
        DO $$
        DECLARE r record;
        BEGIN
            FOR r IN
                SELECT p.oid::regprocedure AS sig FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = current_schema() AND p.proname LIKE 'procrastinate\_%'
            LOOP
                EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
            END LOOP;
            FOR r IN
                SELECT t.typname FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = current_schema() AND t.typname LIKE 'procrastinate\_%'
                  AND t.typtype IN ('e', 'c')
                  AND (t.typrelid = 0
                       OR (SELECT relkind FROM pg_class WHERE oid = t.typrelid) = 'c')
            LOOP
                EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
            END LOOP;
        END $$;
        """
    )
