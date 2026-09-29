"""Nạp corpus và truy xuất (D1). Văn bản là SYNTHETIC, không phải văn bản pháp luật thật."""

import datetime as dt
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embeddings import FakeEmbedding
from app.modules.copilot.ingest import ParsedDocument, ingest_document, parse_corpus_file
from app.modules.copilot.models import CorpusChunk, CorpusDocument
from app.modules.copilot.retrieve import retrieve

EMB = FakeEmbedding()

RICE = ParsedDocument(
    title="Quy định thử nghiệm về gạo",
    source="Văn bản thử nghiệm số 1",
    source_url="https://example.test/rice",
    doc_type="law",
    language="vi",
    hs_codes=["100630"],
    body="Điều 1. Gạo xuất khẩu\nGạo xay xát xuất khẩu sang thị trường thử nghiệm phải có giấy chứng nhận chủng loại.\n\n"
    "Điều 2. Hạn ngạch gạo\nGạo thơm chịu hạn ngạch thuế quan theo quy định thử nghiệm.",
)
COFFEE = ParsedDocument(
    title="Quy định thử nghiệm về cà phê",
    source="Văn bản thử nghiệm số 2",
    source_url=None,
    doc_type="law",
    language="vi",
    hs_codes=["090121"],
    body="Điều 1. Cà phê rang\nCà phê rang xuất khẩu phải ghi nhãn nguồn gốc và ngày rang.",
)
GENERAL = ParsedDocument(
    title="Nguyên tắc chung thử nghiệm",
    source="Văn bản thử nghiệm số 3",
    source_url=None,
    doc_type="guidance",
    language="vi",
    hs_codes=[],
    body="Điều 1. Nguyên tắc chung\nMọi hàng hóa xuất khẩu phải có hồ sơ chứng từ đầy đủ theo hướng dẫn.",
)


async def approve_all(session: AsyncSession, reviewer: object) -> None:
    for doc in (await session.scalars(select(CorpusDocument))).all():
        doc.reviewed_by = reviewer  # type: ignore[assignment]
        doc.reviewed_at = dt.datetime.now(dt.UTC)
    await session.flush()


async def count(session: AsyncSession, model: type) -> int:
    return int(await session.scalar(select(func.count()).select_from(model)) or 0)


async def test_ingest_creates_document_and_chunks_with_sources(db_session: AsyncSession) -> None:
    result = await ingest_document(db_session, EMB, RICE)
    assert (result.status, result.chunks) == ("created", 2)
    chunks = (await db_session.scalars(select(CorpusChunk))).all()
    assert len(chunks) == 2
    for chunk in chunks:
        assert chunk.heading and chunk.text and chunk.source_label
        assert "Văn bản thử nghiệm số 1" in chunk.source_label  # mọi đoạn truy về nguồn
        assert len(list(chunk.embedding)) == EMB.dimension


async def test_every_chunk_has_source(db_session: AsyncSession) -> None:
    for doc in (RICE, COFFEE, GENERAL):
        await ingest_document(db_session, EMB, doc)
    orphans = await db_session.scalar(
        select(func.count()).select_from(CorpusChunk).where(CorpusChunk.source_label == "")
    )
    assert orphans == 0


async def test_new_document_is_unreviewed(db_session: AsyncSession) -> None:
    await ingest_document(db_session, EMB, RICE)
    doc = (await db_session.scalars(select(CorpusDocument))).one()
    assert (doc.reviewed_by, doc.reviewed_at) == (None, None)


async def test_reingest_is_idempotent(db_session: AsyncSession, reviewer_id: object) -> None:
    await ingest_document(db_session, EMB, RICE)
    await approve_all(db_session, reviewer_id)
    before_ids = {c.id for c in (await db_session.scalars(select(CorpusChunk))).all()}
    result = await ingest_document(db_session, EMB, RICE)
    assert result.status == "unchanged"
    assert {c.id for c in (await db_session.scalars(select(CorpusChunk))).all()} == before_ids
    assert await count(db_session, CorpusDocument) == 1
    doc = (await db_session.scalars(select(CorpusDocument))).one()
    assert doc.reviewed_by is not None  # không đổi nội dung thì giữ trạng thái duyệt


async def test_changed_content_replaces_chunks_and_needs_review_again(
    db_session: AsyncSession, reviewer_id: object
) -> None:
    await ingest_document(db_session, EMB, RICE)
    await approve_all(db_session, reviewer_id)
    changed = ParsedDocument(
        **{
            **RICE.__dict__,
            "body": RICE.body + "\n\nĐiều 3. Thêm mới\nQuy định bổ sung thử nghiệm.",
        }
    )
    result = await ingest_document(db_session, EMB, changed)
    assert (result.status, result.chunks) == ("updated", 3)
    assert await count(db_session, CorpusChunk) == 3
    doc = (await db_session.scalars(select(CorpusDocument))).one()
    assert doc.reviewed_by is None  # nội dung đã đổi → phải duyệt lại


async def test_retrieval_uses_only_reviewed_documents(
    db_session: AsyncSession, reviewer_id: object
) -> None:
    await ingest_document(db_session, EMB, RICE)
    assert await retrieve(db_session, EMB, "hạn ngạch gạo thơm") == []  # chưa duyệt
    await approve_all(db_session, reviewer_id)
    assert await retrieve(db_session, EMB, "hạn ngạch gạo thơm") != []


