"""Truy xuất đoạn corpus cho trợ lý AI (D1): chỉ văn bản ĐÃ DUYỆT; lọc theo mã HS nếu có."""

import uuid
from dataclasses import dataclass

from sqlalchemy import any_, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embeddings import EmbeddingModel
from app.modules.catalog.service import normalize_code
from app.modules.copilot.models import CorpusChunk, CorpusDocument

MAX_K = 100


@dataclass(frozen=True)
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    title: str
    source: str
    source_url: str | None
    heading: str
    text: str
    score: float  # độ tương đồng cosine (1 = giống hệt)


async def retrieve(
    session: AsyncSession,
    embedder: EmbeddingModel,
    query: str,
    hs_code: str | None = None,
    k: int = 8,
) -> list[RetrievedChunk]:
    """k đoạn gần nhất với câu hỏi. hs_code: chỉ lấy đoạn của mã đó và đoạn áp dụng chung."""
    if not 1 <= k <= MAX_K:
        raise ValueError(f"k must be between 1 and {MAX_K}")
    heading = None
    if hs_code is not None:
        code = normalize_code(hs_code)
        if code is None:
            raise ValueError("hs_code must be 6 to 8 digits")
        heading = code[:6]
    if not query.strip():
        return []
    [vector] = await embedder.embed([query])
    distance = CorpusChunk.embedding.cosine_distance(vector)
    statement = (
        select(CorpusChunk, CorpusDocument, distance.label("distance"))
        .join(CorpusDocument, CorpusDocument.id == CorpusChunk.document_id)
        .where(CorpusDocument.reviewed_by.is_not(None))
    )
    if heading is not None:
        statement = statement.where(
            or_(
                func.cardinality(CorpusChunk.hs_codes) == 0,
                literal(heading) == any_(CorpusChunk.hs_codes),
            )
        )
    rows = await session.execute(statement.order_by(distance, CorpusChunk.id).limit(k))
    return [
        RetrievedChunk(
            chunk_id=chunk.id,
            document_id=doc.id,
            title=doc.title,
            source=doc.source,
            source_url=doc.source_url,
            heading=chunk.heading,
            text=chunk.text,
            score=1.0 - float(dist),
        )
        for chunk, doc, dist in rows.all()
    ]
