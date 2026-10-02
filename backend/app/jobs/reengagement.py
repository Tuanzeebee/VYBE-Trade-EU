"""Job hằng ngày: thông báo trong ứng dụng kéo người dùng vắng 7–30 ngày quay lại (J4)."""

import datetime as dt
import logging

from app.core.db import get_sessionmaker
from app.jobs.app import app
from app.modules.notifications.reengagement import run_reengagement

log = logging.getLogger(__name__)


@app.periodic(cron="30 8 * * *")  # 08:30 mỗi ngày (UTC)
@app.task(name="reengagement", queueing_lock="reengagement")
async def reengagement(timestamp: int) -> None:
    async with get_sessionmaker()() as session:
        count = await run_reengagement(session, dt.datetime.now(dt.UTC))
    log.info("reengagement: đã tạo %d thông báo tổng hợp", count)
