"""Nạp loại bằng chứng từ backend/data/evidence_types_draft.csv (chạy lại nhiều lần không trùng).

    uv run python -m scripts.seed_evidence_types [đường-dẫn-file.csv]

Mọi dòng vào DB ở trạng thái CHƯA duyệt (reviewed_by = NULL); loại đã tồn tại không bị đè. Luật TM
duyệt từng loại qua API admin — chưa duyệt thì chưa dùng được (AGENTS.md §5.6, §6.1).
"""

import asyncio
import csv
import io
import sys
from collections.abc import Sequence
from pathlib import Path

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

import app.modules.auth.models  # noqa: F401 — cần bảng users cho khóa ngoại reviewed_by
from app.core.db import get_sessionmaker
from app.modules.verification.admin_schemas import EvidenceTypeIn
from app.modules.verification.models import EvidenceType
from scripts._console import use_utf8

DEFAULT_CSV = Path(__file__).resolve().parents[1] / "data" / "evidence_types_draft.csv"


def load_csv(path: Path) -> list[EvidenceTypeIn]:
    """Đọc CSV, bỏ dòng trống và dòng bắt đầu bằng '#'. Sai dòng nào báo đúng số dòng đó."""
    numbered = [
        (n, line)
        for n, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), start=1)
        if line.strip() and not line.startswith("#")
    ]
    line_numbers = [n for n, _ in numbered]
    reader = csv.DictReader(io.StringIO("\n".join(line for _, line in numbered)))
    rows: list[EvidenceTypeIn] = []
    for index, raw in enumerate(reader, start=1):
        line_no = line_numbers[index]
        months = (raw.get("validity_months") or "").strip()
        try:
            rows.append(
                EvidenceTypeIn(
                    code=(raw.get("code") or "").strip(),
                    name_vi=raw.get("name_vi") or "",
                    name_en=raw.get("name_en") or "",
                    group=(raw.get("group") or "").strip(),
                    validity_months=int(months) if months else None,
                    source=(raw.get("source") or "").strip() or None,
                )
            )
        except (ValidationError, ValueError) as exc:
            raise ValueError(f"dòng {line_no}: giá trị không hợp lệ") from exc
    return rows


async def seed_types(session: AsyncSession, rows: Sequence[EvidenceTypeIn]) -> int:
    """Thêm loại chưa có (chưa duyệt). Trả số loại mới; loại đã có giữ nguyên (kể cả đã duyệt)."""
    added = 0
    for row in rows:
        if await session.get(EvidenceType, row.code) is None:
            session.add(EvidenceType(**row.model_dump()))
            added += 1
    await session.commit()
    return added


async def _run(rows: Sequence[EvidenceTypeIn]) -> int:
    async with get_sessionmaker()() as session:
        return await seed_types(session, rows)


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    args = list(sys.argv[1:] if argv is None else argv)
    path = Path(args[0]) if args else DEFAULT_CSV
    if not path.is_file():
        print(f"Không tìm thấy file: {path}", file=sys.stderr)
        return 1
    try:
        rows = load_csv(path)
    except ValueError as exc:
        print(f"Lỗi dữ liệu: {exc}", file=sys.stderr)
        return 1
    print(f"Đã thêm {asyncio.run(_run(rows))} loại bằng chứng mới (chưa duyệt) từ {path.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
