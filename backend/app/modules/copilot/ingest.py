"""Nạp corpus vào DB (D1): đọc file markdown có front matter, cắt đoạn, nhúng, lưu.

    uv run python -m app.modules.copilot.ingest [thư-mục-corpus]

Chạy lại không trùng: cùng nội dung thì không đổi; nội dung đổi thì thay đoạn và phải duyệt lại.
Văn bản mới luôn CHƯA duyệt (chưa được truy xuất) cho tới khi admin duyệt — AGENTS.md §6.1, §6.8.
"""

import asyncio
import hashlib
import re
import sys
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

import app.modules.auth.models  # noqa: F401 — cần bảng users cho khóa ngoại reviewed_by
from app.core.db import get_sessionmaker
from app.core.embeddings import EmbeddingModel, get_embedding_model
from app.modules.catalog.service import normalize_code
from app.modules.copilot.chunking import chunk_document
from app.modules.copilot.models import CorpusChunk, CorpusDocument

DEFAULT_DIR = Path(__file__).resolve().parents[3] / "data" / "corpus"
DOC_TYPES = ("law", "guidance", "faq")
LANGUAGES = ("vi", "en")
_FRONT = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n?(.*)\Z", re.DOTALL)


@dataclass
class ParsedDocument:
    title: str
    source: str
    source_url: str | None
    doc_type: str
    language: str
    hs_codes: list[str] = field(default_factory=list)
    body: str = ""


@dataclass(frozen=True)
class IngestResult:
    status: str  # created | updated | unchanged
    chunks: int


def parse_corpus_file(path: Path) -> ParsedDocument:
    match = _FRONT.match(path.read_text(encoding="utf-8-sig"))
    if match is None:
        raise ValueError(f"{path.name}: thiếu front matter (--- ... ---)")
    meta: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
    body = match.group(2).strip()
    for required in ("title", "source", "language", "type"):
        if not meta.get(required):
            raise ValueError(f"{path.name}: thiếu trường {required}")
    if meta["language"] not in LANGUAGES:
        raise ValueError(f"{path.name}: language phải là {LANGUAGES}")
    if meta["type"] not in DOC_TYPES:
        raise ValueError(f"{path.name}: type phải là {DOC_TYPES}")
    if not body:
        raise ValueError(f"{path.name}: nội dung trống")
    hs_codes: list[str] = []
    for raw in filter(None, (v.strip() for v in meta.get("hs_codes", "").split(","))):
        code = normalize_code(raw)
        if code is None:
            raise ValueError(f"{path.name}: mã HS không hợp lệ: {raw}")
        hs_codes.append(code[:6])
    return ParsedDocument(
        title=meta["title"],
        source=meta["source"],
        source_url=meta.get("url") or None,
        doc_type=meta["type"],
        language=meta["language"],
        hs_codes=hs_codes,
        body=body,
    )


def _hash(doc: ParsedDocument) -> str:
    payload = "\n".join(
        [doc.title, doc.source, doc.source_url or "", ",".join(doc.hs_codes), doc.body]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def ingest_document(
    session: AsyncSession, embedder: EmbeddingModel, doc: ParsedDocument
) -> IngestResult:
    """Tạo hoặc cập nhật một văn bản (định danh: source + language). Chỉ flush; người gọi commit."""
    digest = _hash(doc)
    existing = await session.scalar(
        select(CorpusDocument).where(
            CorpusDocument.source == doc.source, CorpusDocument.language == doc.language
        )
    )
    if existing is not None and existing.content_hash == digest:
        count = len(
            (
                await session.scalars(
                    select(CorpusChunk.id).where(CorpusChunk.document_id == existing.id)
                )
            ).all()
        )
        return IngestResult("unchanged", count)

    chunks = chunk_document(doc.body)
    vectors = await embedder.embed([c.text for c in chunks])
    if existing is None:
        row = CorpusDocument(
            title=doc.title,
            source=doc.source,
            source_url=doc.source_url,
            doc_type=doc.doc_type,
            language=doc.language,
            hs_codes=doc.hs_codes,
            content_hash=digest,
        )
        session.add(row)
        status = "created"
    else:
        row = existing
        await session.execute(delete(CorpusChunk).where(CorpusChunk.document_id == row.id))
        row.title, row.source_url, row.doc_type = doc.title, doc.source_url, doc.doc_type
        row.hs_codes, row.content_hash = doc.hs_codes, digest
        row.reviewed_by, row.reviewed_at = None, None  # nội dung đổi → duyệt lại
        status = "updated"
    await session.flush()
    for chunk, vector in zip(chunks, vectors, strict=True):
        session.add(
            CorpusChunk(
                document_id=row.id,
                chunk_index=chunk.index,
                heading=chunk.heading[:512],
                text=chunk.text,
                source_label=f"{doc.source} — {chunk.heading}"[:600]
                if chunk.heading
                else doc.source,
                hs_codes=doc.hs_codes,
                embedding=vector,
            )
        )
    await session.flush()
    return IngestResult(status, len(chunks))


async def _run(parsed: list[tuple[str, ParsedDocument]]) -> list[tuple[str, IngestResult]]:
    embedder = get_embedding_model()
    results: list[tuple[str, IngestResult]] = []
    async with get_sessionmaker()() as session:
        for name, doc in parsed:
            result = await ingest_document(session, embedder, doc)
            await session.commit()  # từng văn bản: lỗi giữa chừng không mất phần đã nhúng
            print(f"{name}: {result.status} ({result.chunks} đoạn)", flush=True)
            results.append((name, result))
    return results


def main(argv: Sequence[str] | None = None) -> int:
    from scripts._console import use_utf8

    use_utf8()
    args = list(sys.argv[1:] if argv is None else argv)
    directory = Path(args[0]) if args else DEFAULT_DIR
    if not directory.is_dir():
        print(f"Không tìm thấy thư mục corpus: {directory}", file=sys.stderr)
        return 1
    try:
        parsed = [(p.name, parse_corpus_file(p)) for p in sorted(directory.glob("*.md"))]
        results = asyncio.run(_run(parsed))
    except ValueError as exc:
        print(f"Lỗi dữ liệu: {exc}", file=sys.stderr)
        return 1
    print(f"Xong {len(results)} văn bản.")
    print("Văn bản mới hoặc đã đổi cần admin duyệt trước khi trợ lý dùng.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
