"""Admin soát câu hỏi AI yếu (D3) và duyệt văn bản corpus (D1)."""

import datetime as dt
import random
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.copilot.models import (
    AiQuery,
    AiQueryFeedback,
    CorpusChunk,
    CorpusDocument,
    EscalationTicket,
)
from app.modules.copilot.schemas import AiQueryOut, CorpusDocumentOut

WEEK = dt.timedelta(days=7)


def _latest_feedback() -> Any:
    """Phản hồi MỚI NHẤT của mỗi câu hỏi: (query_id, was_helpful)."""
    return (
        select(AiQueryFeedback.query_id, AiQueryFeedback.was_helpful)
        .ext(distinct_on(AiQueryFeedback.query_id))
        .order_by(
            AiQueryFeedback.query_id,
            AiQueryFeedback.created_at.desc(),
            AiQueryFeedback.id.desc(),
        )
    )


async def _decorate(session: AsyncSession, rows: list[AiQuery]) -> list[AiQueryOut]:
    if not rows:
        return []
    ids = [r.id for r in rows]
    latest = _latest_feedback().where(AiQueryFeedback.query_id.in_(ids))
    helpful = {qid: value for qid, value in (await session.execute(latest)).all()}
    escalated = set(
        await session.scalars(
            select(EscalationTicket.query_id).where(EscalationTicket.query_id.in_(ids))
        )
    )
    out: list[AiQueryOut] = []
    for row in rows:
        item = AiQueryOut.model_validate(row)
        item.was_helpful = helpful.get(row.id)
        item.escalated = row.id in escalated
        out.append(item)
    return out


async def list_queries(
    session: AsyncSession,
    *,
    confidence: str | None,
    helpful: bool | None,
    limit: int,
    offset: int,
) -> list[AiQueryOut]:
    query = select(AiQuery)
    if confidence:
        query = query.where(AiQuery.confidence == confidence)
    if helpful is not None:
        newest = _latest_feedback().subquery()
        query = query.where(
            AiQuery.id.in_(select(newest.c.query_id).where(newest.c.was_helpful.is_(helpful)))
        )
    rows = await session.scalars(
        query.order_by(AiQuery.created_at.desc(), AiQuery.id.desc()).limit(limit).offset(offset)
    )
    return await _decorate(session, list(rows))


async def weekly_sample(
    session: AsyncSession,
    size: int,
    now: dt.datetime | None = None,
    rng: random.Random | None = None,
) -> list[AiQueryOut]:
    """Mẫu ngẫu nhiên 7 ngày qua để admin soát định kỳ (không chỉ soát câu bị đánh giá thấp)."""
    since = (now or dt.datetime.now(dt.UTC)) - WEEK
    rows = list(await session.scalars(select(AiQuery).where(AiQuery.created_at >= since)))
    picked = (rng or random.Random()).sample(rows, min(size, len(rows)))  # noqa: S311 — không phải mật mã
    return await _decorate(session, picked)


# ── Văn bản corpus ───────────────────────────────────────────────────────────
def _snapshot(doc: CorpusDocument) -> dict[str, Any]:
    return {
        "title": doc.title,
        "source": doc.source,
        "reviewed_by": str(doc.reviewed_by) if doc.reviewed_by else None,
    }


async def _chunk_counts(session: AsyncSession) -> dict[uuid.UUID, int]:
    rows = await session.execute(
        select(CorpusChunk.document_id, func.count()).group_by(CorpusChunk.document_id)
    )
    return {document_id: int(count) for document_id, count in rows.all()}


async def list_documents(session: AsyncSession) -> list[CorpusDocumentOut]:
    counts = await _chunk_counts(session)
    docs = await session.scalars(
        select(CorpusDocument).order_by(CorpusDocument.source, CorpusDocument.language)
    )
    out: list[CorpusDocumentOut] = []
    for doc in docs:
        item = CorpusDocumentOut.model_validate(doc)
        item.chunk_count = counts.get(doc.id, 0)
        out.append(item)
    return out


async def review_document(
    session: AsyncSession, actor: CurrentUser, document_id: uuid.UUID
) -> CorpusDocumentOut:
    doc = await session.get(CorpusDocument, document_id)
    if doc is None:
        raise AppError("document_not_found", "Corpus document not found", 404)
    before = _snapshot(doc)
    doc.reviewed_by = actor.id
    doc.reviewed_at = dt.datetime.now(dt.UTC)
    await session.flush()
    await record(
        session,
        actor_id=actor.id,
        action_type="corpus_document.review",
        entity_type="corpus_document",
        entity_id=str(doc.id),
        before=before,
        after=_snapshot(doc),
    )
    await session.commit()
    await session.refresh(doc)
    item = CorpusDocumentOut.model_validate(doc)
    item.chunk_count = (await _chunk_counts(session)).get(doc.id, 0)
    return item
