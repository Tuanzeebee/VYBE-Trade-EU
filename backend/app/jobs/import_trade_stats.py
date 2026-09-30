"""Job nạp thống kê thương mại từ Eurostat Comext (U15). Gọi mạng chỉ ở đây, không trong request."""

import uuid

from procrastinate import RetryStrategy

from app.core.db import get_sessionmaker
from app.core.trade_stats import EurostatComextSource
from app.jobs.app import app
from app.modules.markets.service import run_import


@app.task(name="import_trade_stats", retry=RetryStrategy(max_attempts=2, wait=300))
async def import_trade_stats(batch_id: str) -> None:
    async with get_sessionmaker()() as session:
        await run_import(session, uuid.UUID(batch_id), EurostatComextSource())
