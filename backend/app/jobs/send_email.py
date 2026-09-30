"""Job gửi email: giải quyết người nhận và ngôn ngữ từ DB rồi giao qua NotificationChannel (H2)."""

import logging
from typing import Any

from procrastinate import RetryStrategy

from app.core.channels import get_channel
from app.core.db import get_sessionmaker
from app.jobs.app import app
from app.modules.notifications.service import deliver

log = logging.getLogger(__name__)


@app.task(name="send_email", retry=RetryStrategy(max_attempts=5, wait=60))
async def send_email(payload: dict[str, Any]) -> None:
    async with get_sessionmaker()() as session:
        await deliver(session, payload, get_channel())
