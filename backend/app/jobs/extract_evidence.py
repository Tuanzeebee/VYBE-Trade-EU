"""Job AI đọc chứng nhận (U24): chỉ ghi gợi ý vào evidence_extractions, không đổi trạng thái."""

import uuid

from procrastinate import RetryStrategy

from app.core.db import get_sessionmaker
from app.core.storage import get_storage
from app.jobs.app import app
from app.modules.verification.extraction_service import run_extraction


@app.task(name="extract_evidence", retry=RetryStrategy(max_attempts=2, wait=60))
async def extract_evidence(evidence_id: str) -> None:
    async with get_sessionmaker()() as session:
        await run_extraction(session, get_storage(), uuid.UUID(evidence_id))
