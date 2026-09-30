"""Mức tin cậy của câu trả lời AI (D2). Hàm thuần: không DB, không HTTP.

Quy tắc cứng (AGENTS.md §6.8): câu trả lời phải có trích dẫn trỏ tới đoạn THẬT đã truy xuất;
trích dẫn bịa hoặc thiếu thì `out_of_scope`. Điểm truy xuất quyết định mức; tự đánh giá của mô hình
chỉ có thể HẠ mức.

Ngưỡng SCORE_HIGH / SCORE_MEDIUM là tạm thời: chỉnh theo bộ eval 50 câu (D4) do luật TM ký.
"""

import json
import re
import uuid
from collections.abc import Mapping
from dataclasses import dataclass

SCORE_HIGH = 0.6
SCORE_MEDIUM = 0.35
MAX_CITATIONS = 50

_LEVELS = ("low", "medium", "high")
_FENCE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL)


@dataclass(frozen=True)
class ConfidenceInput:
    answer: str
    citations: list[uuid.UUID]
    self_assessment: str  # high | medium | low | insufficient (từ mô hình)
    retrieved_scores: Mapping[uuid.UUID, float]  # điểm cosine của các đoạn ĐÃ truy xuất


@dataclass(frozen=True)
class ModelAnswer:
    answer: str
    citations: list[uuid.UUID]
    self_assessment: str


def _level_from_score(value: float) -> str:
    if value >= SCORE_HIGH:
        return "high"
    if value >= SCORE_MEDIUM:
        return "medium"
    return "low"


def assess(data: ConfidenceInput) -> str:
    """high | medium | low | out_of_scope."""
    if not data.answer.strip() or not data.citations:
        return "out_of_scope"
    if any(c not in data.retrieved_scores for c in data.citations):
        return "out_of_scope"  # có trích dẫn không thuộc tập đã truy xuất (bịa)
    if data.self_assessment not in _LEVELS:
        return "out_of_scope"  # "insufficient" hoặc giá trị lạ
    retrieval = _level_from_score(max(data.retrieved_scores[c] for c in data.citations))
    return _LEVELS[min(_LEVELS.index(retrieval), _LEVELS.index(data.self_assessment))]


def extract_citations(raw: str) -> ModelAnswer | None:
    """Đọc JSON {answer, citations[], self_assessment} từ đầu ra mô hình; sai định dạng → None."""
    text = raw.strip()
    fenced = _FENCE.match(text)
    if fenced:
        text = fenced.group(1)
    try:
        data = json.loads(text)
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    answer, citations, assessment = (
        data.get("answer"),
        data.get("citations"),
        data.get("self_assessment"),
    )
    if (
        not isinstance(answer, str)
        or not isinstance(assessment, str)
        or not isinstance(citations, list)
    ):
        return None
    try:
        ids = [uuid.UUID(str(c)) for c in citations[:MAX_CITATIONS]]
    except ValueError:
        return None
    return ModelAnswer(answer=answer, citations=ids, self_assessment=assessment)
