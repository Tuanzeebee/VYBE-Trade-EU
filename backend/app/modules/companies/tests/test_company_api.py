import pytest
from httpx import AsyncClient
from sqlalchemy import inspect
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import clear_subscribers, subscribe
from app.modules.auth.service import create_admin
from app.modules.companies.events import CompanyUpdated
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as


async def test_create_and_read_my_company(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["type"] == "exporter"
    assert created["verification_status"] == "unverified"
    assert created["verification_level"] == "basic"
    assert created["slug"].startswith("cong-ty-tnhh-nong-san-viet")
    got = (await api_client.get("/api/me/company")).json()
    assert got == created
    assert sorted(got["export_markets"]) == ["DE", "EU"]
    assert sorted(got["languages_spoken"]) == ["en", "vi"]
    assert got["founded_year"] == 2018


async def test_get_my_company_404_before_creation(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.get("/api/me/company")).status_code == 404


async def test_second_company_for_same_user_is_rejected(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.post("/api/me/company", json=company_body())).status_code == 201
    assert (await api_client.post("/api/me/company", json=company_body())).status_code == 409


async def test_patch_updates_only_sent_fields_and_replaces_lists(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    r = await api_client.patch(
        "/api/me/company", json={"description_en": "Rice exporter.", "export_markets": ["FR"]}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["description_en"] == "Rice exporter."
    assert body["description_vi"] == "Gạo và cà phê xuất khẩu."
    assert body["export_markets"] == ["FR"]


async def test_other_user_cannot_touch_my_company(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "a@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    await login_as(api_client, "exporter", "b@x.vn")
    r = await api_client.patch("/api/me/company", json={"legal_name": "Chiếm quyền"})
    assert r.status_code == 404
    await login_as(api_client, "exporter", "a@x.vn")
    assert (await api_client.get("/api/me/company")).json()["legal_name"] == (
        "Công ty TNHH Nông Sản Việt"
    )


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/me/company"),
        ("POST", "/api/me/company"),
        ("PATCH", "/api/me/company"),
        ("POST", "/api/uploads/presign"),
    ],
)
async def test_requires_session(api_client: AsyncClient, method: str, path: str) -> None:
    r = await api_client.request(method, path, json={})
    assert r.status_code == 401


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/me/company"),
        ("POST", "/api/me/company"),
        ("PATCH", "/api/me/company"),
        ("POST", "/api/uploads/presign"),
    ],
)
async def test_admin_has_no_company_profile(
    api_client: AsyncClient, db_session: AsyncSession, method: str, path: str
) -> None:
    await create_admin(db_session, "root@x.vn", PASSWORD)
    r = await api_client.post("/api/auth/login", json={"email": "root@x.vn", "password": PASSWORD})
    assert r.status_code == 200
    r = await api_client.request(method, path, json=company_body())
    assert r.status_code == 403


@pytest.mark.parametrize(
    "bad",
    [
        {"legal_name": "   "},
        {"country": "Vietnam"},
        {"export_markets": ["Châu Âu"]},
        {"languages_spoken": ["Tiếng Việt"]},
        {"industry_sector": "weapons"},
        {"founded_year": 1500},
        {"founded_year": 2999},
        {"contact_email": "khong-phai-email"},
        {"website": "javascript:alert(1)"},
    ],
)
async def test_invalid_fields_rejected(api_client: AsyncClient, bad: dict[str, object]) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post("/api/me/company", json=company_body(**bad))
    assert r.status_code == 422


async def test_filter_fields_are_real_columns(db_session: AsyncSession) -> None:
    """Xong khi B1: mọi trường lọc/ghép là cột riêng, không nằm trong mô tả."""

    def columns(conn: Connection, table: str) -> set[str]:
        return {c["name"] for c in inspect(conn).get_columns(table)}

    conn = await db_session.connection()
    company_cols = await conn.run_sync(columns, "companies")
    assert {
        "country",
        "industry_sector",
        "founded_year",
        "registration_number",
        "tax_id",
        "verification_status",
        "verification_level",
    } <= company_cols
    assert {"company_id", "market"} <= await conn.run_sync(columns, "company_export_markets")
    assert {"company_id", "lang"} <= await conn.run_sync(columns, "company_languages")


async def test_create_and_update_publish_company_updated(api_client: AsyncClient) -> None:
    clear_subscribers()
    seen: list[CompanyUpdated] = []

    async def on_updated(event: CompanyUpdated) -> None:
        seen.append(event)

    subscribe(CompanyUpdated, on_updated)
    await login_as(api_client, "exporter", "exp@x.vn")
    created = (await api_client.post("/api/me/company", json=company_body())).json()
    await api_client.patch("/api/me/company", json={"website": "https://new.vn"})
    clear_subscribers()
    assert [str(e.company_id) for e in seen] == [created["id"], created["id"]]


async def test_presign_logo_for_own_company(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    company = (await api_client.post("/api/me/company", json=company_body())).json()
    r = await api_client.post(
        "/api/uploads/presign", json={"purpose": "logo", "content_type": "image/png"}
    )
    assert r.status_code == 200, r.text
    key = r.json()["key"]
    assert key.startswith(f"logos/{company['id']}/")
    assert r.json()["upload_url"].endswith(key)
    r = await api_client.patch("/api/me/company", json={"logo_key": key})
    assert r.status_code == 200


async def test_presign_rejects_non_image(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    r = await api_client.post(
        "/api/uploads/presign", json={"purpose": "logo", "content_type": "application/pdf"}
    )
    assert r.status_code == 422


async def test_presign_requires_company(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post(
        "/api/uploads/presign", json={"purpose": "logo", "content_type": "image/png"}
    )
    assert r.status_code == 404


async def test_logo_key_of_another_company_is_rejected(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.post("/api/me/company", json=company_body())
    r = await api_client.patch(
        "/api/me/company", json={"logo_key": "logos/00000000-0000-0000-0000-000000000000/x.png"}
    )
    assert r.status_code == 422
