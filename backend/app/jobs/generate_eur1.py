"""Job sinh bản nháp EUR.1 (C5): dựng PDF, ghi lên Storage, audit document.generate."""

import uuid

from procrastinate import RetryStrategy

from app.core.db import get_sessionmaker
from app.core.storage import get_storage
from app.jobs.app import app
from app.modules.compliance.documents import generate_document


@app.task(name="generate_eur1", retry=RetryStrategy(max_attempts=3, wait=30))
async def generate_eur1(document_id: str) -> None:
    async with get_sessionmaker()() as session:
        await generate_document(session, get_storage(), uuid.UUID(document_id))
