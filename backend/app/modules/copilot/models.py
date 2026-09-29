import datetime as dt
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
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
