"""Nạp đủ danh mục HS 2022 (6 số) để seller niêm yết được mọi sản phẩm (U3).

    uv run python -m scripts.import_hs_nomenclature [hs2022_h6.csv] [hs_vi_names.csv]

- Chỉ THÊM mã còn thiếu; không sửa mã đã có (tên do PO duyệt ở data/hs_codes.csv, cờ hỗ trợ).
- Mã có tên tiếng Việt thông dụng trong data/hs_vi_names.csv dùng tên đó; mã khác dùng tên
  tiếng Anh. Mã đã nạp trước với tên tiếng Anh được nâng lên tên tiếng Việt khi file có thêm.
- Mã mới luôn is_calculator_supported = false: danh mục KHÔNG chứa thuế, không làm máy tính trả số.
"""

import asyncio
import csv
import io
import sys
from collections.abc import Sequence
from pathlib import Path

from app.core.db import get_sessionmaker
from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import merge_nomenclature
from scripts._console import use_utf8

DATA = Path(__file__).resolve().parents[1] / "data"
DEFAULT_NOMENCLATURE = DATA / "hs2022_h6.csv"
DEFAULT_VI_NAMES = DATA / "hs_vi_names.csv"
NAME_MAX = 255

# Nhóm hàng (khớp bảng industries) theo tiền tố mã; tiền tố dài hơn được xét trước. Chỉ để lọc danh
# bạ — không phải phân loại pháp lý. Mã không khớp để trống.
_CATEGORY_PREFIXES: dict[str, str] = {
    "1603": "seafood",
    "1604": "seafood",
    "1605": "seafood",
    "0801": "agriculture",
    "0802": "agriculture",
    "0409": "agriculture",
    "0901": "coffee_tea",
    "0902": "coffee_tea",
    "2101": "coffee_tea",
    "0903": "spices",
    "0904": "spices",
    "0905": "spices",
    "0906": "spices",
    "0907": "spices",
    "0908": "spices",
    "0909": "spices",
    "0910": "spices",
    "4001": "agriculture",
    "4414": "handicrafts",
    "4419": "handicrafts",
    "4420": "handicrafts",
    "4421": "handicrafts",
    "6911": "handicrafts",
    "6912": "handicrafts",
    "6913": "handicrafts",
    "9401": "handicrafts",
    "9403": "handicrafts",
    "03": "seafood",
    "07": "fruits_vegetables",
    "08": "fruits_vegetables",
    "06": "agriculture",
    "10": "agriculture",
    "11": "agriculture",
    "12": "agriculture",
    "13": "agriculture",
    "14": "agriculture",
    "23": "agriculture",
    "24": "agriculture",
    "02": "food_beverage",
    "04": "food_beverage",
    "15": "food_beverage",
    "16": "food_beverage",
    "17": "food_beverage",
    "18": "food_beverage",
    "19": "food_beverage",
    "20": "food_beverage",
    "21": "food_beverage",
    "22": "food_beverage",
    "46": "handicrafts",
    **{str(chapter): "textiles" for chapter in range(50, 64)},
}


def category_for(code: str) -> str | None:
    for length in (4, 2):
        category = _CATEGORY_PREFIXES.get(code[:length])
        if category:
            return category
    return None


def _truncate(text: str) -> str:
    text = " ".join(text.split())
    return text if len(text) <= NAME_MAX else text[: NAME_MAX - 1].rstrip() + "…"


def _rows(path: Path) -> list[dict[str, str]]:
    lines = [
        line
        for line in path.read_text(encoding="utf-8-sig").splitlines()
        if line.strip() and not line.startswith("#")
    ]
    return list(csv.DictReader(io.StringIO("\n".join(lines))))


def load_nomenclature(path: Path) -> list[tuple[str, str]]:
    rows = [((r.get("code") or "").strip(), (r.get("name_en") or "").strip()) for r in _rows(path)]
    bad = [code for code, name in rows if not (len(code) == 6 and code.isdigit() and name)]
    if bad:
        raise ValueError(f"mã HS không hợp lệ trong {path.name}: {bad[:5]}")
    return rows


def load_vi_names(path: Path) -> dict[str, str]:
    names: dict[str, str] = {}
    for r in _rows(path):
        code, name = (r.get("code") or "").strip(), (r.get("name_vi") or "").strip()
        if not (len(code) == 6 and code.isdigit() and name):
            raise ValueError(f"dòng tên tiếng Việt không hợp lệ: {code!r}")
        if code in names:
            raise ValueError(f"mã {code} lặp lại trong {path.name}")
        names[code] = name
    return names


def build_rows(nomenclature: Sequence[tuple[str, str]], vi_names: dict[str, str]) -> list[HsCodeIn]:
    known = {code for code, _ in nomenclature}
    unknown = sorted(set(vi_names) - known)
    if unknown:
        raise ValueError(f"tên tiếng Việt cho mã không có trong HS 2022: {unknown[:5]}")
    return [
        HsCodeIn(
            code=code,
            name_vi=_truncate(vi_names.get(code, name_en)),
            name_en=_truncate(name_en),
            category=category_for(code),
            is_calculator_supported=False,
        )
        for code, name_en in nomenclature
    ]


async def _merge(rows: Sequence[HsCodeIn], curated: set[str]) -> tuple[int, int]:
    async with get_sessionmaker()() as session:
        return await merge_nomenclature(session, rows, curated)


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    args = list(sys.argv[1:] if argv is None else argv)
    nomenclature_path = Path(args[0]) if args else DEFAULT_NOMENCLATURE
    vi_path = Path(args[1]) if len(args) > 1 else DEFAULT_VI_NAMES
    try:
        vi_names = load_vi_names(vi_path)
        rows = build_rows(load_nomenclature(nomenclature_path), vi_names)
    except (OSError, ValueError) as exc:
        print(f"Lỗi dữ liệu: {exc}", file=sys.stderr)
        return 1
    inserted, renamed = asyncio.run(_merge(rows, set(vi_names)))
    print(f"Đã thêm {inserted} mã HS mới, đổi {renamed} mã sang tên tiếng Việt ({len(rows)} mã).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