async def test_retrieval_ranks_the_relevant_chunk_first(
    db_session: AsyncSession, reviewer_id: object
) -> None:
    for doc in (RICE, COFFEE, GENERAL):
        await ingest_document(db_session, EMB, doc)
    await approve_all(db_session, reviewer_id)
    top = await retrieve(db_session, EMB, "hạn ngạch thuế quan gạo thơm", k=3)
    assert top[0].heading.startswith("Điều 2. Hạn ngạch gạo")
    assert top[0].source == "Văn bản thử nghiệm số 1"
    assert top[0].score >= top[1].score >= top[2].score  # giảm dần
    coffee = await retrieve(db_session, EMB, "ghi nhãn ngày rang cà phê", k=1)
    assert coffee[0].title == "Quy định thử nghiệm về cà phê"


async def test_hs_filter(db_session: AsyncSession, reviewer_id: object) -> None:
    for doc in (RICE, COFFEE, GENERAL):
        await ingest_document(db_session, EMB, doc)
    await approve_all(db_session, reviewer_id)
    rice = await retrieve(db_session, EMB, "xuất khẩu hàng hóa quy định", hs_code="1006.30", k=10)
    titles = {c.title for c in rice}
    assert "Quy định thử nghiệm về cà phê" not in titles  # tài liệu của mã HS khác bị loại
    assert titles == {
        "Quy định thử nghiệm về gạo",
        "Nguyên tắc chung thử nghiệm",
    }  # gồm cả nguyên tắc chung
    unfiltered = {
        c.title for c in await retrieve(db_session, EMB, "xuất khẩu hàng hóa quy định", k=10)
    }
    assert "Quy định thử nghiệm về cà phê" in unfiltered


async def test_k_limits_results_and_bad_k_is_rejected(
    db_session: AsyncSession, reviewer_id: object
) -> None:
    for doc in (RICE, COFFEE, GENERAL):
        await ingest_document(db_session, EMB, doc)
    await approve_all(db_session, reviewer_id)
    assert len(await retrieve(db_session, EMB, "quy định", k=2)) == 2
    for bad in (0, -1, 101):
        with pytest.raises(ValueError):
            await retrieve(db_session, EMB, "quy định", k=bad)


@pytest.mark.parametrize("query", ["", "   ", "\n"])
async def test_empty_query_returns_nothing(db_session: AsyncSession, query: str) -> None:
    assert await retrieve(db_session, EMB, query) == []


async def test_empty_corpus_returns_nothing(db_session: AsyncSession) -> None:
    assert await retrieve(db_session, EMB, "bất kỳ câu hỏi nào") == []


async def test_invalid_hs_code_is_rejected(db_session: AsyncSession) -> None:
    with pytest.raises(ValueError):
        await retrieve(db_session, EMB, "quy định", hs_code="abc")


# ── Bộ nhúng giả (xác định) ──────────────────────────────────────────────────
async def test_fake_embedding_is_deterministic_and_normalized() -> None:
    [a, b] = await EMB.embed(["gạo xuất khẩu", "gạo xuất khẩu"])
    assert a == b and len(a) == EMB.dimension
    assert abs(sum(x * x for x in a) - 1.0) < 1e-6


async def test_fake_embedding_makes_similar_texts_closer() -> None:
    [q, near, far] = await EMB.embed(
        ["hạn ngạch gạo thơm", "gạo thơm chịu hạn ngạch", "cà phê rang ghi nhãn"]
    )

    def dot(x: list[float], y: list[float]) -> float:
        return sum(i * j for i, j in zip(x, y, strict=True))

    assert dot(q, near) > dot(q, far)


# ── Đọc file corpus ──────────────────────────────────────────────────────────
def test_parse_corpus_file_reads_front_matter(tmp_path: Path) -> None:
    path = tmp_path / "doc.md"
    path.write_text(
        "---\ntitle: Tiêu đề thử\nsource: Nguồn thử\nurl: https://example.test/x\ntype: law\nlanguage: vi\nhs_codes: 100630, 0901.21\n---\nĐiều 1. A\nNội dung.",
        encoding="utf-8",
    )
    doc = parse_corpus_file(path)
    assert (doc.title, doc.source, doc.source_url, doc.doc_type, doc.language) == (
        "Tiêu đề thử",
        "Nguồn thử",
        "https://example.test/x",
        "law",
        "vi",
    )
    assert doc.hs_codes == ["100630", "090121"]
    assert doc.body.startswith("Điều 1. A")


@pytest.mark.parametrize(
    "content",
    [
        "Không có front matter\nĐiều 1. A",
        "---\ntitle: Thiếu nguồn\nlanguage: vi\ntype: law\n---\nnội dung",
        "---\ntitle: T\nsource: S\nlanguage: fr\ntype: law\n---\nnội dung",
        "---\ntitle: T\nsource: S\nlanguage: vi\ntype: khac\n---\nnội dung",
        "---\ntitle: T\nsource: S\nlanguage: vi\ntype: law\nhs_codes: abc\n---\nnội dung",
        "---\ntitle: T\nsource: S\nlanguage: vi\ntype: law\n---\n   ",
    ],
)
def test_bad_corpus_files_are_rejected(tmp_path: Path, content: str) -> None:
    path = tmp_path / "bad.md"
    path.write_text(content, encoding="utf-8")
    with pytest.raises(ValueError):
        parse_corpus_file(path)
