import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.chat import ChatModel, get_chat_model
from app.core.db import get_session
from app.core.embeddings import EmbeddingModel, get_embedding_model
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import get_optional_user, require_role
from app.modules.copilot import admin_service, service
from app.modules.copilot.schemas import (
    AiQueryOut,
    AskIn,
    AskOut,
    CorpusDocumentOut,
    EscalateIn,
    EscalationOut,
    FeedbackIn,
)

router = APIRouter(tags=["copilot"])

DB = Annotated[AsyncSession, Depends(get_session)]
MaybeUser = Annotated[CurrentUser | None, Depends(get_optional_user)]
Admin = Annotated[CurrentUser, Depends(require_role("admin"))]
Embedder = Annotated[EmbeddingModel, Depends(get_embedding_model)]
Chat = Annotated[ChatModel, Depends(get_chat_model)]


# Công khai (khách dùng không cần đăng nhập). Rate limit 30/phút áp ở mức app (J1).
@router.post("/api/public/copilot/ask")
async def ask(data: AskIn, session: DB, user: MaybeUser, embedder: Embedder, chat: Chat) -> AskOut:
    return await service.ask(session, embedder, chat, data, user)


@router.post("/api/public/copilot/queries/{query_id}/feedback", status_code=204)
async def feedback(query_id: uuid.UUID, data: FeedbackIn, session: DB) -> Response:
    await service.record_feedback(session, query_id, data.was_helpful)
    return Response(status_code=204)


@router.post("/api/public/copilot/queries/{query_id}/escalate", status_code=201)
async def escalate(
    query_id: uuid.UUID, data: EscalateIn, session: DB, user: MaybeUser
) -> EscalationOut:
    return await service.escalate(session, query_id, data, user)


# ── Admin ────────────────────────────────────────────────────────────────────
@router.get("/api/admin/ai-queries")
async def list_ai_queries(
    _: Admin,
    session: DB,
    confidence: Annotated[str | None, Query(pattern="^(high|medium|low|out_of_scope)$")] = None,
    helpful: bool | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[AiQueryOut]:
    return await admin_service.list_queries(
        session, confidence=confidence, helpful=helpful, limit=limit, offset=offset
    )


@router.get("/api/admin/ai-queries/weekly-sample")
async def weekly_sample(
    _: Admin, session: DB, size: Annotated[int, Query(ge=1, le=100)] = 20
) -> list[AiQueryOut]:
    return await admin_service.weekly_sample(session, size)


@router.get("/api/admin/corpus-documents")
async def list_corpus_documents(_: Admin, session: DB) -> list[CorpusDocumentOut]:
    return await admin_service.list_documents(session)


@router.post("/api/admin/corpus-documents/{document_id}/review")
async def review_corpus_document(
    document_id: uuid.UUID, admin: Admin, session: DB
) -> CorpusDocumentOut:
    return await admin_service.review_document(session, admin, document_id)
