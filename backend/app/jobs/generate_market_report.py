"""Job dựng báo cáo go-to-market (U18): chỉ số → lời văn (model hoặc mẫu) → PDF lên Storage."""

import uuid

from procrastinate import RetryStrategy

from app.core.db import get_sessionmaker
from app.core.storage import get_storage
from app.jobs.app import app
from app.modules.markets.report_service import run_report


@app.task(name="generate_market_report", retry=RetryStrategy(max_attempts=2, wait=60))
async def generate_market_report(report_id: str) -> None:
    async with get_sessionmaker()() as session:
        await run_report(session, get_storage(), uuid.UUID(report_id))
