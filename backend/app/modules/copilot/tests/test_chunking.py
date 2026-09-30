"""Cắt đoạn corpus (D1): hàm thuần. Nội dung là SYNTHETIC, không phải văn bản pháp luật thật."""

import re
from itertools import pairwise

import pytest

from app.modules.copilot.chunking import Chunk, chunk_document

ARTICLE = re.compile(r"^(Điều|Article|Phụ lục|Annex)\s", re.MULTILINE)

DOC_VI = """# Nghị định thử nghiệm

Phần mở đầu giải thích phạm vi áp dụng của văn bản thử nghiệm.

Điều 1. Phạm vi
Văn bản này áp dụng cho hàng hóa thử nghiệm A. Câu thứ hai của điều một.

Điều 2. Định nghĩa
Hàng hóa thử nghiệm B là hàng hóa được định nghĩa tại điều này. Câu thứ hai của điều hai.
Đoạn thứ hai của điều hai nói thêm về ngoại lệ.

Điều 3. Hiệu lực
Có hiệu lực từ ngày ký.

Phụ lục I. Danh mục
Danh mục thử nghiệm một. Danh mục thử nghiệm hai.
"""

DOC_EN = """Article 1 Scope
This synthetic text applies to test goods.

Article 2 Definitions
Test goods means goods defined here.

Annex II Lists
List one. List two.
"""


def article_count(text: str) -> int:
    return len(ARTICLE.findall(text))


def test_chunks_never_cross_article_boundary() -> None:
    chunks = chunk_document(DOC_VI, max_chars=2000)
    assert chunks
    for chunk in chunks:
        assert article_count(chunk.text) <= 1, chunk.text
    starts = [c.text.splitlines()[0] for c in chunks if ARTICLE.match(c.text)]
    assert starts == [
        "Điều 1. Phạm vi",
        "Điều 2. Định nghĩa",
        "Điều 3. Hiệu lực",
        "Phụ lục I. Danh mục",
    ]


def test_english_articles_and_annexes_are_boundaries_too() -> None:
    chunks = chunk_document(DOC_EN, max_chars=2000)
    assert [article_count(c.text) for c in chunks] == [1, 1, 1]
    assert chunks[2].heading.startswith("Annex II")


def test_small_articles_are_not_merged_into_one_chunk() -> None:
    chunks = chunk_document(DOC_VI, max_chars=5000)  # đủ chỗ để gộp nếu code sai
    assert len([c for c in chunks if ARTICLE.match(c.text)]) == 4


def test_heading_is_recorded_on_every_chunk() -> None:
    chunks = chunk_document(DOC_VI, max_chars=2000)
    by_start = {c.text.splitlines()[0]: c for c in chunks}
    assert by_start["Điều 2. Định nghĩa"].heading == "Điều 2. Định nghĩa"
    intro = chunks[0]
    assert "Nghị định thử nghiệm" in intro.heading  # phần trước Điều 1 mang tiêu đề markdown


def test_long_article_is_split_inside_the_same_article_with_heading_kept() -> None:
    sentences = " ".join(
        f"Câu số {i} của điều dài này nêu một quy định thử nghiệm." for i in range(80)
    )
    doc = f"Điều 7. Điều rất dài\n{sentences}\n\nĐiều 8. Điều ngắn\nNgắn."
    chunks = chunk_document(doc, max_chars=400, overlap=60)
    long_part = [c for c in chunks if c.heading.startswith("Điều 7")]
    assert len(long_part) > 3
    assert all(len(c.text) <= 400 for c in chunks)
    assert all(article_count(c.text) <= 1 for c in chunks)
    assert chunks[-1].heading.startswith("Điều 8")


def test_split_chunks_overlap_within_the_article() -> None:
    sentences = " ".join(f"Câu số {i} nêu một quy định thử nghiệm." for i in range(60))
    chunks = [c for c in chunk_document(f"Điều 1. Dài\n{sentences}", max_chars=300, overlap=80)]
    for previous, current in pairwise(chunks):
        tail = previous.text[-80:]
        assert any(word in current.text for word in tail.split()[-3:]), (
            "thiếu phần gối đầu giữa hai đoạn"
        )


def test_no_text_is_lost() -> None:
    doc = (
        DOC_VI
        + "\n"
        + "\n".join(
            f"Điều {n}. Tiêu đề {n}\nNội dung điều {n} có câu riêng {n}." for n in range(4, 30)
        )
    )
    chunks = chunk_document(doc, max_chars=300, overlap=40)
    joined = "\n".join(c.text for c in chunks)
    for needle in (
        "Câu thứ hai của điều một",
        "ngoại lệ",
        "Nội dung điều 29 có câu riêng 29",
        "Danh mục thử nghiệm hai",
    ):
        assert needle in joined, needle


def test_indices_are_sequential_and_output_is_deterministic() -> None:
    first = chunk_document(DOC_VI, max_chars=200, overlap=30)
    second = chunk_document(DOC_VI, max_chars=200, overlap=30)
    assert first == second
    assert [c.index for c in first] == list(range(len(first)))


@pytest.mark.parametrize("text", ["", "   ", "\n\n\n"])
def test_empty_documents_have_no_chunks(text: str) -> None:
    assert chunk_document(text) == []


def test_unbreakable_long_token_is_hard_split() -> None:
    blob = "x" * 1000
    chunks = chunk_document(f"Điều 1. Dài\n{blob}", max_chars=300, overlap=0)
    assert all(len(c.text) <= 300 for c in chunks)
    assert "".join(c.text for c in chunks).count("x") == 1000


def test_chunk_is_immutable_value_object() -> None:
    chunk = Chunk(index=0, heading="h", text="t")
    with pytest.raises(AttributeError):
        chunk.text = "other"  # type: ignore[misc]


@pytest.mark.parametrize("max_chars", [0, -5, 50])
def test_too_small_limits_are_rejected(max_chars: int) -> None:
    with pytest.raises(ValueError):
        chunk_document("Điều 1. A\nnội dung", max_chars=max_chars)


def test_overlap_must_be_smaller_than_max_chars() -> None:
    with pytest.raises(ValueError):
        chunk_document("Điều 1. A\nnội dung", max_chars=200, overlap=200)
