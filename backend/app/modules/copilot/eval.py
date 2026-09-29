"""Đánh giá trợ lý AI trên bộ câu hỏi do luật TM soạn (D4).

AGENTS.md §6.11: sửa prompt, embedding hoặc truy xuất thì phải chạy lại và nêu chênh lệch.

    uv run python -m app.modules.copilot.eval [--file evals/copilot_50.jsonl] [--out evals/results]

Mỗi dòng .jsonl: {"id": "...", "question": "...", "hs_code": "1006.30" (tùy chọn),
"expect_answer": true|false, "expected_sources": [...] (bắt buộc khi expect_answer=true)}.
Hai chỉ số TÁCH RIÊNG: accuracy (trả lời/từ chối đúng) và citation_correctness (dẫn đúng nguồn).
Lần chạy không ghi vào ai_queries. LLM/embedding theo cấu hình (Q5 chưa chốt: đang là bản giả).
"""

import argparse
import asyncio
import datetime as dt
import json
import sys
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.chat import ChatModel, get_chat_model
from app.core.embeddings import EmbeddingModel, get_embedding_model
from app.modules.copilot import service
from app.modules.copilot.schemas import AskIn, AskOut

DEFAULT_FILE = Path(__file__).resolve().parents[3] / "evals" / "copilot_50.jsonl"
DEFAULT_OUT = Path(__file__).resolve().parents[3] / "evals" / "results"
METRIC_KEYS = ("accuracy", "citation_correctness", "out_of_scope_refusal")


@dataclass(frozen=True)
class Case:
    id: str
    question: str
    hs_code: str | None
    expect_answer: bool
    expected_sources: list[str]


@dataclass(frozen=True)
class CaseResult:
    case_id: str
    expect_answer: bool
    correct: bool
    answered: bool
    citation_ok: bool | None  # None = không có câu trả lời để chấm trích dẫn
    confidence: str


@dataclass(frozen=True)
class Metrics:
    accuracy: float
    citation_correctness: float | None
    out_of_scope_refusal: float | None
    total: int
    answered: int


@dataclass(frozen=True)
class RunDiff:
    deltas: dict[str, float | None]
    regressions: list[str]
    improvements: list[str]


@dataclass(frozen=True)
class SavedRun:
    path: Path
    previous: dict[str, Any] | None


def score_case(case: Case, response: AskOut) -> CaseResult:
    answered = response.confidence != "out_of_scope"
    if not case.expect_answer:
        return CaseResult(case.id, False, not answered, answered, None, response.confidence)
    citation_ok: bool | None = None
    if answered:
        sources = {c.source for c in response.citations}
        citation_ok = bool(sources) and sources <= set(case.expected_sources)
    return CaseResult(
        case.id, True, answered and citation_ok is True, answered, citation_ok, response.confidence
    )


def summarize(results: Sequence[CaseResult]) -> Metrics:
    if not results:
        raise ValueError("no cases were evaluated")
    graded = [r.citation_ok for r in results if r.citation_ok is not None]
    negatives = [r for r in results if not r.expect_answer]
    return Metrics(
        accuracy=sum(r.correct for r in results) / len(results),
        citation_correctness=sum(graded) / len(graded) if graded else None,
        out_of_scope_refusal=sum(r.correct for r in negatives) / len(negatives)
        if negatives
        else None,
        total=len(results),
        answered=sum(r.answered for r in results),
    )


def load_cases(path: Path) -> list[Case]:
    cases: list[Case] = []
    seen: set[str] = set()
    for number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            raw = json.loads(line)
            case_id, question, expect = raw["id"], raw["question"], raw["expect_answer"]
            if not (
                isinstance(case_id, str) and isinstance(question, str) and isinstance(expect, bool)
            ):
                raise TypeError("id/question phải là chuỗi, expect_answer phải là true/false")
            sources = raw.get("expected_sources", [])
            if expect and not (isinstance(sources, list) and sources):
                raise ValueError("cần expected_sources khi expect_answer=true")
        except (ValueError, KeyError, TypeError) as exc:
            raise ValueError(f"dòng {number}: {exc}") from exc
        if case_id in seen:
            raise ValueError(f"dòng {number}: id trùng: {case_id}")
        seen.add(case_id)
        cases.append(Case(case_id, question, raw.get("hs_code"), expect, list(sources)))
    return cases


