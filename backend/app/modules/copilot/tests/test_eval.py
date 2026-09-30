"""Script eval trợ lý AI (D4): hai chỉ số tách riêng và so với lần trước. Bộ câu hỏi ở đây là SYNTHETIC."""

import datetime as dt
import json
import uuid
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.chat import FakeChatModel
from app.core.embeddings import FakeEmbedding
from app.modules.copilot.eval import (
    Case,
    CaseResult,
    Metrics,
    diff_runs,
    load_cases,
    run_eval,
    save_results,
    score_case,
    summarize,
)
from app.modules.copilot.ingest import ParsedDocument, ingest_document
from app.modules.copilot.models import AiQuery, CorpusDocument
from app.modules.copilot.schemas import AskOut, CitationOut

EMB = FakeEmbedding()
SRC_A, SRC_B = "Nguồn A", "Nguồn B"


def ask_out(confidence: str, sources: list[str]) -> AskOut:
    return AskOut(
        query_id=uuid.uuid4(),
        answer="x",
        confidence=confidence,
        citations=[
            CitationOut(chunk_id=uuid.uuid4(), title=s, source=s, source_url=None, heading="Điều 1")
            for s in sources
        ],
        can_escalate=confidence in ("low", "out_of_scope"),
    )


def case(**over: object) -> Case:
    fields: dict[str, object] = {
        "id": "c1",
        "question": "Câu hỏi?",
        "hs_code": None,
        "expect_answer": True,
        "expected_sources": [SRC_A],
    }
    fields.update(over)
    return Case(**fields)  # type: ignore[arg-type]


# ── Chấm từng câu ───────────────────────────────────────────────────────────
def test_answerable_case_correct_when_answered_from_expected_source() -> None:
    r = score_case(case(), ask_out("high", [SRC_A]))
    assert (r.correct, r.answered, r.citation_ok) == (True, True, True)


def test_answerable_case_wrong_when_refused() -> None:
    r = score_case(case(), ask_out("out_of_scope", []))
    assert (r.correct, r.answered, r.citation_ok) == (False, False, None)


def test_answerable_case_wrong_when_cited_source_is_unexpected() -> None:
    r = score_case(case(), ask_out("high", [SRC_B]))
    assert (r.correct, r.answered, r.citation_ok) == (False, True, False)


def test_citation_ok_requires_every_citation_to_be_expected() -> None:
    assert score_case(case(), ask_out("high", [SRC_A, SRC_B])).citation_ok is False
    assert (
        score_case(
            case(expected_sources=[SRC_A, SRC_B]), ask_out("high", [SRC_A, SRC_B])
        ).citation_ok
        is True
    )


def test_out_of_scope_case_correct_only_when_refused() -> None:
    q = case(expect_answer=False, expected_sources=[])
    assert score_case(q, ask_out("out_of_scope", [])).correct is True
    wrong = score_case(q, ask_out("high", [SRC_A]))
    assert (wrong.correct, wrong.answered) == (False, True)


def test_out_of_scope_case_answered_is_flagged_as_overreach() -> None:
    q = case(expect_answer=False, expected_sources=[])
    assert (
        score_case(q, ask_out("low", [SRC_A])).correct is False
    )  # trả lời câu ngoài phạm vi là sai


# ── Tổng hợp ────────────────────────────────────────────────────────────────
def result(
    correct: bool, answered: bool, citation_ok: bool | None, expect_answer: bool = True
) -> CaseResult:
    return CaseResult("x", expect_answer, correct, answered, citation_ok, "high")


def test_accuracy_and_citation_correctness_are_separate_numbers() -> None:
    results = [
        result(True, True, True),
        result(True, True, True),
        result(False, True, False),  # trả lời nhưng dẫn sai nguồn
        result(False, False, None),  # từ chối câu đáng ra trả lời được
    ]
    m = summarize(results)
    assert m.accuracy == pytest.approx(2 / 4)
    assert m.citation_correctness == pytest.approx(2 / 3)  # chỉ tính các câu đã trả lời
    assert (m.total, m.answered) == (4, 3)


def test_citation_correctness_is_none_when_nothing_was_answered() -> None:
    m = summarize([result(True, False, None, expect_answer=False)])
    assert m.citation_correctness is None and m.accuracy == 1.0


