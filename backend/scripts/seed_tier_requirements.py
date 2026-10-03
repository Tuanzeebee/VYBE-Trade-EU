"""Nạp yêu cầu của từng cấp xác minh từ backend/data/tier_requirements_draft.csv (U20).

    uv run python -m scripts.seed_tier_requirements [đường-dẫn-file.csv]

Mọi dòng vào DB ở trạng thái CHƯA duyệt; dòng đã có (cùng loại công ty, cấp, mã) giữ nguyên, kể cả
đã duyệt. Chạy lại nhiều lần không trùng.
"""

import asyncio
import csv
import io
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import app.modules.auth.models  # noqa: F401 — cần bảng users cho khóa ngoại reviewed_by
from app.core.db import get_sessionmaker
from app.modules.verification.models import TierRequirement
from scripts._console import use_utf8

DEFAULT_CSV = Path(__file__).resolve().parents[1] / "data" / "tier_requirements_draft.csv"
KINDS = ("product_seller", "service_provider", "buyer")


def load_csv(path: Path = DEFAULT_CSV) -> list[dict[str, object]]:
    lines = [
        line
        for line in path.read_text(encoding="utf-8-sig").splitlines()
        if line.strip() and not line.startswith("#")
    ]
    rows: list[dict[str, object]] = []
    for number, raw in enumerate(csv.DictReader(io.StringIO("\n".join(lines))), start=1):
        tier = int(raw["tier"])
        if raw["company_kind"] not in KINDS or not 1 <= tier <= 3:
            raise ValueError(f"dòng dữ liệu {number}: loại công ty hoặc cấp không hợp lệ")
        if raw["kind"] not in ("evidence", "check", "manual") or not raw["code"].strip():
            raise ValueError(f"dòng dữ liệu {number}: kind hoặc code không hợp lệ")
        rows.append(
            {
                "company_kind": raw["company_kind"],
                "tier": tier,
                "kind": raw["kind"],
                "code": raw["code"].strip(),
                "label_vi": raw["label_vi"].strip(),
                "label_en": raw["label_en"].strip(),
                "is_required": raw["is_required"].strip().lower() == "true",
                "sort_order": int(raw["sort_order"] or 0),
                "source": (raw.get("source") or "").strip() or None,
            }
        )
    return rows


async def seed_requirements(session: AsyncSession, rows: list[dict[str, object]]) -> int:
    existing: set[tuple[object, object, object]] = {
        (kind, tier, code)
        for kind, tier, code in await session.execute(
            select(TierRequirement.company_kind, TierRequirement.tier, TierRequirement.code)
        )
    }
    added = 0
    for row in rows:
        key = (row["company_kind"], row["tier"], row["code"])
        if key in existing:
            continue
        session.add(TierRequirement(**row))
        existing.add(key)
        added += 1
    await session.flush()
    return added


async def main(path: Path) -> None:
    async with get_sessionmaker()() as session:
        added = await seed_requirements(session, load_csv(path))
        await session.commit()
    print(f"Đã thêm {added} yêu cầu cấp xác minh (chưa duyệt).")


if __name__ == "__main__":
    use_utf8()
    asyncio.run(main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV))
