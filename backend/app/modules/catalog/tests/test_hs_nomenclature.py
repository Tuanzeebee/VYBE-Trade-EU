"""U3: danh mục HS 2022 đầy đủ để niêm yết mọi sản phẩm; tên tiếng Việt thông dụng để gõ tên → gợi ý mã.

Nạp danh mục không bao giờ đụng mã đã có (tên do PO duyệt, cờ hỗ trợ máy tính) và không bao giờ bật
cờ is_calculator_supported — danh mục không chứa thuế (AGENTS.md §6.3).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.models import HsCode
from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import merge_nomenclature, search_hs_codes, upsert_hs_codes
from scripts.import_hs_nomenclature import (
    DEFAULT_NOMENCLATURE,
    DEFAULT_VI_NAMES,
    build_rows,
    category_for,
    load_nomenclature,
    load_vi_names,
)


def test_data_files_are_consistent() -> None:
    nomenclature = load_nomenclature(DEFAULT_NOMENCLATURE)
    assert len(nomenclature) > 5000
    assert len({code for code, _ in nomenclature}) == len(nomenclature)
    rows = build_rows(nomenclature, load_vi_names(DEFAULT_VI_NAMES))
    assert all(len(r.name_en) <= 255 and len(r.name_vi) <= 255 for r in rows)
    assert not any(r.is_calculator_supported for r in rows)
    by_code = {r.code: r for r in rows}
    assert (
        "cá tra" in by_code["030324"].name_vi.lower()
    )  # 030462 có tên duyệt ở hs_codes.csv, không đổi
    assert by_code["081060"].name_vi == "Sầu riêng tươi"


def test_category_follows_heading_before_chapter() -> None:
    assert category_for("030462") == "seafood"
    assert category_for("160521") == "seafood"  # chương 16 nhưng nhóm 1605 là thủy sản
    assert category_for("160100") == "food_beverage"
    assert category_for("090111") == "coffee_tea"
    assert category_for("090411") == "spices"
    assert category_for("080132") == "agriculture"
    assert category_for("081060") == "fruits_vegetables"
    assert category_for("610910") == "textiles"
    assert category_for("847130") is None


def _row(code: str, vi: str, en: str) -> HsCodeIn:
    return HsCodeIn(code=code, name_vi=vi, name_en=en, category=None, is_calculator_supported=False)


async def test_merge_adds_missing_codes_without_touching_reviewed_rows(
    db_session: AsyncSession,
) -> None:
    await upsert_hs_codes(
        db_session,
        [
            HsCodeIn(
                code="100630",
                name_vi="Gạo xát",
                name_en="Semi-milled or wholly milled rice",
                category="agriculture",
                is_calculator_supported=True,
            )
        ],
    )
    inserted, renamed = await merge_nomenclature(
        db_session,
        [_row("100630", "Gạo trắng", "Cereals; rice"), _row("999901", "Thứ mới", "New thing")],
        {"100630"},
    )
    assert (inserted, renamed) == (1, 0)
    rice = await db_session.get(HsCode, "100630")
    assert rice is not None
    assert (rice.name_vi, rice.is_calculator_supported) == ("Gạo xát", True)
    new = await db_session.get(HsCode, "999901")
    assert new is not None and new.is_calculator_supported is False


async def test_merge_upgrades_english_fallback_to_vietnamese_name(db_session: AsyncSession) -> None:
    await merge_nomenclature(
        db_session, [_row("999902", "Durians; fresh", "Durians; fresh")], set()
    )
    _, renamed = await merge_nomenclature(
        db_session, [_row("999902", "Sầu riêng tươi", "Durians; fresh")], {"999902"}
    )
    assert renamed == 1
    row = await db_session.scalar(select(HsCode).where(HsCode.code == "999902"))
    assert row is not None and row.name_vi == "Sầu riêng tươi"


async def test_product_name_search_ranks_the_closest_code_first(db_session: AsyncSession) -> None:
    """Gõ "cá tra" → phi lê cá tra đứng đầu, trước các mã chỉ có chữ "cá"."""
    await merge_nomenclature(
        db_session,
        [
            _row("999910", "Cá tra, cá basa đông lạnh nguyên con", "Catfish; frozen"),
            _row("999911", "Phi lê cá tra đông lạnh", "Catfish fillets; frozen"),
            _row("999912", "Cá ngừ đông lạnh loại khác, có cá tra trộn", "Tuna mix"),
        ],
        set(),
    )
    results = await search_hs_codes(db_session, "phi lê cá tra")
    assert results[0].code == "999911"
