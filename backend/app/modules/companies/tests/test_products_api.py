import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as, product_body

pytestmark = pytest.mark.usefixtures("hs_seeded")


async def _exporter_with_company(client: AsyncClient, email: str = "exp@x.vn") -> str:
    await login_as(client, "exporter", email)
    r = await client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


async def test_create_product_returns_all_backlog_fields(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client)
    r = await api_client.post("/api/exporter/products", json=product_body())
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["name"] == "Gạo thơm Jasmine xuất khẩu"
    assert p["hs_code"] == "100630"
    assert p["hs_formatted"] == "1006.30"
    assert p["hs_name_vi"] == "Gạo xát"
    assert p["hs_name_en"] == "Semi-milled or wholly milled rice"
    assert p["description_vi"].startswith("Gạo thơm")
    assert p["description_en"].startswith("Fragrant")
    assert (p["price_min"], p["price_max"]) == ("480.00", "560.50")  # numeric, không float
    assert (p["currency"], p["unit"]) == ("USD", "tonne")
    assert (p["moq"], p["moq_unit"]) == ("25.00", "tonne")
    assert p["is_active"] is True
    assert p["approval_status"] == "approved"
    assert p["images"] == []
    assert (await api_client.get(f"/api/exporter/products/{p['id']}")).json() == p


@pytest.mark.parametrize("hs", ["1006.30", "100630", " 1006 30 "])
async def test_hs_code_accepts_common_formats(api_client: AsyncClient, hs: str) -> None:
    await _exporter_with_company(api_client)
    r = await api_client.post("/api/exporter/products", json=product_body(hs_code=hs))
    assert r.status_code == 201, r.text
    assert r.json()["hs_code"] == "100630"


async def test_product_without_hs_code_is_rejected(api_client: AsyncClient) -> None:
    """Xong khi B5: không lưu được sản phẩm thiếu mã HS."""
    await _exporter_with_company(api_client)
    body = product_body()
    del body["hs_code"]
    assert (await api_client.post("/api/exporter/products", json=body)).status_code == 422
    for empty in (None, "", "   "):
        r = await api_client.post("/api/exporter/products", json=product_body(hs_code=empty))
        assert r.status_code == 422, empty
    assert (await api_client.get("/api/exporter/products")).json() == []


@pytest.mark.parametrize("hs", ["999999", "abc", "1006", "1006.3O", "123456789"])
async def test_unknown_or_malformed_hs_code_is_rejected(api_client: AsyncClient, hs: str) -> None:
    await _exporter_with_company(api_client)
    r = await api_client.post("/api/exporter/products", json=product_body(hs_code=hs))
    assert r.status_code == 422, r.text


@pytest.mark.parametrize(
    "bad",
    [
        {"price_min": "-1"},
        {"price_min": "0"},
        {"price_max": "abc"},
        {"price_min": "NaN"},
        {"price_max": "Infinity"},
        {"price_min": "1e309"},
        {"price_min": "10.999"},
        {"price_max": "1000000000000.00"},
        {"moq": "0"},
        {"moq": "-5"},
        {"currency": "BTC"},
        {"unit": "bushel"},
        {"moq_unit": "bushel"},
        {"name": "   "},
        {"name": "x" * 256},
    ],
)
async def test_invalid_amounts_and_fields_rejected(
    api_client: AsyncClient, bad: dict[str, object]
) -> None:
    await _exporter_with_company(api_client)
    r = await api_client.post("/api/exporter/products", json=product_body(**bad))
    assert r.status_code == 422, r.text


async def test_price_min_must_not_exceed_price_max(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client)
    r = await api_client.post(
        "/api/exporter/products", json=product_body(price_min="600", price_max="500")
    )
    assert r.status_code == 422
    equal = await api_client.post(
        "/api/exporter/products", json=product_body(price_min="500", price_max="500")
    )
    assert equal.status_code == 201


async def test_prices_are_optional_but_stay_exact(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client)
    r = await api_client.post(
        "/api/exporter/products",
        json=product_body(price_min="0.10", price_max=None, moq=None, moq_unit=None, unit=None),
    )
    assert r.status_code == 201, r.text
    p = r.json()
    assert (p["price_min"], p["price_max"], p["moq"], p["unit"]) == ("0.10", None, None, None)


async def test_client_cannot_choose_approval_status(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client)
    r = await api_client.post(
        "/api/exporter/products", json=product_body(approval_status="hidden", is_hidden=True)
    )
    assert r.status_code == 201
    assert r.json()["approval_status"] == "approved"


async def test_list_returns_only_my_products_newest_last(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client, "a@x.vn")
    for name in ("Sản phẩm 1", "Sản phẩm 2"):
        await api_client.post("/api/exporter/products", json=product_body(name=name))
    await _exporter_with_company(api_client, "b@x.vn")
    await api_client.post("/api/exporter/products", json=product_body(name="Của người khác"))
    await login_as(api_client, "exporter", "a@x.vn")
    names = [p["name"] for p in (await api_client.get("/api/exporter/products")).json()]
    assert names == ["Sản phẩm 1", "Sản phẩm 2"]


