"""Hàng đợi job nền trên Postgres (Procrastinate, AGENTS.md §2).

Chạy worker: `uv run procrastinate --app=app.jobs.app.app worker`
Job định kỳ (periodic) chỉ được đẩy khi worker chạy. Bảng của Procrastinate tạo ở migration 0013.
"""

from procrastinate import App, PsycopgConnector

from app.core.config import get_settings


def conninfo_from_url(url: str) -> str:
    """URL SQLAlchemy (postgresql+asyncpg://…) → conninfo cho psycopg (postgresql://…)."""
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


app = App(
    connector=PsycopgConnector(conninfo=conninfo_from_url(get_settings().database_url)),
    import_paths=[
        "app.jobs.verification_expiry",
        "app.jobs.send_email",
        "app.jobs.generate_eur1",
        "app.jobs.translate_product",
        "app.jobs.import_trade_stats",
        "app.jobs.generate_market_report",
    ],
)
