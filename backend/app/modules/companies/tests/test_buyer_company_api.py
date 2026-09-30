import pytest
from httpx import AsyncClient
from sqlalchemy import inspect
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.schemas import CompanyFilters, CompanyOut
from app.modules.companies.service import list_companies
from app.modules.companies.tests.helpers import buyer_body, company_body, login_as


async def test_buyer_creates_and_reads_own_profile(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    r = await api_client.post("/api/me/company", json=buyer_body())
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["type"] == "buyer"
    assert created["country"] == "DE"
    assert created["vat_number"] == "DE123456789"
    assert created["company_size"] == "51_200"
    assert created["procurement_estimate"] == "500k_2m"
    assert created["sourcing_categories"] == ["agriculture", "spices"]
    assert created["export_markets"] == []
    assert (await api_client.get("/api/me/company")).json() == created


async def test_buyer_can_save_and_replace_sourcing_categories(api_client: AsyncClient) -> None:
    """Xong khi B2: buyer lưu được nhóm hàng quan tâm."""
    await login_as(api_client, "buyer", "buy@x.de")
    await api_client.post("/api/me/company", json=buyer_body())
    r = await api_client.patch("/api/me/company", json={"sourcing_categories": ["seafood"]})
    assert r.status_code == 200, r.text
    assert r.json()["sourcing_categories"] == ["seafood"]
    assert r.json()["vat_number"] == "DE123456789"  # trường không gửi giữ nguyên


async def test_buyer_without_categories_gets_empty_list(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    r = await api_client.post("/api/me/company", json=buyer_body(sourcing_categories=[]))
    assert r.status_code == 201
    assert r.json()["sourcing_categories"] == []


async def test_buyer_can_presign_logo(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    company = (await api_client.post("/api/me/company", json=buyer_body())).json()
    r = await api_client.post(
        "/api/uploads/presign", json={"purpose": "logo", "content_type": "image/webp"}
    )
    assert r.status_code == 200
    assert r.json()["key"].startswith(f"logos/{company['id']}/")


async def test_second_buyer_company_rejected_and_other_buyer_isolated(
    api_client: AsyncClient,
) -> None:
    await login_as(api_client, "buyer", "a@x.de")
    await api_client.post("/api/me/company", json=buyer_body())
    assert (await api_client.post("/api/me/company", json=buyer_body())).status_code == 409
    await login_as(api_client, "buyer", "b@x.de")
    r = await api_client.patch("/api/me/company", json={"legal_name": "Chiếm quyền"})
    assert r.status_code == 404


@pytest.mark.parametrize(
    "foreign",
    [
        {"export_markets": ["EU"]},
        {"languages_spoken": ["vi"]},
    ],
)
async def test_buyer_cannot_set_exporter_only_fields(
    api_client: AsyncClient, foreign: dict[str, object]
) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    assert (await api_client.post("/api/me/company", json=buyer_body(**foreign))).status_code == 422
    await api_client.post("/api/me/company", json=buyer_body())
    assert (await api_client.patch("/api/me/company", json=foreign)).status_code == 422


@pytest.mark.parametrize(
    "foreign",
    [
        {"procurement_estimate": "gt_10m"},
        {"vat_number": "DE123456789"},
        {"sourcing_categories": ["agriculture"]},
    ],
)
async def test_exporter_cannot_set_buyer_only_fields(
    api_client: AsyncClient, foreign: dict[str, object]
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (
        await api_client.post("/api/me/company", json=company_body(**foreign))
    ).status_code == 422
    await api_client.post("/api/me/company", json=company_body())
    assert (await api_client.patch("/api/me/company", json=foreign)).status_code == 422


@pytest.mark.parametrize(
    "bad",
    [
        {"company_size": "huge"},
        {"procurement_estimate": "a lot"},
        {"sourcing_categories": ["weapons"]},
        {"vat_number": "x" * 33},
        {"country": "Germany"},
    ],
)
async def test_invalid_buyer_fields_rejected(
    api_client: AsyncClient, bad: dict[str, object]
) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    assert (await api_client.post("/api/me/company", json=buyer_body(**bad))).status_code == 422


async def test_sourcing_categories_are_a_real_table(db_session: AsyncSession) -> None:
    def columns(conn: Connection, table: str) -> set[str]:
        return {c["name"] for c in inspect(conn).get_columns(table)}

    conn = await db_session.connection()
    assert {"company_id", "category"} <= await conn.run_sync(columns, "company_sourcing_categories")
    assert {"company_size", "procurement_estimate", "vat_number"} <= await conn.run_sync(
        columns, "companies"
    )


def _names(companies: list[CompanyOut]) -> list[str]:
    return sorted(c.legal_name for c in companies)


async def test_list_companies_filters_by_sourcing_category(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """K1/G2 dùng lại: tìm buyer theo nhóm hàng quan tâm."""
    rows = [
        ("a@x.de", buyer_body(legal_name="Rice Buyer", sourcing_categories=["agriculture"])),
        ("b@x.de", buyer_body(legal_name="Fish Buyer", sourcing_categories=["seafood", "spices"])),
    ]
    for email, body in rows:
        await login_as(api_client, "buyer", email)
        assert (await api_client.post("/api/me/company", json=body)).status_code == 201
    spices = await list_companies(db_session, CompanyFilters(sourcing="spices"))
    assert _names(spices) == ["Fish Buyer"]
    rice = await list_companies(db_session, CompanyFilters(sourcing="agriculture"))
    assert _names(rice) == ["Rice Buyer"]
    assert await list_companies(db_session, CompanyFilters(sourcing="textiles")) == []
