"""export_markets (U2): mọi nước (ISO-2) hoặc khối EU / ASEAN — không còn giới hạn ở EU.

Demo 30/9/2026: khách yêu cầu thị trường xuất khẩu không giới hạn ở châu Âu; exporter bán đi Mỹ,
Nhật, Hàn… là năng lực buyer cần thấy.
"""

import pytest
from httpx import AsyncClient

from app.modules.companies.tests.helpers import company_body, login_as

URL = "/api/me/company"


@pytest.mark.parametrize(
    "markets", [["EU"], ["DE", "FR", "NL"], ["US", "JP", "KR"], ["ASEAN", "CN", "GB"]]
)
async def test_any_market_is_accepted(api_client: AsyncClient, markets: list[str]) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(URL, json=company_body(export_markets=markets))
    assert r.status_code == 201, r.text
    assert sorted(r.json()["export_markets"]) == sorted(markets)


@pytest.mark.parametrize("market", ["de", "Germany", "E", "EUR", ""])
async def test_malformed_market_is_rejected(api_client: AsyncClient, market: str) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(URL, json=company_body(export_markets=[market]))
    assert r.status_code == 422


async def test_markets_can_be_replaced_on_update(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.post(URL, json=company_body(export_markets=["DE"]))).status_code == 201
    r = await api_client.patch(URL, json={"export_markets": ["US", "DE"]})
    assert r.status_code == 200, r.text
    assert r.json()["export_markets"] == ["DE", "US"]


async def test_unrelated_update_keeps_markets(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post(URL, json=company_body(export_markets=["US"]))
    r = await api_client.patch(URL, json={"description_en": "Still fine."})
    assert r.status_code == 200, r.text
    assert r.json()["export_markets"] == ["US"]
