import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import (
    get_hs_code,
    normalize_code,
    search_hs_codes,
    upsert_hs_codes,
)


async def _codes(session: AsyncSession, q: str) -> list[str]:
    return [h.code for h in await search_hs_codes(session, q)]


@pytest.mark.parametrize(
    "q",
    ["gạo", "gao", "GẠO", "rice", "Semi-milled", "1006", "1006.30", "100630", " 1006 30 ", "10063"],
)
async def test_rice_found_by_name_or_code(seeded: AsyncSession, q: str) -> None:
    """Xong khi B4: gõ 'gạo', 'rice' hoặc '1006' đều gợi ý đúng mã."""
    codes = await _codes(seeded, q)
    assert codes == ["100630"], codes


@pytest.mark.parametrize(("q", "expected"), [("30617", "030617"), ("3061792", "03061792")])
async def test_code_missing_its_leading_zero_is_still_found(
    seeded: AsyncSession, q: str, expected: str
) -> None:
    """Bảng tính hay làm mất số 0 đầu của mã chương 01–09 (03061792 → 3061792)."""
    await upsert_hs_codes(
        seeded,
        [
            HsCodeIn(
                code="03061792",
                name_vi="Tôm chi Penaeus",
                name_en="Shrimps",
                is_calculator_supported=True,
            )
        ],
    )
    assert expected in await _codes(seeded, q)


async def test_short_digit_prefix_is_not_padded(seeded: AsyncSession) -> None:
    """Chỉ mã đủ độ dài (5 hoặc 7 số) mới được bù số 0; tiền tố ngắn giữ nghĩa cũ."""
    assert await _codes(seeded, "306") == []


@pytest.mark.parametrize("q", ["tom dong lanh", "tôm đông lạnh", "lanh dong tom", "frozen shrimps"])
async def test_multi_word_queries_ignore_order_and_accents(seeded: AsyncSession, q: str) -> None:
    assert "030617" in await _codes(seeded, q)


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("cà phê", {"090111", "090121", "210111"}),
        ("ca phe", {"090111", "090121", "210111"}),
        ("coffee", {"090111", "090121", "210111"}),
        ("quế", {"090619"}),
        ("cinnamon", {"090619"}),
        ("mat ong", {"040900"}),
        ("honey", {"040900"}),
        ("sau rieng", {"081060"}),
        ("durian", {"081060"}),
        ("nuoc mam", {"210390"}),
        ("09", {"090111", "090121", "090240", "090411", "090619"}),
    ],
)
async def test_other_products_found(seeded: AsyncSession, q: str, expected: set[str]) -> None:
    assert set(await _codes(seeded, q)) == expected


@pytest.mark.parametrize("q", ["", "   ", "%", "_", "%%", "\\"])
async def test_empty_or_wildcard_query_returns_nothing(seeded: AsyncSession, q: str) -> None:
    assert await _codes(seeded, q) == []


async def test_code_outside_catalog_is_never_returned(seeded: AsyncSession) -> None:
    assert await _codes(seeded, "0101") == []  # ngựa sống — không thuộc danh mục
    assert await _codes(seeded, "010121") == []
    assert await get_hs_code(seeded, "010121") is None


async def test_result_shape_and_supported_flag(seeded: AsyncSession) -> None:
    (rice,) = await search_hs_codes(seeded, "1006.30")
    assert rice.formatted == "1006.30"
    assert (rice.name_vi, rice.name_en) == ("Gạo xát", "Semi-milled or wholly milled rice")
    assert rice.chapter == "10"
    assert rice.category == "agriculture"
    assert rice.supported is True


async def test_categories_follow_the_agreed_mapping(seeded: AsyncSession) -> None:
    expected = {
        "agriculture": {
            "090111", "090121", "090240", "080132", "080111", "080450",
            "081060", "081090", "081190", "100630", "040900",
        },
        "spices": {"090411", "090619"},
        "seafood": {"030617", "160529", "030462", "160414"},
        "food_beverage": {"200899", "190219", "210390"},
    }  # fmt: skip
    for category, codes in expected.items():
        for code in codes:
            hs = await get_hs_code(seeded, code)
            assert hs is not None
            assert hs.category == category, code


