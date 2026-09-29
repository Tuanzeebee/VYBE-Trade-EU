import datetime as dt
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.embeddings import EMBEDDING_DIM


class CorpusDocument(Base):
    """Văn bản trong corpus của trợ lý AI (luật TM soạn và duyệt).

    Văn bản chưa duyệt không bao giờ được truy xuất; nội dung đổi thì phải duyệt lại."""

    __tablename__ = "corpus_documents"
    __table_args__ = (
        UniqueConstraint("source", "language", name="source_language"),
        CheckConstraint("language IN ('vi', 'en')", name="language"),
        CheckConstraint("doc_type IN ('law', 'guidance', 'faq')", name="doc_type"),
        CheckConstraint(
            "(reviewed_by IS NULL) = (reviewed_at IS NULL)", name="reviewed_by_and_at_together"
        ),
        CheckConstraint("length(btrim(source)) > 0", name="source_not_blank"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()")
    )
    title: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(255))  # tên văn bản / số hiệu dùng làm trích dẫn
    source_url: Mapped[str | None] = mapped_column(String(1024))
    doc_type: Mapped[str] = mapped_column(String(16))
    language: Mapped[str] = mapped_column(String(2))
    hs_codes: Mapped[list[str]] = mapped_column(
        ARRAY(String(8)), default=list, server_default=sql_text("'{}'::varchar[]")
    )  # rỗng = áp dụng chung
    content_hash: Mapped[str] = mapped_column(String(64))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    ingested_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=sql_text("clock_timestamp()")
    )


class CorpusChunk(Base):
    __tablename__ = "corpus_chunks"
    __table_args__ = (
        CheckConstraint("length(btrim(source_label)) > 0", name="source_label_not_blank"),
        Index("ix_corpus_chunks_document_id", "document_id"),
        Index(
            "ix_corpus_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()")
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("corpus_documents.id", ondelete="CASCADE")
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    heading: Mapped[str] = mapped_column(String(512))
    text: Mapped[str] = mapped_column(Text)
    source_label: Mapped[str] = mapped_column(
        String(600)
    )  # "Nguồn — Điều/Phụ lục", hiện trong trích dẫn
    hs_codes: Mapped[list[str]] = mapped_column(
        ARRAY(String(8)), default=list, server_default=sql_text("'{}'::varchar[]")
    )  # bản sao từ văn bản để lọc nhanh
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM))


class AiQuery(Base):
    """Mỗi câu hỏi gửi trợ lý AI (kể cả ngoài phạm vi và lỗi LLM).

    Append-only: trigger forbid_mutation() (migration 0021). Phản hồi và chuyển chuyên gia ghi ở
    bảng phụ nên bảng này không bao giờ bị sửa."""

    __tablename__ = "ai_queries"
    __table_args__ = (
        CheckConstraint(
            "confidence IN ('high', 'medium', 'low', 'out_of_scope')", name="confidence_valid"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))  # None = khách
    company_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("companies.id"))
    question: Mapped[str] = mapped_column(Text)  # đã che email/điện thoại
    language: Mapped[str] = mapped_column(String(2))
    hs_code: Mapped[str | None] = mapped_column(String(8))
    retrieved_chunk_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(Uuid), default=list, server_default=sql_text("'{}'::uuid[]")
    )
    answer: Mapped[str | None] = mapped_column(Text)
    citation_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(Uuid), default=list, server_default=sql_text("'{}'::uuid[]")
    )
    confidence: Mapped[str] = mapped_column(String(16), index=True)
    self_assessment: Mapped[str | None] = mapped_column(String(16))
    error: Mapped[str | None] = mapped_column(
        String(64)
    )  # llm_error | invalid_output | no_passages
    model_name: Mapped[str] = mapped_column(String(64))
    latency_ms: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=sql_text("clock_timestamp()"), index=True
    )


class AiQueryFeedback(Base):
    """Phản hồi hữu ích hay không (append-only). Bản ghi mới nhất của một câu hỏi là kết luận."""

    __tablename__ = "ai_query_feedback"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()")
    )
    query_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_queries.id"), index=True)
    was_helpful: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=sql_text("clock_timestamp()")
    )


class EscalationTicket(Base):
    """Yêu cầu chuyển cho chuyên gia thật (nút khi câu trả lời yếu hoặc ngoài phạm vi)."""

    __tablename__ = "escalation_tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()")
    )
    query_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_queries.id"), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    contact_email: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(16), default="open", server_default="open")
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=sql_text("clock_timestamp()")
    )
