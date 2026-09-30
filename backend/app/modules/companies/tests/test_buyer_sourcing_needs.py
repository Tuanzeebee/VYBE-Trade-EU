"""U5: nhu cầu mua hàng của buyer lưu trên server (trước đây chỉ trong trình duyệt); người liên hệ."""

import pytest
from httpx import AsyncClient

from app.modules.companies.tests.helpers import buyer_body, company_body, login_as

NEEDS = "/api/buyer/sourcing-needs"


async def _buyer(client: AsyncClient, email: str = "u5@x.de") -> None:
    await login_as(client, "buyer", email)
    r = await client.post(
        "/api/me/company", json=buyer_body(contact_name="Anna Weber", city="Hamburg")
    )
    assert r.status_code == 201, r.text
    assert (r.json()["contact_name"], r.json()["city"]) == ("Anna Weber", "Hamburg")


async def test_needs_start_empty_then_round_trip(api_client: AsyncClient) -> None:
    await _buyer(api_client)
    empty = (await api_client.get(NEEDS)).json()
    assert empty["products_text"] is None and empty["budget_currency"] == "EUR"
    body = {
        "products_text": "Phi lê cá tra đông lạnh, 120-170 g",
        "quantity": "40",
        "quantity_unit": "tonne",
        "frequency": "monthly",
        "certifications_wanted": ["BRCGS", "ASC", "BRCGS"],
        "min_supplier_tier": 2,
        "destination_country": "DE",
        "destination_port": "Hamburg",
        "incoterm": "CIF",
        "budget_amount": "2.90",
        "budget_currency": "EUR",
        "notes": "Giao hàng đều mỗi tháng quan trọng hơn giá.",
    }
    r = await api_client.put(NEEDS, json=body)
    assert r.status_code == 200, r.text
    saved = r.json()
    assert saved["certifications_wanted"] == ["ASC", "BRCGS"]
    assert (saved["quantity"], saved["budget_amount"]) == ("40.00", "2.90")
    assert (await api_client.get(NEEDS)).json() == saved


async def test_put_replaces_everything(api_client: AsyncClient) -> None:
    await _buyer(api_client)
    await api_client.put(NEEDS, json={"products_text": "Tiêu đen", "incoterm": "FOB"})
    r = await api_client.put(NEEDS, json={"products_text": "Hạt điều"})
    assert (r.json()["products_text"], r.json()["incoterm"]) == ("Hạt điều", None)


@pytest.mark.parametrize(
    "bad",
    [
        {"frequency": "daily"},
        {"min_supplier_tier": 4},
        {"incoterm": "FOBX"},
        {"budget_currency": "VND"},
        {"quantity": "0"},
        {"destination_country": "Germany"},
    ],
)
async def test_invalid_needs_are_rejected(api_client: AsyncClient, bad: dict[str, object]) -> None:
    await _buyer(api_client)
    assert (await api_client.put(NEEDS, json=bad)).status_code == 422


async def test_needs_require_session_and_buyer_role(api_client: AsyncClient) -> None:
    assert (await api_client.get(NEEDS)).status_code == 401
    await login_as(api_client, "exporter", "u5-exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    assert (await api_client.get(NEEDS)).status_code == 403
    assert (await api_client.put(NEEDS, json={})).status_code == 403


async def test_buyer_without_company_gets_404(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "u5-nocompany@x.de")
    assert (await api_client.get(NEEDS)).status_code == 404


async def test_each_buyer_sees_only_own_needs(api_client: AsyncClient) -> None:
    await _buyer(api_client, "u5-a@x.de")
    await api_client.put(NEEDS, json={"products_text": "Của A"})
    await _buyer(api_client, "u5-b@x.de")
    assert (await api_client.get(NEEDS)).json()["products_text"] is None
