"""lei_code: mã LEI tuỳ chọn cho buyer và exporter; chuẩn hoá chữ hoa; sai định dạng bị từ chối;
không lộ ra hồ sơ công khai."""

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import buyer_body, company_body, login_as

URL = "/api/me/company"
LEI = "5493001KJTIIGC8Y1R12"


async def test_buyer_saves_and_reads_lei_normalised(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buyer@x.de")
    r = await api_client.post(URL, json=buyer_body(lei_code=" 5493 001kjtiigc8y1r12 "))
    assert r.status_code == 201, r.text
    assert r.json()["lei_code"] == LEI
    assert (await api_client.get(URL)).json()["lei_code"] == LEI


async def test_exporter_can_also_have_a_lei(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(URL, json=company_body(lei_code=LEI))
    assert r.status_code == 201, r.text
    assert r.json()["lei_code"] == LEI


async def test_lei_is_optional_and_blank_means_none(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buyer@x.de")
    assert (await api_client.post(URL, json=buyer_body())).json()["lei_code"] is None
    r = await api_client.patch(URL, json={"lei_code": LEI})
    assert r.json()["lei_code"] == LEI
    cleared = await api_client.patch(URL, json={"lei_code": "  "})
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["lei_code"] is None


@pytest.mark.parametrize(
    "bad",
    ["TOO-SHORT", "5493001KJTIIGC8Y1R1", "5493001KJTIIGC8Y1R1X", "5493001KJTIIGC8Y1R1!"],
    ids=["short", "19-chars", "bad-check-digits", "symbol"],
)
async def test_malformed_lei_is_rejected(api_client: AsyncClient, bad: str) -> None:
    await login_as(api_client, "buyer", "buyer@x.de")
    r = await api_client.post(URL, json=buyer_body(lei_code=bad))
    assert r.status_code == 422


async def test_lei_is_not_on_the_public_profile(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    created = (await api_client.post(URL, json=company_body(lei_code=LEI))).json()
    await db_session.execute(
        text(
            "UPDATE companies SET verification_status = 'verified', verified_at = now() "
            "WHERE id = :id"
        ),
        {"id": created["id"]},
    )
    await api_client.post("/api/auth/logout")
    r = await api_client.get(f"/api/public/companies/{created['slug']}")
    assert r.status_code == 200, r.text
    assert "lei_code" not in r.json()
    assert LEI not in r.text
