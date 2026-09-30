"""File EVFTA_20_ma_da_xac_minh.xlsx → dòng dữ liệu → DB (luôn CHƯA DUYỆT)."""

import datetime as dt
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import get_admin_by_email
from app.modules.catalog.models import HsCode
from app.modules.catalog.service import upsert_hs_codes
from app.modules.compliance import admin_service
from app.modules.compliance.models import ImportCountryTerm, ProductSpecificRule, TariffLine
from app.modules.compliance.service import find_lines, find_rules, find_terms
from scripts import verified_pack
from scripts.import_verified_pack import import_pack
from scripts.verified_pack import hs_rows, load_pack, psr_rows, tariff_rows, term_rows

ADMIN = "luat-tm@evfta.eu"
TODAY = dt.datetime.now(dt.UTC).date()
WHOLLY_OBTAINED = {"03061792", "03061799", "03032400", "03077100"}


def test_pack_shape() -> None:
    pack = load_pack()
    assert (pack.year, len(pack.rows), len(pack.terms)) == (2026, 20, 60)
    assert len({r.cn_code for r in pack.rows}) == 20 and all(len(r.cn_code) == 8 for r in pack.rows)
    assert {t.country for t in pack.terms} == {"DE", "FR", "NL"}


def test_tariff_rows_match_excel() -> None:
    by_code = {d.hs_code: d for _, d in tariff_rows(load_pack())}
    shrimp = by_code["03061792"]
    assert (str(shrimp.mfn_rate), str(shrimp.evfta_rate_current), shrimp.staging_category) == (
        "12",
        "0",
        "A",
    )
    assert shrimp.valid_from == dt.date(2020, 8, 1) == shrimp.zero_from
    assert str(by_code["03046200"].mfn_rate) == "5.5" and by_code["03046200"].zero_from == dt.date(
        2023, 1, 1
    )
    assert (str(by_code["08109075"].mfn_rate), str(by_code["08109020"].mfn_rate)) == ("8.8", "0")
    assert all(d.destination == "EU" and not d.quota_required for d in by_code.values())


def test_only_genuine_condition_notes_are_imported() -> None:
    notes = {d.hs_code: d.condition_note for _, d in tariff_rows(load_pack())}
    for code in ("03046200", "07123200", "08109075", "08013200", "08109020"):
        assert notes[code] is None, code
    assert "IUU" in (notes["03048700"] or "") and "IUU" in (notes["03034290"] or "")
    assert "vùng nuôi" in (notes["03077100"] or "")
    assert "dư lượng" in (notes["07096099"] or "")
    assert sum(1 for n in notes.values() if n) == 4


def test_internal_notes_are_kept_on_the_pack_not_in_the_import_rows() -> None:
    pack = load_pack()
    internal = {r.cn_code: r.internal_note for r in pack.rows if r.internal_note}
    assert set(internal) == {"03046200", "07123200", "08109075", "08013200", "08109020"}
    assert "luật sư" in (internal["07123200"] or "")
    shown = " ".join(d.condition_note or "" for _, d in tariff_rows(pack))
    for text in internal.values():
        assert text not in shown
    assert all(r.condition_note is None or r.internal_note is None for r in pack.rows)


def test_row_inconsistent_with_staging_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    # Lộ trình 'A' về 0% từ 2027 nhưng năm tính thuế là 2026: không thể dùng thuế EVFTA 0%.
    monkeypatch.setitem(verified_pack.ZERO_FROM, "A", dt.date(2027, 1, 1))
    with pytest.raises(ValueError, match="không khớp lộ trình"):
        load_pack()


def test_roo_mapping_is_conservative() -> None:
    rules = {d.hs_code: d for _, d in psr_rows(load_pack())}
    assert {c for c, d in rules.items() if not d.requires_expert} == WHOLLY_OBTAINED
    assert all(d.rule_type.value == "WO" and d.rule_text for d in rules.values())
    assert rules["03034290"].requires_expert  # điều kiện tàu chưa mô hình hoá
    assert "sugar" in (rules["08106000"].rule_text or "")


def test_vat_terms_match_excel() -> None:
    terms = {(d.hs_code, d.country): d for _, d in term_rows(load_pack())}
    assert [str(terms[("03061792", c)].vat_rate) for c in ("DE", "FR", "NL")] == ["7", "5.5", "9"]
    assert terms[("03061792", "FR")].label_languages == "fr"


@pytest.fixture
async def packed(db_session: AsyncSession, reviewer_id: object) -> AsyncSession:
    return db_session


