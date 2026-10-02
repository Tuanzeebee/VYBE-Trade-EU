"""Job hằng ngày: tính lại huy hiệu EVFTA-verified theo nhóm hàng, hạ mức khi bằng chứng hết hạn
(SPEC_compliance_data_20_codes §5.4). Mỗi lần cấp/hạ ghi audit_logs."""

import datetime as dt
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from app.jobs.app import app
from app.modules.compliance.badge import refresh_badges

log = logging.getLogger(__name__)


async def run_compliance_badges(session: AsyncSession, now: dt.datetime) -> int:
    """Thân job (nhận session và giờ để test được). Trả số huy hiệu đổi trạng thái."""
    return await refresh_badges(session, now)


@app.periodic(cron="45 2 * * *")  # 02:45 mỗi ngày (UTC), sau verification_expiry
@app.task(name="compliance_badges", queueing_lock="compliance_badges")
async def compliance_badges(timestamp: int) -> None:
    async with get_sessionmaker()() as session:
        changed = await run_compliance_badges(session, dt.datetime.now(dt.UTC))
    log.info("compliance_badges: %d huy hiệu đổi trạng thái", changed)
