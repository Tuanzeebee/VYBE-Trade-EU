"""U2: hồ sơ seller vừa đủ — sản phẩm/dịch vụ, người đại diện, cơ quan cấp, năng lực, mã cơ sở,
nhà cung cấp dịch vụ và danh mục ngành hàng (có "Khác")."""

import typing
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.models import IndustryCategory
from app.modules.companies.schemas import Industry
from app.modules.companies.tests.helpers import buyer_body, company_body, login_as

URL = "/api/me/company"
SERVICES = "/api/exporter/services"


def service_body(**overrides: object) -> dict[str, object]:
    body: dict[str, object] = {
        "category_code": "customs_brokerage",
        "title": "Khai báo hải quan hàng nông sản xuất khẩu",
        "description_vi": "Đại lý hải quan tại cảng Cát Lái, xử lý tờ khai xuất khẩu nông sản trong 24h.",
        "coverage_countries": ["VN"],
    }
    body.update(overrides)
    return body


async def test_seller_saves_legal_contact_and_capacity(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "u2-a@x.vn")
    r = await api_client.post(
        URL,
        json=company_body(
            legal_rep_name="Nguyễn Văn Trí",
            legal_rep_title="Giám đốc",
            phone="+84 28 3829 9842",
            issuing_authority="Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh",
            factory_address="KCN Phước Đông, Tây Ninh",
            capacity_value="1500.00",
            capacity_unit="tonne",
            capacity_period="year",
            company_size="51_200",
            main_customers="Một nhà nhập khẩu tại Hamburg (khách hàng từ 2021)",
            facility_codes=[
                {"code_type": "growing_area", "code": "VN-DL-0489"},
                {"code_type": "packing_facility", "code": "PHC-102"},
                {"code_type": "growing_area", "code": "VN-DL-0489"},
            ],
        ),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["offering_type"] == "products"  # mặc định với seller
    assert body["legal_rep_name"] == "Nguyễn Văn Trí"
    # Lưu đúng như in trên giấy tờ; giao diện tự đổi tên hiển thị.
    assert body["issuing_authority"] == "Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh"
    assert Decimal(body["capacity_value"]) == Decimal("1500.00")
    assert body["company_size"] == "51_200"
    assert body["facility_codes"] == [
        {"code_type": "growing_area", "code": "VN-DL-0489"},
        {"code_type": "packing_facility", "code": "PHC-102"},
    ]


async def test_facility_codes_are_replaced_on_update(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "u2-b@x.vn")
    await api_client.post(
        URL, json=company_body(facility_codes=[{"code_type": "growing_area", "code": "A"}])
    )
    r = await api_client.patch(
        URL, json={"facility_codes": [{"code_type": "establishment", "code": "DL 123"}]}
    )
    assert r.status_code == 200, r.text
    assert r.json()["facility_codes"] == [{"code_type": "establishment", "code": "DL 123"}]


@pytest.mark.parametrize(
    "bad",
    [
        {"offering_type": "goods"},
        {"capacity_value": "0"},
        {"capacity_period": "week"},
        {"phone": "call me"},
        {"facility_codes": [{"code_type": "farm", "code": "X"}]},
    ],
)
async def test_invalid_seller_fields_are_rejected(
    api_client: AsyncClient, bad: dict[str, object]
) -> None:
    await login_as(api_client, "exporter", "u2-c@x.vn")
    assert (await api_client.post(URL, json=company_body(**bad))).status_code == 422


@pytest.mark.parametrize(
    "foreign",
    [
        {"offering_type": "services"},
        {"factory_address": "KCN"},
        {"capacity_value": "10"},
        {"main_customers": "X"},
        {"facility_codes": [{"code_type": "growing_area", "code": "A"}]},
    ],
)
async def test_buyer_cannot_set_seller_only_fields(
    api_client: AsyncClient, foreign: dict[str, object]
) -> None:
    await login_as(api_client, "buyer", "u2-buyer@x.de")
    assert (await api_client.post(URL, json=buyer_body(**foreign))).status_code == 422


async def test_buyer_has_no_offering_type(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "u2-buyer2@x.de")
    r = await api_client.post(URL, json=buyer_body())
    assert r.status_code == 201, r.text
    assert r.json()["offering_type"] is None


async def test_industry_other_is_kept_only_with_other(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "u2-d@x.vn")
    r = await api_client.post(
        URL, json=company_body(industry_sector="other", industry_other="Dược liệu")
    )
    assert r.status_code == 201, r.text
    assert (r.json()["industry_sector"], r.json()["industry_other"]) == ("other", "Dược liệu")
    r = await api_client.patch(URL, json={"industry_sector": "seafood"})
    assert r.json()["industry_other"] is None


async def test_foreign_seller_can_register(api_client: AsyncClient) -> None:
    """Seller không giới hạn ở Việt Nam (demo 30/9)."""
    await login_as(api_client, "exporter", "u2-th@x.th")
    r = await api_client.post(URL, json=company_body(country="TH", tax_id="0105551234567"))
    assert r.status_code == 201, r.text
    assert r.json()["country"] == "TH"


async def test_industry_literal_matches_catalog_table(db_session: AsyncSession) -> None:
    codes = set(await db_session.scalars(select(IndustryCategory.code)))
    assert codes == set(typing.get_args(Industry))


async def test_public_catalogs_list_industries_and_service_categories(
    api_client: AsyncClient,
) -> None:
    industries = (await api_client.get("/api/public/industries")).json()
    assert industries[-1] == {"code": "other", "name_vi": "Khác", "name_en": "Other"}
    categories = {
        c["code"] for c in (await api_client.get("/api/public/service-categories")).json()
    }
    assert {"logistics_freight", "customs_brokerage", "accounting_tax", "other"} <= categories


# ── Dịch vụ của nhà cung cấp dịch vụ ────────────────────────────────────────────────────
async def test_service_provider_crud(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "u2-svc@x.vn")
    await api_client.post(URL, json=company_body(offering_type="services"))
    created = await api_client.post(SERVICES, json=service_body())
    assert created.status_code == 201, created.text
    service = created.json()
    assert service["category_name_vi"] == "Đại lý hải quan"
    r = await api_client.patch(
        f"{SERVICES}/{service['id']}", json={"coverage_countries": ["VN", "DE", "VN"]}
    )
    assert r.status_code == 200, r.text
    assert r.json()["coverage_countries"] == ["DE", "VN"]
    assert [s["id"] for s in (await api_client.get(SERVICES)).json()] == [service["id"]]
    assert (await api_client.delete(f"{SERVICES}/{service['id']}")).status_code == 204
    assert (await api_client.get(SERVICES)).json() == []


async def test_unknown_service_category_is_rejected(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "u2-svc2@x.vn")
    await api_client.post(URL, json=company_body(offering_type="services"))
    r = await api_client.post(SERVICES, json=service_body(category_code="teleportation"))
    assert r.status_code == 422


async def test_other_seller_cannot_touch_my_service(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "u2-owner@x.vn")
    await api_client.post(URL, json=company_body(offering_type="both"))
    service_id = (await api_client.post(SERVICES, json=service_body())).json()["id"]
    await login_as(api_client, "exporter", "u2-intruder@x.vn")
    await api_client.post(URL, json=company_body(legal_name="Công ty khác"))
    assert (
        await api_client.patch(f"{SERVICES}/{service_id}", json={"title": "X"})
    ).status_code == 404
    assert (await api_client.delete(f"{SERVICES}/{service_id}")).status_code == 404


async def test_services_need_session_and_seller_role(api_client: AsyncClient) -> None:
    assert (await api_client.get(SERVICES)).status_code == 401
    await login_as(api_client, "buyer", "u2-buyer3@x.de")
    await api_client.post(URL, json=buyer_body())
    assert (await api_client.get(SERVICES)).status_code == 403
    assert (await api_client.post(SERVICES, json=service_body())).status_code == 403


async def test_services_only_company_is_not_penalised_for_products(api_client: AsyncClient) -> None:
    """Công ty chỉ làm dịch vụ: dịch vụ thay cho sản phẩm; ảnh/giá/thị trường không bị tính thiếu."""
    await login_as(api_client, "exporter", "u2-svc3@x.vn")
    await api_client.post(URL, json=company_body(offering_type="services", export_markets=[]))
    missing = {m["field"] for m in (await api_client.get(f"{URL}/completeness")).json()["missing"]}
    assert "product_hs" in missing
    assert not {"product_image", "product_price", "export_markets"} & missing
    await api_client.post(SERVICES, json=service_body())
    missing = {m["field"] for m in (await api_client.get(f"{URL}/completeness")).json()["missing"]}
    assert not {"product_hs", "product_description"} & missing
