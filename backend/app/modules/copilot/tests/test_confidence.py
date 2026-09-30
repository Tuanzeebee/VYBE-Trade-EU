"""Mức tin cậy của câu trả lời AI (D2): hàm thuần. Ngưỡng là tạm thời, chờ chỉnh theo eval 50 câu (D4)."""

import uuid

import pytest

from app.modules.copilot.confidence import (
    SCORE_HIGH,
    SCORE_MEDIUM,
    ConfidenceInput,
    assess,
    extract_citations,
)

A, B, C = (uuid.uuid4() for _ in range(3))
RETRIEVED = {A: 0.9, B: 0.5, C: 0.2}


def score(
    citations: list[uuid.UUID], self_assessment: str = "high", answer: str = "Có căn cứ."
) -> str:
    return assess(ConfidenceInput(answer, citations, self_assessment, RETRIEVED))


def test_valid_strong_citation_and_confident_model_is_high() -> None:
    assert score([A]) == "high"


def test_medium_retrieval_score_caps_at_medium() -> None:
    assert score([B]) == "medium"


def test_weak_retrieval_score_is_low() -> None:
    assert score([C]) == "low"


@pytest.mark.parametrize(
    ("self_assessment", "expected"), [("high", "high"), ("medium", "medium"), ("low", "low")]
)
def test_model_self_assessment_can_only_lower_never_raise(
    self_assessment: str, expected: str
) -> None:
    assert score([A], self_assessment) == expected
    assert score([C], "high") == "low"  # tự tin cao không nâng điểm truy xuất thấp


def test_no_citations_is_out_of_scope() -> None:
    assert score([]) == "out_of_scope"


def test_invented_chunk_id_downgrades_to_out_of_scope() -> None:
    assert score([A, uuid.uuid4()]) == "out_of_scope"  # dù còn một trích dẫn đúng


def test_only_invented_ids_is_out_of_scope() -> None:
    assert score([uuid.uuid4()]) == "out_of_scope"


@pytest.mark.parametrize("self_assessment", ["insufficient", "khong-ro", ""])
def test_insufficient_or_unknown_self_assessment_is_out_of_scope(self_assessment: str) -> None:
    assert score([A], self_assessment) == "out_of_scope"


@pytest.mark.parametrize("answer", ["", "   ", "\n"])
def test_blank_answer_is_out_of_scope(answer: str) -> None:
    assert score([A], answer=answer) == "out_of_scope"


def test_best_cited_chunk_decides_the_retrieval_component() -> None:
    assert score([C, A]) == "high"  # có trích dẫn mạnh
    assert score([C, B]) == "medium"


def test_duplicate_citations_do_not_matter() -> None:
    assert score([A, A, A]) == "high"


def test_thresholds_are_ordered() -> None:
    assert 0 < SCORE_MEDIUM < SCORE_HIGH < 1


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (SCORE_HIGH, "high"),
        (SCORE_HIGH - 1e-9, "medium"),
        (SCORE_MEDIUM, "medium"),
        (SCORE_MEDIUM - 1e-9, "low"),
    ],
)
def test_threshold_boundaries(value: float, expected: str) -> None:
    only = uuid.uuid4()
    assert assess(ConfidenceInput("Có căn cứ.", [only], "high", {only: value})) == expected


# ── Đọc trích dẫn từ đầu ra của mô hình ─────────────────────────────────────
def test_extract_citations_parses_ids_and_ignores_case() -> None:
    raw = f'{{"answer": "x", "citations": ["{str(A).upper()}", "{B}"], "self_assessment": "high"}}'
    parsed = extract_citations(raw)
    assert parsed is not None
    assert (parsed.answer, parsed.citations, parsed.self_assessment) == ("x", [A, B], "high")


@pytest.mark.parametrize(
    "raw",
    [
        "không phải json",
        "[]",
        '{"answer": 5, "citations": [], "self_assessment": "high"}',
        '{"answer": "x", "citations": "abc", "self_assessment": "high"}',
        '{"answer": "x", "citations": ["khong-phai-uuid"], "self_assessment": "high"}',
        '{"citations": [], "self_assessment": "high"}',
        '{"answer": "x", "citations": [], "self_assessment": 3}',
        "",
    ],
)
def test_extract_citations_rejects_malformed_output(raw: str) -> None:
    assert extract_citations(raw) is None


def test_extract_citations_tolerates_json_inside_code_fence() -> None:
    raw = f'```json\n{{"answer": "x", "citations": ["{A}"], "self_assessment": "medium"}}\n```'
    parsed = extract_citations(raw)
    assert parsed is not None and parsed.citations == [A]


def test_extract_citations_caps_the_number_of_citations() -> None:
    ids = ", ".join(f'"{uuid.uuid4()}"' for _ in range(200))
    parsed = extract_citations(
        f'{{"answer": "x", "citations": [{ids}], "self_assessment": "high"}}'
    )
    assert parsed is None or len(parsed.citations) <= 50
