"""Nạp tiêu chí điểm tín nhiệm từ backend/data/trust_criteria_draft.csv (U23).

    uv run python -m scripts.seed_trust_criteria [đường-dẫn-file.csv]

Mọi dòng vào DB ở trạng thái CHƯA duyệt, is_demo = true; tiêu chí đã có (cùng fact_key) giữ nguyên.
"""

import asyncio
import csv
import io
import sys
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import app.modules.auth.models  # noqa: F401 — cần bảng users cho khóa ngoại reviewed_by
from app.core.db import get_sessionmaker
from app.modules.verification.models import TrustCriterion
from app.modules.verification.trust import COMPONENTS, fact_values
from scripts._console import use_utf8

DEFAULT_CSV = Path(__file__).resolve().parents[1] / "data" / "trust_criteria_draft.csv"


def known_fact_keys() -> set[str]:
    from app.modules.verification.trust import TrustFacts

    return set(fact_values(TrustFacts(False, 0, 0, False, set())))


def load_csv(path: Path = DEFAULT_CSV) -> list[dict[str, object]]:
    lines = [
        line
        for line in path.read_text(encoding="utf-8-sig").splitlines()
        if line.strip() and not line.startswith("#")
    ]
    known = known_fact_keys()
    rows: list[dict[str, object]] = []
    for number, raw in enumerate(csv.DictReader(io.StringIO("\n".join(lines))), start=1):
        if raw["component"] not in COMPONENTS or raw["fact_key"] not in known:
            raise ValueError(f"dòng dữ liệu {number}: thành phần hoặc fact_key không hợp lệ")
        rows.append(
            {
                "component": raw["component"],
                "fact_key": raw["fact_key"],
                "label_vi": raw["label_vi"].strip(),
                "label_en": raw["label_en"].strip(),
                "weight": Decimal(raw["weight"]),
                "sort_order": int(raw["sort_order"] or 0),
                "is_demo": True,
            }
        )
    return rows


async def seed_criteria(session: AsyncSession, rows: list[dict[str, object]]) -> int:
    existing = set(await session.scalars(select(TrustCriterion.fact_key)))
    added = 0
    for row in rows:
        if row["fact_key"] in existing:
            continue
        session.add(TrustCriterion(**row))
        added += 1
    await session.flush()
    return added


async def main(path: Path) -> None:
    async with get_sessionmaker()() as session:
        added = await seed_criteria(session, load_csv(path))
        await session.commit()
    print(f"Đã thêm {added} tiêu chí điểm tín nhiệm (nháp, chưa duyệt).")


if __name__ == "__main__":
    use_utf8()
    asyncio.run(main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV))
