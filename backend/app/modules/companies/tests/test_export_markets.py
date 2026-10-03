"""export_markets (U2): mọi nước (ISO-2) hoặc khối EU / ASEAN — không còn giới hạn ở EU.

Demo 30/9/2026: khách yêu cầu thị trường xuất khẩu không giới hạn ở châu Âu; exporter bán đi Mỹ,
Nhật, Hàn… là năng lực buyer cần thấy.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import buyer_body, company_body, login_as

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


# --- B10: chính ngạch / tiểu ngạch theo từng thị trường (tự khai, tuỳ chọn) ---


async def test_channel_is_saved_per_market_and_optional(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(
        URL,
        json=company_body(
            export_markets=["EU", "CN", "US"],
            export_market_channels={"EU": "official", "CN": "unofficial"},
        ),
    )
    assert r.status_code == 201, r.text
    # US không khai kênh: vắng trong dict, không bị coi là một giá trị.
    assert r.json()["export_market_channels"] == {"EU": "official", "CN": "unofficial"}
    assert sorted(r.json()["export_markets"]) == ["CN", "EU", "US"]


async def test_no_channels_by_default(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(URL, json=company_body(export_markets=["EU"]))
    assert r.json()["export_market_channels"] == {}


async def test_patch_markets_only_keeps_existing_channels(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post(
        URL,
        json=company_body(
            export_markets=["EU", "CN"],
            export_market_channels={"EU": "official", "CN": "unofficial"},
        ),
    )
    r = await api_client.patch(URL, json={"export_markets": ["EU", "JP"]})
    assert r.status_code == 200, r.text
    assert r.json()["export_markets"] == ["EU", "JP"]
    # CN bị bỏ nên kênh bỏ theo; EU giữ; JP mới chưa có kênh.
    assert r.json()["export_market_channels"] == {"EU": "official"}


async def test_patch_channels_only_replaces_channels(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post(
        URL,
        json=company_body(export_markets=["EU", "CN"], export_market_channels={"EU": "official"}),
    )
    r = await api_client.patch(URL, json={"export_market_channels": {"CN": "unofficial"}})
    assert r.status_code == 200, r.text
    assert r.json()["export_markets"] == ["CN", "EU"]
    assert r.json()["export_market_channels"] == {"CN": "unofficial"}
    cleared = await api_client.patch(URL, json={"export_market_channels": {}})
    assert cleared.json()["export_market_channels"] == {}


async def test_unrelated_update_keeps_channels(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post(
        URL, json=company_body(export_markets=["EU"], export_market_channels={"EU": "official"})
    )
    r = await api_client.patch(URL, json={"description_en": "Still fine."})
    assert r.json()["export_market_channels"] == {"EU": "official"}


@pytest.mark.parametrize(
    "channels",
    [{"EU": "grey"}, {"EU": ""}, {"de": "official"}, {"US": "official"}],
    ids=["unknown-value", "empty-value", "bad-market-code", "market-not-listed"],
)
async def test_bad_channel_is_rejected(api_client: AsyncClient, channels: dict[str, str]) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(
        URL, json=company_body(export_markets=["EU"], export_market_channels=channels)
    )
    assert r.status_code == 422


async def test_buyer_cannot_set_channels(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buy@x.eu")
    r = await api_client.post(URL, json=buyer_body(export_market_channels={"EU": "official"}))
    assert r.status_code == 422


async def test_channel_is_not_exposed_on_public_profile(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    created = (
        await api_client.post(
            URL,
            json=company_body(export_markets=["EU"], export_market_channels={"EU": "unofficial"}),
        )
    ).json()
    await db_session.execute(
        text(
            "UPDATE companies SET verification_status = 'verified', verified_at = now() WHERE id = :id"
        ),
        {"id": created["id"]},
    )
    await api_client.post("/api/auth/logout")
    r = await api_client.get(f"/api/public/companies/{created['slug']}")
    assert r.status_code == 200, r.text
    assert "export_market_channels" not in r.json()
    assert "unofficial" not in r.text
