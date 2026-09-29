import datetime as dt
import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Confidence = Literal["high", "medium", "low", "out_of_scope"]


class AskIn(BaseModel):
    question: Annotated[str, Field(min_length=3, max_length=1000)]
    hs_code: Annotated[str | None, Field(max_length=32)] = None
    language: Literal["vi", "en"] = "vi"


class CitationOut(BaseModel):
    chunk_id: uuid.UUID
    title: str
    source: str
    source_url: str | None
    heading: str


class AskOut(BaseModel):
    query_id: uuid.UUID
    answer: str
    confidence: Confidence
    citations: list[CitationOut]
    can_escalate: bool  # câu trả lời yếu hoặc ngoài phạm vi → hiện nút chuyển chuyên gia


class FeedbackIn(BaseModel):
    was_helpful: bool


class EscalateIn(BaseModel):
    """Khách phải để lại email; người đã đăng nhập dùng email tài khoản."""

    contact_email: EmailStr | None = None


class EscalationOut(BaseModel):
    ticket_id: uuid.UUID
    status: str


# ── Admin ────────────────────────────────────────────────────────────────────
class AiQueryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    company_id: uuid.UUID | None
    question: str
    language: str
    hs_code: str | None
    answer: str | None
    confidence: Confidence
    self_assessment: str | None
    error: str | None
    citation_ids: list[uuid.UUID]
    latency_ms: int
    created_at: dt.datetime
    was_helpful: bool | None = None  # phản hồi mới nhất (None = chưa có)
    escalated: bool = False


class CorpusDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    source: str
    source_url: str | None
    doc_type: str
    language: str
    hs_codes: list[str]
    reviewed_by: uuid.UUID | None
    reviewed_at: dt.datetime | None
    ingested_at: dt.datetime
    chunk_count: int = 0
