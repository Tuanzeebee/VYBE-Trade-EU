"""Job hằng ngày: hạ xác minh của công ty đã hết hạn (I7)."""

import datetime as dt
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from app.jobs.app import app
from app.modules.verification.service import expire_due

log = logging.getLogger(__name__)


async def run_verification_expiry(session: AsyncSession, now: dt.datetime) -> int:
    """Thân job (nhận session và giờ để test được). Trả số công ty bị hạ."""
    return await expire_due(session, now)


@app.periodic(cron="15 2 * * *")  # 02:15 mỗi ngày (UTC)
@app.task(name="verification_expiry", queueing_lock="verification_expiry")
async def verification_expiry(timestamp: int) -> None:
    async with get_sessionmaker()() as session:
        count = await run_verification_expiry(session, dt.datetime.now(dt.UTC))
    log.info("verification_expiry: đã hạ %d công ty hết hạn", count)