async def test_search_returns_at_most_20(seeded: AsyncSession) -> None:
    extra = [
        HsCodeIn(code=f"1006{i:02d}", name_vi=f"Gạo loại {i}", name_en=f"Rice kind {i}")
        for i in range(40)
    ]
    await upsert_hs_codes(seeded, extra)
    assert len(await search_hs_codes(seeded, "gao")) == 20


@pytest.mark.parametrize(
    ("raw", "code"),
    [
        ("1006.30", "100630"),
        ("100630", "100630"),
        (" 1006 30 ", "100630"),
        ("1006.30.00", "10063000"),
        ("1006", None),
        ("abc", None),
        ("1006.3O", None),
        ("", None),
        ("123456789", None),
    ],
)
def test_normalize_code(raw: str, code: str | None) -> None:
    assert normalize_code(raw) == code


async def test_get_hs_code_accepts_dotted_and_plain(seeded: AsyncSession) -> None:
    a, b = await get_hs_code(seeded, "1006.30"), await get_hs_code(seeded, "100630")
    assert a is not None
    assert a == b


async def test_upsert_is_idempotent_and_updates(seeded: AsyncSession) -> None:
    count = await seeded.scalar(text("SELECT count(*) FROM hs_codes"))
    assert count == 30
    await upsert_hs_codes(
        seeded,
        [
            HsCodeIn(
                code="100630",
                name_vi="Gạo xát (đã sửa)",
                name_en="Milled rice",
                category="agriculture",
            )
        ],
    )
    assert await seeded.scalar(text("SELECT count(*) FROM hs_codes")) == 30
    hs = await get_hs_code(seeded, "100630")
    assert hs is not None
    assert hs.name_vi == "Gạo xát (đã sửa)"
    assert hs.supported is False  # mặc định không hỗ trợ nếu không nói rõ


@pytest.mark.parametrize(
    "bad_code",
    ["10063", "1006A0", "100630000"],
)
async def test_db_rejects_malformed_code(db_session: AsyncSession, bad_code: str) -> None:
    with pytest.raises(
        (IntegrityError, DBAPIError)
    ):  # 9 chữ số vượt độ dài cột trước khi tới CHECK
        await db_session.execute(
            text(
                "INSERT INTO hs_codes (code, name_vi, name_en, chapter) VALUES (:c, 'x', 'x', '10')"
            ),
            {"c": bad_code},
        )


async def test_db_rejects_chapter_not_matching_code(db_session: AsyncSession) -> None:
    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(
                "INSERT INTO hs_codes (code, name_vi, name_en, chapter) "
                "VALUES ('100630', 'x', 'x', '09')"
            )
        )


async def test_trigram_indexes_exist(db_session: AsyncSession) -> None:
    rows = await db_session.execute(
        text("SELECT indexdef FROM pg_indexes WHERE tablename = 'hs_codes'")
    )
    defs = " ".join(r[0] for r in rows)
    assert "gin_trgm_ops" in defs
    assert "immutable_unaccent" in defs


async def test_public_endpoint_needs_no_session(
    seeded: AsyncSession, api_client: AsyncClient
) -> None:
    r = await api_client.get("/api/public/hs-codes", params={"q": "gao"})
    assert r.status_code == 200
    (item,) = r.json()
    assert item == {
        "code": "100630",
        "formatted": "1006.30",
        "name_vi": "Gạo xát",
        "name_en": "Semi-milled or wholly milled rice",
        "chapter": "10",
        "category": "agriculture",
        "supported": True,
    }


async def test_public_endpoint_empty_and_too_long_query(api_client: AsyncClient) -> None:
    assert (await api_client.get("/api/public/hs-codes", params={"q": ""})).json() == []
    assert (await api_client.get("/api/public/hs-codes")).json() == []
    r = await api_client.get("/api/public/hs-codes", params={"q": "x" * 101})
    assert r.status_code == 422
