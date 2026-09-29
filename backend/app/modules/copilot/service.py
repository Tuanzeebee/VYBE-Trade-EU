"""Trợ lý AI tuân thủ (D2, D3): chỉ trả lời từ đoạn truy xuất, có trích dẫn thật, ghi MỌI câu hỏi.

Không ra quyết định xác minh (AGENTS.md §6.9). Thiếu căn cứ thì `out_of_scope` kèm nút chuyển
chuyên gia. Câu hỏi được che email/điện thoại trước khi gửi LLM và trước khi lưu.
"""

import asyncio
import datetime as dt
import logging
import time
import uuid

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.chat import ChatModel
from app.core.embeddings import EmbeddingModel
from app.core.errors import AppError
from app.modules.auth import service as auth
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.companies import service as companies
from app.modules.copilot.confidence import ConfidenceInput, assess, extract_citations
from app.modules.copilot.models import AiQuery, AiQueryFeedback, EscalationTicket
from app.modules.copilot.privacy import redact_pii
from app.modules.copilot.prompt import build_prompts
from app.modules.copilot.retrieve import RetrievedChunk, retrieve
from app.modules.copilot.schemas import AskIn, AskOut, CitationOut, EscalateIn, EscalationOut

log = logging.getLogger(__name__)

RETRIEVE_K = 8
LLM_TIMEOUT_SECONDS = 30
OUT_OF_SCOPE_ANSWER = {
    "vi": "Tôi chưa có đủ căn cứ trong tài liệu đã duyệt để trả lời câu hỏi này. "
    "Bạn có thể chuyển câu hỏi cho chuyên gia.",
    "en": "I do not have enough grounds in the reviewed documents to answer this question. "
    "You can pass it on to an expert.",
}


def _citations(cited: list[uuid.UUID], chunks: list[RetrievedChunk]) -> list[CitationOut]:
    by_id = {c.chunk_id: c for c in chunks}
    seen: set[uuid.UUID] = set()
    out: list[CitationOut] = []
    for chunk_id in cited:
        chunk = by_id.get(chunk_id)
        if chunk is not None and chunk_id not in seen:
            seen.add(chunk_id)
            out.append(
                CitationOut(
                    chunk_id=chunk.chunk_id,
                    title=chunk.title,
                    source=chunk.source,
                    source_url=chunk.source_url,
                    heading=chunk.heading,
                )
            )
    return out


async def ask(
    session: AsyncSession,
    embedder: EmbeddingModel,
    chat: ChatModel,
    data: AskIn,
    user: CurrentUser | None,
    persist: bool = True,
) -> AskOut:
    """Trả lời một câu hỏi và ghi đúng một dòng ai_queries (kể cả ngoài phạm vi và lỗi LLM).

    persist=False chỉ dành cho chạy eval; mọi câu hỏi của người dùng luôn ghi."""
    started = time.perf_counter()
    question = redact_pii(data.question.strip())
    hs_code = catalog.normalize_code(data.hs_code) if data.hs_code else None
    if data.hs_code and hs_code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    chunks = await retrieve(session, embedder, question, hs_code=hs_code, k=RETRIEVE_K)

    error_code: str | None = None
    answer_text = ""
    cited: list[uuid.UUID] = []
    self_assessment: str | None = None
    confidence = "out_of_scope"
    if not chunks:
        error_code = "no_passages"
    else:
        system, prompt = build_prompts(question, chunks)
        raw = ""
        try:
            raw = await asyncio.wait_for(chat.complete(system, prompt), timeout=LLM_TIMEOUT_SECONDS)
        except Exception:
            log.exception("LLM lỗi khi trả lời câu hỏi")
            error_code = "llm_error"
        parsed = extract_citations(raw) if error_code is None else None
        if error_code is None and parsed is None:
            error_code = "invalid_output"
        if parsed is not None:
            self_assessment = parsed.self_assessment
            confidence = assess(
                ConfidenceInput(
                    parsed.answer,
                    parsed.citations,
                    parsed.self_assessment,
                    {c.chunk_id: c.score for c in chunks},
                )
            )
            if confidence != "out_of_scope":
                answer_text, cited = parsed.answer.strip(), parsed.citations
    if confidence == "out_of_scope":
        answer_text, cited = OUT_OF_SCOPE_ANSWER[data.language], []

    row = AiQuery(
        user_id=user.id if user else None,
        company_id=await companies.get_company_id(session, user.id) if user else None,
        question=question,
        language=data.language,
        hs_code=hs_code,
        retrieved_chunk_ids=[c.chunk_id for c in chunks],
        answer=answer_text,
        citation_ids=cited,
        confidence=confidence,
        self_assessment=self_assessment,
        error=error_code,
        model_name=chat.name,
        latency_ms=int((time.perf_counter() - started) * 1000),
    )
    if persist:
        session.add(row)
        await session.commit()
    else:
        row.id = uuid.uuid4()  # chạy eval: không ghi nhật ký người dùng
    return AskOut(
        query_id=row.id,
        answer=answer_text,
        confidence=confidence,
        citations=_citations(cited, chunks),
        can_escalate=confidence in ("low", "out_of_scope"),
    )


async def _get_query(session: AsyncSession, query_id: uuid.UUID) -> AiQuery:
    row = await session.get(AiQuery, query_id)
    if row is None:
        raise AppError("query_not_found", "Question not found", 404)
    return row


async def record_feedback(session: AsyncSession, query_id: uuid.UUID, was_helpful: bool) -> None:
    await _get_query(session, query_id)
    session.add(AiQueryFeedback(query_id=query_id, was_helpful=was_helpful))
    await session.commit()


async def escalate(
    session: AsyncSession, query_id: uuid.UUID, data: EscalateIn, user: CurrentUser | None
) -> EscalationOut:
    """Chuyển câu hỏi cho chuyên gia. Người đăng nhập dùng email tài khoản; khách để lại email."""
    await _get_query(session, query_id)
    email = str(data.contact_email) if data.contact_email else None
    if user is not None:
        contact = await auth.get_contact(session, user.id)
        email = contact.email if contact else email
    if email is None:
        raise AppError("contact_required", "A contact email is required", 422)
    ticket = EscalationTicket(
        query_id=query_id, user_id=user.id if user else None, contact_email=email
    )
    session.add(ticket)
    await session.commit()
    await session.refresh(ticket)
    return EscalationOut(ticket_id=ticket.id, status=ticket.status)


# ── Nhật ký cho admin soát (D3) và chỉ số dashboard (I5) ──────────────────────
async def ai_stats(
    session: AsyncSession, now: dt.datetime | None = None
) -> tuple[int, float | None]:
    """(số câu hỏi 7 ngày qua, độ tin cậy trung bình). high=3, medium=2, low=1; bỏ out_of_scope.

    Trả None cho độ tin cậy trung bình khi chưa có câu nào được chấm (không hiện 0 giả)."""
    since = (now or dt.datetime.now(dt.UTC)) - dt.timedelta(days=7)
    total = await session.scalar(
        select(func.count()).select_from(AiQuery).where(AiQuery.created_at >= since)
    )
    score = func.avg(
        case(
            (AiQuery.confidence == "high", 3),
            (AiQuery.confidence == "medium", 2),
            (AiQuery.confidence == "low", 1),
        )
    )
    average = await session.scalar(select(score).where(AiQuery.created_at >= since))
    return int(total or 0), None if average is None else float(average)
