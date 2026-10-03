"""U10: tìm theo tên sản phẩm xếp theo độ giống, danh bạ sản phẩm / nhà cung cấp dịch vụ tách riêng,
hồ sơ công khai đầy đủ hơn và mục "Dữ liệu đã kiểm"."""

import datetime as dt
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import login_as, product_body
from app.modules.directory.tests.test_search import URL, make_company, names

pytestmark = pytest.mark.usefixtures("hs_seeded")


async def add_service(
    client: AsyncClient, session: AsyncSession, email: str, name: str, *services: dict[str, Any]
) -> dict[str, Any]:
    created = await make_company(
        client, session, email, products=[], legal_name=name, offering_type="services"
    )
    await login_as(client, "exporter", email)
    for body in services:
        assert (await client.post("/api/exporter/services", json=body)).status_code == 201
    await client.post("/api/auth/logout")
    return created


async def test_product_name_relevance_beats_alphabetical_order(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_company(
        api_client,
        db_session,
        "a@x.vn",
        legal_name="Alpha Foods",
        products=[
            product_body(name="Tiêu đen Phú Quốc", hs_code="0904.11"),
            product_body(name="Hạt điều rang muối tẩm gia vị cay xuất khẩu", hs_code="0801.32"),
        ],
    )
    await make_company(
        api_client,
        db_session,
        "b@x.vn",
        legal_name="Beta Foods",
        products=[product_body(name="Hạt điều", hs_code="0801.32")],
    )
    assert await names(api_client) == ["Alpha Foods", "Beta Foods"]  # không từ khóa: theo tên
    assert await names(api_client, q="hạt điều") == ["Beta Foods", "Alpha Foods"]
    assert await names(api_client, q="hat dieu") == ["Beta Foods", "Alpha Foods"]  # không dấu

    items = (await api_client.get(URL, params={"q": "hạt điều"})).json()["items"]
    alpha = next(i for i in items if i["legal_name"] == "Alpha Foods")
    assert alpha["matched_product_names"] == ["Hạt điều rang muối tẩm gia vị cay xuất khẩu"]
    assert alpha["product_names"][0] == "Hạt điều rang muối tẩm gia vị cay xuất khẩu"


async def test_services_only_companies_have_their_own_listing(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_company(api_client, db_session, "p@x.vn", legal_name="Nông Sản Việt")
    await add_service(
        api_client,
        db_session,
        "s@x.vn",
        "Logistics Sài Gòn",
        {"category_code": "logistics_freight", "title": "Vận chuyển container lạnh đi EU"},
    )
    await add_service(
        api_client,
        db_session,
        "c@x.vn",
        "Đại lý Hải quan Minh",
        {"category_code": "customs_brokerage", "title": "Khai báo hải quan xuất khẩu"},
    )
    assert await names(api_client) == ["Nông Sản Việt"]  # danh bạ sản phẩm
    assert await names(api_client, kind="services") == ["Đại lý Hải quan Minh", "Logistics Sài Gòn"]
    assert await names(api_client, kind="services", q="container lạnh") == ["Logistics Sài Gòn"]
    assert await names(api_client, kind="services", service_category="customs_brokerage") == [
        "Đại lý Hải quan Minh"
    ]
    card = (await api_client.get(URL, params={"kind": "services"})).json()["items"][1]
    assert card["offering_type"] == "services"
    assert card["service_titles"] == ["Vận chuyển container lạnh đi EU"]
    assert card["service_categories"] == ["logistics_freight"]
    filters = (await api_client.get(f"{URL}/filters")).json()
    assert "logistics_freight" in filters["service_categories"]
    assert (await api_client.get(URL, params={"kind": "buyers"})).status_code == 422


async def test_public_profile_shows_capacity_and_hides_exact_location_by_default(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    created = await make_company(
        api_client,
        db_session,
        "a@x.vn",
        legal_name="Cà Phê Tây Nguyên",
        city="Đắk Lắk",
        factory_address="Km 5, QL14, Buôn Ma Thuột",
        capacity_value="1200",
        capacity_unit="tonne",
        capacity_period="year",
        facility_codes=[{"code_type": "growing_area", "code": "VN-DL-001"}],
    )
    profile = (await api_client.get(f"/api/public/companies/{created['slug']}")).json()
    assert (profile["city"], profile["location_public"], profile["factory_address"]) == (
        "Đắk Lắk",
        False,
        None,
    )
    assert (profile["capacity_value"], profile["capacity_unit"]) == ("1200.00", "tonne")
    assert profile["facility_codes"] == [{"code_type": "growing_area", "code": "VN-DL-001"}]
    assert profile["offering_type"] == "products" and profile["services"] == []

    await login_as(api_client, "exporter", "a@x.vn")
    await api_client.patch("/api/me/company", json={"location_public": True})
    await api_client.post("/api/auth/logout")
    db_session.expire_all()
    profile = (await api_client.get(f"/api/public/companies/{created['slug']}")).json()
    assert profile["factory_address"] == "Km 5, QL14, Buôn Ma Thuột"


async def test_credentials_list_only_approved_valid_public_certificates(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    created = await make_company(api_client, db_session, "a@x.vn", legal_name="Nông Sản Việt")
    await db_session.execute(
        text(
            'INSERT INTO evidence_types (code, name_vi, name_en, "group", is_active, '
            "reviewed_by, reviewed_at) VALUES ('haccp', 'HACCP', 'HACCP', 'quality', true, "
            ":r, now()), ('eur1_issued', 'EUR.1 đã cấp', 'Issued EUR.1', 'origin', true, :r, now())"
        ),
        {"r": reviewer_id},
    )
    today = dt.date.today()
    for type_code, status, expires in [
        ("haccp", "approved", today + dt.timedelta(days=90)),
        ("haccp", "approved", today - dt.timedelta(days=1)),  # hết hạn
        ("haccp", "pending", None),
        ("eur1_issued", "approved", None),  # nhóm origin không công khai
    ]:
        await db_session.execute(
            text(
                "INSERT INTO evidences (company_id, type_code, file_key, issuer, issued_at, "
                "expires_at, approval_status, reviewed_at) VALUES (CAST(:c AS uuid), :t, 'k', "
                "'SGS', :i, :e, CAST(:s AS evidence_approval_status), now())"
            ),
            {
                "c": created["id"],
                "t": type_code,
                "i": today - dt.timedelta(days=30),
                "e": expires,
                "s": status,
            },
        )
    r = await api_client.get(f"{URL}/{created['slug']}/credentials")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["verified_by"] == "VYBE Trade" and body["verified_at"]
    assert body["origin_evidence_complete"] is False
    assert [(c["type_code"], c["issuer"]) for c in body["certificates"]] == [("haccp", "SGS")]
    assert "file_key" not in str(body)


async def test_credentials_are_404_for_companies_not_publicly_listed(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    created = await make_company(
        api_client, db_session, "a@x.vn", legal_name="Chưa đạt", status="pending"
    )
    assert (await api_client.get(f"{URL}/{created['slug']}/credentials")).status_code == 404
    assert (await api_client.get(f"{URL}/khong-co/credentials")).status_code == 404