async def count(session: AsyncSession, model: type) -> int:
    return int(await session.scalar(select(func.count()).select_from(model)) or 0)


async def test_import_is_unreviewed_and_hidden(packed: AsyncSession) -> None:
    report = await import_pack(packed, ADMIN, load_pack(), dry_run=False)
    assert report == {"tariff": (20, 0), "psr": (20, 0), "terms": (60, 0)}
    unreviewed = (TariffLine, ProductSpecificRule, ImportCountryTerm)
    for model in unreviewed:
        assert (
            await packed.scalar(
                select(func.count()).select_from(model).where(model.reviewed_by.is_not(None))
            )
            == 0
        )
    assert await find_lines(packed, "03061792", "EU", TODAY) == []
    assert await find_rules(packed, "03061792", TODAY) == []
    assert await find_terms(packed, "03061792", TODAY) == []


async def test_rerun_adds_nothing_and_dry_run_writes_nothing(packed: AsyncSession) -> None:
    pack = load_pack()
    dry = await import_pack(packed, ADMIN, pack, dry_run=True)
    assert dry == {"tariff": (20, 0), "psr": (20, 0), "terms": (60, 0)}
    assert await count(packed, TariffLine) == 0 and await count(packed, ImportCountryTerm) == 0
    await import_pack(packed, ADMIN, pack, dry_run=False)
    again = await import_pack(packed, ADMIN, pack, dry_run=False)
    assert again == {"tariff": (0, 20), "psr": (0, 20), "terms": (0, 60)}
    assert await count(packed, TariffLine) == 20 and await count(packed, ImportCountryTerm) == 60


async def test_hs_catalog_gets_the_twenty_codes(packed: AsyncSession) -> None:
    rows = hs_rows(load_pack())
    assert len(rows) == 20 and all(r.is_calculator_supported for r in rows)
    await upsert_hs_codes(packed, rows)
    await upsert_hs_codes(packed, rows)  # chạy lại không trùng
    eight = await packed.scalar(
        select(func.count()).select_from(HsCode).where(func.length(HsCode.code) == 8)
    )
    assert eight == 20


async def test_dry_run_requires_an_existing_admin(packed: AsyncSession) -> None:
    with pytest.raises(ValueError, match="không có tài khoản admin"):
        await import_pack(packed, "khong-co@evfta.eu", load_pack(), dry_run=True)


async def test_reviewed_import_serves_the_ranking_end_to_end(
    packed: AsyncSession, api_client: AsyncClient
) -> None:
    await import_pack(packed, ADMIN, load_pack(), dry_run=False)
    markets = {"hs_code": "03061792", "product_value": "100000.00"}
    before = (await api_client.post("/api/public/markets", json=markets)).json()
    assert before["status"] == "unsupported" and before["rows"] == []

    actor = await get_admin_by_email(packed, ADMIN)
    assert actor is not None
    line = await packed.scalar(select(TariffLine).where(TariffLine.hs_code == "03061792"))
    rule = await packed.scalar(
        select(ProductSpecificRule).where(ProductSpecificRule.hs_code == "03061792")
    )
    terms = list(
        await packed.scalars(
            select(ImportCountryTerm).where(ImportCountryTerm.hs_code == "03061792")
        )
    )
    assert line is not None and rule is not None and len(terms) == 3
    await admin_service.review_tariff_line(packed, actor, line.id)
    await admin_service.review_roo_rule(packed, actor, rule.id)
    for term in terms:
        await admin_service.review_country_term(packed, actor, term.id)

    roo = {"hs_code": "03061792", "materials_declared": True, "materials": []}
    assert (await api_client.post("/api/public/roo", json=roo)).json()["status"] == "pass"

    def top3(data: dict[str, Any]) -> list[tuple[str, str, str]]:
        return [(r["country"], r["total"], r["status"]) for r in data["rows"][:3]]

    ranked = (
        await api_client.post("/api/public/markets", json={**markets, "roo_status": "pass"})
    ).json()
    assert (ranked["status"], ranked["basis"]) == ("ok", "evfta")
    assert top3(ranked) == [
        ("FR", "5500.00", "ranked"),
        ("DE", "7000.00", "ranked"),
        ("NL", "9000.00", "ranked"),
    ]
    mfn = (await api_client.post("/api/public/markets", json=markets)).json()
    assert (mfn["status"], mfn["basis"]) == ("ok", "mfn")
    assert top3(mfn) == [
        ("FR", "18160.00", "ranked"),
        ("DE", "19840.00", "ranked"),
        ("NL", "22080.00", "ranked"),
    ]