async def test_patch_updates_fields_and_validates_hs_code(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client)
    pid = (await api_client.post("/api/exporter/products", json=product_body())).json()["id"]
    r = await api_client.patch(
        f"/api/exporter/products/{pid}",
        json={"name": "Cà phê Robusta", "hs_code": "0901.11", "is_active": False},
    )
    assert r.status_code == 200, r.text
    p = r.json()
    assert (p["name"], p["hs_code"], p["is_active"]) == ("Cà phê Robusta", "090111", False)
    assert p["price_max"] == "560.50"  # trường không gửi giữ nguyên
    for bad in ({"hs_code": None}, {"hs_code": ""}, {"hs_code": "999999"}):
        assert (
            await api_client.patch(f"/api/exporter/products/{pid}", json=bad)
        ).status_code == 422, bad
    got = (await api_client.get(f"/api/exporter/products/{pid}")).json()
    assert got["hs_code"] == "090111"


async def test_patch_price_order_checked_against_stored_values(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client)
    pid = (await api_client.post("/api/exporter/products", json=product_body())).json()["id"]
    r = await api_client.patch(f"/api/exporter/products/{pid}", json={"price_min": "900"})
    assert r.status_code == 422  # 900 > price_max đã lưu (560.50)


async def test_delete_product(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client)
    pid = (await api_client.post("/api/exporter/products", json=product_body())).json()["id"]
    assert (await api_client.delete(f"/api/exporter/products/{pid}")).status_code == 204
    assert (await api_client.get(f"/api/exporter/products/{pid}")).status_code == 404
    assert (await api_client.delete(f"/api/exporter/products/{pid}")).status_code == 404


async def test_other_exporter_cannot_touch_my_product(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client, "a@x.vn")
    pid = (await api_client.post("/api/exporter/products", json=product_body())).json()["id"]
    await _exporter_with_company(api_client, "b@x.vn")
    url = f"/api/exporter/products/{pid}"
    assert (await api_client.get(url)).status_code == 404
    assert (await api_client.patch(url, json={"name": "Chiếm quyền"})).status_code == 404
    assert (await api_client.delete(url)).status_code == 404
    await login_as(api_client, "exporter", "a@x.vn")
    assert (await api_client.get(url)).json()["name"] == "Gạo thơm Jasmine xuất khẩu"


async def test_unknown_product_id_is_404(api_client: AsyncClient) -> None:
    await _exporter_with_company(api_client)
    assert (await api_client.get(f"/api/exporter/products/{uuid.uuid4()}")).status_code == 404
    assert (await api_client.get("/api/exporter/products/khong-phai-uuid")).status_code == 422


async def test_exporter_without_company_gets_404(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.get("/api/exporter/products")).status_code == 404
    r = await api_client.post("/api/exporter/products", json=product_body())
    assert r.status_code == 404


_ROUTES = [
    ("GET", "/api/exporter/products"),
    ("POST", "/api/exporter/products"),
    ("GET", f"/api/exporter/products/{uuid.uuid4()}"),
    ("PATCH", f"/api/exporter/products/{uuid.uuid4()}"),
    ("DELETE", f"/api/exporter/products/{uuid.uuid4()}"),
]


@pytest.mark.parametrize(("method", "path"), _ROUTES)
async def test_products_require_session(api_client: AsyncClient, method: str, path: str) -> None:
    assert (await api_client.request(method, path, json={})).status_code == 401


@pytest.mark.parametrize(("method", "path"), _ROUTES)
async def test_buyer_cannot_use_exporter_products(
    api_client: AsyncClient, method: str, path: str
) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    assert (await api_client.request(method, path, json=product_body())).status_code == 403


@pytest.mark.parametrize(("method", "path"), _ROUTES)
async def test_admin_cannot_use_exporter_products(
    api_client: AsyncClient, hs_seeded: AsyncSession, method: str, path: str
) -> None:
    await create_admin(hs_seeded, "root@x.vn", PASSWORD)
    r = await api_client.post("/api/auth/login", json={"email": "root@x.vn", "password": PASSWORD})
    assert r.status_code == 200
    assert (await api_client.request(method, path, json=product_body())).status_code == 403


async def test_database_enforces_hs_code_not_null_and_fk(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = await _exporter_with_company(api_client)
    insert = "INSERT INTO products (id, company_id, hs_code, name) VALUES (:id, :cid, {hs}, 'x')"
    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(insert.format(hs="NULL")), {"id": uuid.uuid4(), "cid": company_id}
        )
    await db_session.rollback()


async def test_database_rejects_hs_code_outside_catalog(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = await _exporter_with_company(api_client)
    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(
                "INSERT INTO products (id, company_id, hs_code, name) "
                "VALUES (:id, :cid, '999999', 'x')"
            ),
            {"id": uuid.uuid4(), "cid": company_id},
        )
    await db_session.rollback()


async def test_database_rejects_price_min_above_price_max(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = await _exporter_with_company(api_client)
    with pytest.raises(IntegrityError):
        await db_session.execute(
            text(
                "INSERT INTO products (id, company_id, hs_code, name, price_min, price_max) "
                "VALUES (:id, :cid, '100630', 'x', 10, 5)"
            ),
            {"id": uuid.uuid4(), "cid": company_id},
        )
    await db_session.rollback()
