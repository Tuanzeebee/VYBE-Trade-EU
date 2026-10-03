"""Job kiểm tự động (U21, ADR-0003): VIES/GLEIF, email/domain, website, định vị. Chỉ ghi tín hiệu
vào verification_checks, không đổi trạng thái xác minh."""

import uuid

from procrastinate import RetryStrategy

from app.core.db import get_sessionmaker
from app.jobs.app import app
from app.modules.verification.checks_service import run_checks


@app.task(name="run_verification_checks", retry=RetryStrategy(max_attempts=2, wait=120))
async def run_verification_checks(company_id: str) -> None:
    async with get_sessionmaker()() as session:
        await run_checks(session, uuid.UUID(company_id))
