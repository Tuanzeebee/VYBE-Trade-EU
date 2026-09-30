"""export_markets: ghi mới chỉ nhận EU hoặc nước thành viên EU; dữ liệu cũ vẫn đọc được."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import company_body, login_as

URL = "/api/me/company"


@pytest.mark.parametrize("market", ["US", "JP", "ASEAN", "CN", "GB", "XX", "de"])
async def test_non_eu_market_is_rejected_on_create(api_client: AsyncClient, market: str) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(URL, json=company_body(export_markets=[market]))
    assert r.status_code == 422


@pytest.mark.parametrize("markets", [["EU"], ["DE", "FR", "NL"], ["EU", "IE"]])
async def test_eu_markets_are_accepted(api_client: AsyncClient, markets: list[str]) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(URL, json=company_body(export_markets=markets))
    assert r.status_code == 201, r.text
    assert sorted(r.json()["export_markets"]) == sorted(markets)


async def test_non_eu_market_is_rejected_on_update(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.post(URL, json=company_body(export_markets=["DE"]))).status_code == 201
    r = await api_client.patch(URL, json={"export_markets": ["US"]})
    assert r.status_code == 422


async def test_legacy_non_eu_market_survives_unrelated_update(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    created = (await api_client.post(URL, json=company_body(export_markets=["DE"]))).json()
    await db_session.execute(
        text("UPDATE company_export_markets SET market = 'US' WHERE company_id = :c"),
        {"c": uuid.UUID(created["id"])},
    )
    r = await api_client.patch(URL, json={"description_en": "Still fine."})
    assert r.status_code == 200, r.text
    assert r.json()["export_markets"] == ["US"]
