"""U16: gợi ý thị trường trên file chụp số liệu THẬT của Eurostat (data/trade_flows_eurostat_snapshot.csv,
lấy ngày 01/10/2026). Khẳng định dạng bền: cấu trúc và quy tắc, không cố định từng con số."""

from decimal import Decimal
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.trade_stats import parse_flow_csv
from app.modules.markets.recommendation import fold, resolve_family
from app.modules.markets.service import upsert_rows

SNAPSHOT = Path(__file__).resolve().parents[4] / "data" / "trade_flows_eurostat_snapshot.csv"
URL = "/api/public/markets/recommendation"


@pytest.fixture
async def snapshot(db_session: AsyncSession) -> None:
    rows = parse_flow_csv(SNAPSHOT.read_text(encoding="utf-8"))
    await upsert_rows(db_session, "eurostat_comext", rows, None)
    await db_session.flush()


def test_keywords_resolve_to_product_families() -> None:
    assert fold("  Cá   TRA ") == "ca tra"
    family = resolve_family("phi lê cá tra đông lạnh", None)
    assert family is not None and family.family == "pangasius"
    assert set(family.products) == {"030462", "030432"}
    assert resolve_family("ca tra", None) == family  # không dấu cũng khớp
    shrimp = resolve_family("", "030617")
    assert shrimp is not None and shrimp.family == "shrimp"
    assert resolve_family("xe máy", None) is None


@pytest.mark.usefixtures("snapshot")
async def test_pangasius_recommendation_from_real_statistics(api_client: AsyncClient) -> None:
    r = await api_client.get(URL, params={"q": "cá tra"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert (body["status"], body["family"]["family"], body["year"]) == ("ok", "pangasius", 2025)
    assert body["source"].startswith("Eurostat Comext")
    assert len(body["top_markets"]) == 3
    for market in body["top_markets"]:
        assert Decimal(market["vn_share"]) >= Decimal("0.01")
        codes = [reason["code"] for reason in market["reasons"]]
        assert codes[:2] == ["import_size", "vn_share"]
    top = {m["country"] for m in body["top_markets"]}
    assert not top & {m["country"] for m in body["potential_markets"]}
    for market in body["potential_markets"]:
        assert Decimal(market["vn_share"]) < Decimal("0.10")
    assert body["vn_rank"] == 1  # Việt Nam là nguồn cung ngoài EU lớn nhất của cá tra
    assert body["competitors"][0]["partner"] == "VN"
    assert len(body["countries"]) >= 20
    scores = [Decimal(m["score"]) for m in body["countries"]]
    assert scores == sorted(scores, reverse=True)


@pytest.mark.usefixtures("snapshot")
async def test_shrimp_competitors_exclude_eu_members_and_aggregates(
    api_client: AsyncClient,
) -> None:
    body = (await api_client.get(URL, params={"hs": "030617"})).json()
    partners = [c["partner"] for c in body["competitors"]]
    assert "VN" in partners or body["vn_rank"] is not None
    assert not {"ES", "NL", "BE", "WORLD", "EXT_EU27_2020", "INT_EU27_2020"} & set(partners)
    shares = [Decimal(c["share"]) for c in body["competitors"]]
    assert shares == sorted(shares, reverse=True) and sum(shares) <= Decimal(1)
    assert body["hhi"] is not None and Decimal(0) < Decimal(body["hhi"]) <= Decimal(10000)


async def test_unknown_product_returns_suggestions(api_client: AsyncClient) -> None:
    body = (await api_client.get(URL, params={"q": "xe máy"})).json()
    assert body["status"] == "no_data" and body["top_markets"] == []
    assert {"pangasius", "shrimp", "rice"} <= {s["family"] for s in body["suggestions"]}
    assert (await api_client.get(URL)).status_code == 422
    assert (await api_client.get(URL, params={"hs": "12"})).status_code == 422


async def test_known_family_without_imported_data_is_no_data(api_client: AsyncClient) -> None:
    body = (await api_client.get(URL, params={"q": "cà phê"})).json()
    assert (body["status"], body["family"]["family"]) == ("no_data", "coffee")