def diff_runs(previous: dict[str, Any] | None, current: dict[str, Any]) -> RunDiff | None:
    if previous is None:
        return None
    deltas: dict[str, float | None] = {}
    for key in METRIC_KEYS:
        before, after = previous["metrics"].get(key), current["metrics"].get(key)
        deltas[key] = None if before is None or after is None else after - before
    old, new = previous.get("cases", {}), current.get("cases", {})
    return RunDiff(
        deltas=deltas,
        regressions=sorted(c for c in new if old.get(c) is True and new[c] is False),
        improvements=sorted(c for c in new if old.get(c) is False and new[c] is True),
    )


def save_results(
    directory: Path, metrics: Metrics, results: Sequence[CaseResult], now: dt.datetime | None = None
) -> SavedRun:
    directory.mkdir(parents=True, exist_ok=True)
    existing = sorted(directory.glob("*.json"))
    previous = json.loads(existing[-1].read_text(encoding="utf-8")) if existing else None
    stamp = (now or dt.datetime.now(dt.UTC)).astimezone(dt.UTC)
    path = directory / f"{stamp.strftime('%Y%m%dT%H%M%SZ')}.json"
    payload = {
        "created_at": stamp.isoformat(),
        "metrics": asdict(metrics),
        "cases": {r.case_id: r.correct for r in results},
        "details": [asdict(r) for r in results],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return SavedRun(path=path, previous=previous)


async def run_eval(
    session: AsyncSession, embedder: EmbeddingModel, chat: ChatModel, cases: Sequence[Case]
) -> tuple[list[CaseResult], Metrics]:
    results: list[CaseResult] = []
    for case in cases:
        response = await service.ask(
            session,
            embedder,
            chat,
            AskIn(question=case.question, hs_code=case.hs_code, language="vi"),
            None,
            persist=False,  # eval không được làm nhiễu nhật ký câu hỏi của người dùng
        )
        results.append(score_case(case, response))
    return results, summarize(results)


def _percent(value: float | None) -> str:
    return "—" if value is None else f"{value:.1%}"


async def _run(cases: list[Case]) -> tuple[list[CaseResult], Metrics]:
    from app.core.db import get_sessionmaker

    async with get_sessionmaker()() as session:
        return await run_eval(session, get_embedding_model(), get_chat_model(), cases)


def main(argv: Sequence[str] | None = None) -> int:
    from scripts._console import use_utf8

    use_utf8()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))
    if not args.file.is_file():
        print(f"Không tìm thấy bộ câu hỏi: {args.file} (do luật TM cung cấp)", file=sys.stderr)
        return 1
    try:
        cases = load_cases(args.file)
        results, metrics = asyncio.run(_run(cases))
    except ValueError as exc:
        print(f"Lỗi dữ liệu: {exc}", file=sys.stderr)
        return 1
    saved = save_results(args.out, metrics, results)
    print(
        f"accuracy: {_percent(metrics.accuracy)}  ({metrics.total} câu, {metrics.answered} trả lời)"
    )
    print(f"citation_correctness: {_percent(metrics.citation_correctness)}")
    print(f"out_of_scope_refusal: {_percent(metrics.out_of_scope_refusal)}")
    change = diff_runs(saved.previous, json.loads(saved.path.read_text(encoding="utf-8")))
    if change is None:
        print("Chưa có lần chạy trước để so sánh.")
    else:
        for key, delta in change.deltas.items():
            print(
                f"  {key}: {'không so được' if delta is None else f'{delta:+.1%}'} so với lần trước"
            )
        print(f"  câu tệ đi: {change.regressions or 'không'}")
        print(f"  câu tốt lên: {change.improvements or 'không'}")
    print(f"Đã lưu: {saved.path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