def test_out_of_scope_refusal_rate_is_reported() -> None:
    results = [
        result(True, False, None, expect_answer=False),
        result(False, True, None, expect_answer=False),
    ]
    assert summarize(results).out_of_scope_refusal == pytest.approx(0.5)


def test_empty_run_is_rejected() -> None:
    with pytest.raises(ValueError):
        summarize([])


# ── Đọc bộ câu hỏi ──────────────────────────────────────────────────────────
def write(tmp_path: Path, *lines: str) -> Path:
    path = tmp_path / "cases.jsonl"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def test_load_cases_reads_jsonl_and_skips_blank_lines(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        json.dumps(
            {"id": "a", "question": "Câu một?", "expect_answer": True, "expected_sources": [SRC_A]}
        ),
        "",
        json.dumps(
            {"id": "b", "question": "Câu hai?", "expect_answer": False, "hs_code": "1006.30"}
        ),
    )
    cases = load_cases(path)
    assert [c.id for c in cases] == ["a", "b"]
    assert cases[1].hs_code == "1006.30" and cases[1].expected_sources == []


@pytest.mark.parametrize(
    "line",
    [
        "không phải json",
        json.dumps({"question": "thiếu id", "expect_answer": True}),
        json.dumps({"id": "a", "expect_answer": True}),
        json.dumps({"id": "a", "question": "x", "expect_answer": "có"}),
        json.dumps({"id": "a", "question": "x", "expect_answer": True}),  # cần expected_sources
    ],
)
def test_bad_case_line_reports_line_number(tmp_path: Path, line: str) -> None:
    good = json.dumps({"id": "ok", "question": "q?", "expect_answer": False})
    with pytest.raises(ValueError, match="dòng 2"):
        load_cases(write(tmp_path, good, line))


def test_duplicate_ids_are_rejected(tmp_path: Path) -> None:
    line = json.dumps({"id": "a", "question": "q?", "expect_answer": False})
    with pytest.raises(ValueError, match="trùng"):
        load_cases(write(tmp_path, line, line))


# ── So với lần trước ────────────────────────────────────────────────────────
def metrics(acc: float, cite: float | None, refusal: float | None = 1.0) -> Metrics:
    return Metrics(
        accuracy=acc, citation_correctness=cite, out_of_scope_refusal=refusal, total=10, answered=8
    )


def test_eval_diff_against_previous() -> None:
    prev = {
        "metrics": {"accuracy": 0.8, "citation_correctness": 0.9, "out_of_scope_refusal": 1.0},
        "cases": {"a": True, "b": True, "c": False},
    }
    cur = {
        "metrics": {"accuracy": 0.7, "citation_correctness": 0.95, "out_of_scope_refusal": 1.0},
        "cases": {"a": True, "b": False, "c": True},
    }
    d = diff_runs(prev, cur)
    assert d is not None
    assert d.deltas["accuracy"] == pytest.approx(-0.1)
    assert d.deltas["citation_correctness"] == pytest.approx(0.05)
    assert d.deltas["out_of_scope_refusal"] == pytest.approx(0.0)
    assert d.regressions == ["b"] and d.improvements == ["c"]


def test_diff_handles_missing_previous_and_none_metrics() -> None:
    assert diff_runs(None, {"metrics": {"accuracy": 1.0}, "cases": {}}) is None
    d = diff_runs(
        {"metrics": {"accuracy": 1.0, "citation_correctness": None}, "cases": {}},
        {"metrics": {"accuracy": 1.0, "citation_correctness": 0.5}, "cases": {}},
    )
    assert (
        d is not None and d.deltas["citation_correctness"] is None
    )  # không so được khi thiếu một bên


def test_save_results_writes_a_timestamped_file_and_finds_the_previous(tmp_path: Path) -> None:
    first = save_results(
        tmp_path,
        metrics(0.8, 0.9),
        [result(True, True, True)],
        now=dt.datetime(2026, 10, 1, 9, 0, tzinfo=dt.UTC),
    )
    second = save_results(
        tmp_path,
        metrics(0.9, 0.9),
        [result(True, True, True)],
        now=dt.datetime(2026, 10, 2, 9, 0, tzinfo=dt.UTC),
    )
    assert first.path.name < second.path.name
    assert second.previous is not None and second.previous["metrics"]["accuracy"] == 0.8
    saved = json.loads(second.path.read_text(encoding="utf-8"))
    assert set(saved) >= {"metrics", "cases", "created_at"}
    assert saved["metrics"]["accuracy"] == 0.9 and "citation_correctness" in saved["metrics"]


