"""Nạp danh mục mã HS từ backend/data/hs_codes.csv (chạy lại nhiều lần không trùng).

    uv run python -m scripts.seed_hs_codes [đường-dẫn-file.csv]

Thêm mã mới = thêm dòng vào file CSV rồi chạy lại. Danh mục KHÔNG chứa thuế/quy tắc xuất xứ.
"""

import asyncio
import csv
import io
import sys
from collections.abc import Sequence
from pathlib import Path

from pydantic import ValidationError

from app.core.db import get_sessionmaker
from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import upsert_hs_codes
from scripts._console import use_utf8

DEFAULT_CSV = Path(__file__).resolve().parents[1] / "data" / "hs_codes.csv"
_BOOLS = {"true": True, "false": False}


def load_csv(path: Path) -> list[HsCodeIn]:
    """Đọc CSV, bỏ dòng trống và dòng bắt đầu bằng '#'. Sai dòng nào báo đúng số dòng đó."""
    numbered = [
        (n, line)
        for n, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), start=1)
        if line.strip() and not line.startswith("#")
    ]
    line_numbers = [n for n, _ in numbered]
    reader = csv.DictReader(io.StringIO("\n".join(line for _, line in numbered)))
    rows: list[HsCodeIn] = []
    for index, raw in enumerate(reader, start=1):
        line_no = line_numbers[index]
        flag = (raw.get("is_calculator_supported") or "").strip().lower()
        if flag not in _BOOLS:
            raise ValueError(f"dòng {line_no}: is_calculator_supported phải là true hoặc false")
        try:
            rows.append(
                HsCodeIn(
                    code=(raw.get("code") or "").strip(),
                    name_vi=raw.get("name_vi") or "",
                    name_en=raw.get("name_en") or "",
                    category=(raw.get("category") or "").strip() or None,
                    is_calculator_supported=_BOOLS[flag],
                )
            )
        except ValidationError as exc:
            fields = ", ".join(str(err["loc"][0]) for err in exc.errors())
            raise ValueError(f"dòng {line_no}: giá trị không hợp lệ ({fields})") from exc
    return rows


async def _seed(rows: Sequence[HsCodeIn]) -> int:
    async with get_sessionmaker()() as session:
        return await upsert_hs_codes(session, rows)


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
    print(f"Đã nạp {asyncio.run(_seed(rows))} mã HS từ {path.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