def test_first_run_has_no_previous(tmp_path: Path) -> None:
    saved = save_results(tmp_path, metrics(0.8, 0.9), [result(True, True, True)])
    assert saved.previous is None


# ── Chạy thật với mô hình giả trên corpus synthetic ─────────────────────────
DOCS = [
    ParsedDocument(
        "Gạo",
        SRC_A,
        None,
        "law",
        "vi",
        ["100630"],
        "Điều 1. Hạn ngạch gạo\nGạo thơm chịu hạn ngạch thuế quan thử nghiệm.",
    ),
    ParsedDocument(
        "Cà phê",
        SRC_B,
        None,
        "law",
        "vi",
        ["090121"],
        "Điều 1. Nhãn cà phê\nCà phê rang phải ghi nhãn ngày rang thử nghiệm.",
    ),
]


async def seed(db_session: AsyncSession, reviewer_id: uuid.UUID) -> None:
    for doc in DOCS:
        await ingest_document(db_session, EMB, doc)
    for row in (await db_session.scalars(select(CorpusDocument))).all():
        row.reviewed_by, row.reviewed_at = reviewer_id, dt.datetime.now(dt.UTC)
    await db_session.flush()


async def test_eval_reports_two_metrics(db_session: AsyncSession, reviewer_id: uuid.UUID) -> None:
    await seed(db_session, reviewer_id)
    cases = [
        Case("rice", "Gạo thơm chịu hạn ngạch thuế quan không?", None, True, [SRC_A]),
        Case("coffee", "Cà phê rang ghi nhãn ngày rang thế nào?", None, True, [SRC_B]),
        Case("off", "Thời tiết Hà Nội hôm nay ra sao?", None, False, []),
    ]

    class Offtopic(FakeChatModel):
        async def complete(self, system: str, user: str) -> str:
            if "Thời tiết" in user:
                return json.dumps(
                    {"answer": "", "citations": [], "self_assessment": "insufficient"}
                )
            return await super().complete(system, user)

    chat = Offtopic()
    results, m = await run_eval(db_session, EMB, chat, cases)
    assert [r.case_id for r in results] == ["rice", "coffee", "off"]
    assert m.total == 3
    assert m.accuracy == 1.0 and m.citation_correctness == 1.0 and m.out_of_scope_refusal == 1.0


async def test_eval_runs_do_not_pollute_the_ai_query_log(
    db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await seed(db_session, reviewer_id)
    await run_eval(
        db_session, EMB, FakeChatModel(), [Case("a", "Gạo thơm hạn ngạch?", None, True, [SRC_A])]
    )
    assert await db_session.scalar(select(func.count()).select_from(AiQuery)) == 0


# ── Định dạng do luật TM cung cấp (backend/evals/copilot_50.jsonl) ───────────
REAL = Path(__file__).resolve().parents[4] / "evals" / "copilot_50.jsonl"


def test_the_reviewers_50_question_file_loads() -> None:
    cases = load_cases(REAL)
    assert len(cases) == 50
    refusals = [c for c in cases if not c.expect_answer]
    assert len(refusals) == 8 and all(c.expected_sources == [] for c in refusals)
    assert all(c.expected_sources for c in cases if c.expect_answer)
    assert {c.language for c in cases} == {"vi", "en"}


def test_doc_id_expectations_match_on_the_document_id_only() -> None:
    def cited(source: str, title: str = "x") -> AskOut:
        out = ask_out("high", [source])
        out.citations[0].title = title
        return out

    q = case(expected_sources=["DOC01 Phụ lục II"])
    assert score_case(q, cited("Nghị định thư", "DOC01 — Nghị định thư 1")).citation_ok is True
    assert score_case(q, cited("DOC02")).citation_ok is False
    named = case(expected_sources=["TT 11/2020/TT-BCT"])
    assert score_case(named, cited("Thông tư", "TT 11/2020/TT-BCT hợp nhất")).citation_ok is True
