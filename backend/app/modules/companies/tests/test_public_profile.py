import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import (
    buyer_body,
    company_body,
    login_as,
    product_body,
)

pytestmark = pytest.mark.usefixtures("hs_seeded")

PRIVATE_FIELDS = {
    "contact_email",
    "tax_id",
    "registration_number",
    "address",
    "owner_user_id",
    "id",
    "is_hidden",
    "profile_completeness_score",
}


async def _verified_exporter(
    client: AsyncClient, session: AsyncSession, email: str = "exp@x.vn", **company: object
) -> dict[str, object]:
    await login_as(client, "exporter", email)
    created = (await client.post("/api/me/company", json=company_body(**company))).json()
    await session.execute(
        text(
            "UPDATE companies SET verification_status = 'verified', verified_at = now() "
            "WHERE id = :id"
        ),
        {"id": created["id"]},
    )
    assert isinstance(created, dict)
    return created


async def test_public_profile_shows_company_and_all_product_fields(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Xong khi B5: hồ sơ công khai hiện đủ trường."""
    company = await _verified_exporter(api_client, db_session)
    key = (
        await api_client.post(
            "/api/uploads/presign", json={"purpose": "product_image", "content_type": "image/png"}
        )
    ).json()["key"]
    await api_client.post("/api/exporter/products", json=product_body(image_keys=[key]))
    await api_client.post(
        "/api/exporter/products",
        json=product_body(name="Cà phê nhân", hs_code="0901.11", price_min=None, price_max=None),
    )
    await api_client.post("/api/auth/logout")  # khách xem, không cần phiên

    r = await api_client.get(f"/api/public/companies/{company['slug']}")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["legal_name"] == "Công ty TNHH Nông Sản Việt"
    assert p["slug"] == company["slug"]
    assert p["country"] == "VN"
    assert p["industry_sector"] == "agriculture"
    assert p["founded_year"] == 2018
    assert p["website"] == "https://vietagri-export.vn"
    assert p["description_vi"] and p["description_en"]
    assert p["export_markets"] == ["EU", "JP"]
    assert p["languages_spoken"] == ["en", "vi"]
    assert p["verification_level"] == "basic"
    assert p["verified_at"] is not None
    assert [x["name"] for x in p["products"]] == ["Gạo thơm Jasmine xuất khẩu", "Cà phê nhân"]

    rice = p["products"][0]
    assert rice["hs_code"] == "100630"
    assert rice["hs_formatted"] == "1006.30"
    assert rice["hs_name_vi"] == "Gạo xát"
    assert rice["hs_name_en"] == "Semi-milled or wholly milled rice"
    assert (rice["price_min"], rice["price_max"], rice["currency"]) == ("480.00", "560.50", "USD")
    assert (rice["unit"], rice["moq"], rice["moq_unit"]) == ("tonne", "25.00", "tonne")
    assert rice["description_vi"].startswith("Gạo thơm")
    assert rice["images"] == [f"https://fake/{key}"]
    assert p["products"][1]["price_min"] is None


async def test_public_profile_leaks_no_private_fields(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company = await _verified_exporter(api_client, db_session)
    await api_client.post("/api/exporter/products", json=product_body())
    body = (await api_client.get(f"/api/public/companies/{company['slug']}")).json()
    assert PRIVATE_FIELDS.isdisjoint(body), PRIVATE_FIELDS & set(body)
    for product in body["products"]:
        assert product["id"]  # buyer cần id sản phẩm để gửi RFQ (F1)
        assert {"company_id", "approval_status", "is_active"}.isdisjoint(product)
    raw = str(body)
    for secret in ("0314892345", "contact@vietagri-export.vn", "Điện Biên Phủ"):
        assert secret not in raw


@pytest.mark.parametrize("status", ["unverified", "pending", "rejected"])
async def test_only_verified_companies_are_public(
    api_client: AsyncClient, db_session: AsyncSession, status: str
) -> None:
    company = await _verified_exporter(api_client, db_session)
    await db_session.execute(
        text("UPDATE companies SET verification_status = :s WHERE id = :id"),
        {"s": status, "id": company["id"]},
    )
    r = await api_client.get(f"/api/public/companies/{company['slug']}")
    assert r.status_code == 404


async def test_hidden_or_expired_verified_company_disappears(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Review Focus 5: đã verified nhưng bị admin ẩn (I4) hoặc hết hạn (I7) thì không còn public."""
    company = await _verified_exporter(api_client, db_session)
    url = f"/api/public/companies/{company['slug']}"
    assert (await api_client.get(url)).status_code == 200
    await db_session.execute(
        text("UPDATE companies SET is_hidden = true WHERE id = :id"), {"id": company["id"]}
    )
    assert (await api_client.get(url)).status_code == 404
    await db_session.execute(
        text(
            "UPDATE companies SET is_hidden = false, expires_at = now() - interval '1 day' "
            "WHERE id = :id"
        ),
        {"id": company["id"]},
    )
    assert (await api_client.get(url)).status_code == 404
    await db_session.execute(
        text("UPDATE companies SET expires_at = now() + interval '30 days' WHERE id = :id"),
        {"id": company["id"]},
    )
    assert (await api_client.get(url)).status_code == 200


async def test_inactive_pending_and_hidden_products_are_not_public(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company = await _verified_exporter(api_client, db_session)
    ids = {}
    for name in ("Hiện", "Tắt", "Chờ duyệt", "Bị ẩn"):
        ids[name] = (
            await api_client.post("/api/exporter/products", json=product_body(name=name))
        ).json()["id"]
    await api_client.patch(f"/api/exporter/products/{ids['Tắt']}", json={"is_active": False})
    await db_session.execute(
        text("UPDATE products SET approval_status = 'pending' WHERE id = :id"),
        {"id": ids["Chờ duyệt"]},
    )
    await db_session.execute(
        text("UPDATE products SET approval_status = 'hidden' WHERE id = :id"), {"id": ids["Bị ẩn"]}
    )
    body = (await api_client.get(f"/api/public/companies/{company['slug']}")).json()
    assert [p["name"] for p in body["products"]] == ["Hiện"]
    # chủ sở hữu vẫn thấy đủ 4 sản phẩm của mình
    assert len((await api_client.get("/api/exporter/products")).json()) == 4


async def test_public_logo_is_a_presigned_url(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company = await _verified_exporter(api_client, db_session)
    logo = (
        await api_client.post(
            "/api/uploads/presign", json={"purpose": "logo", "content_type": "image/png"}
        )
    ).json()["key"]
    await api_client.patch("/api/me/company", json={"logo_key": logo})
    body = (await api_client.get(f"/api/public/companies/{company['slug']}")).json()
    assert body["logo_url"] == f"https://fake/{logo}"
    assert "logo_key" not in body


async def test_company_without_logo_or_products_is_still_public(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company = await _verified_exporter(api_client, db_session)
    body = (await api_client.get(f"/api/public/companies/{company['slug']}")).json()
    assert body["logo_url"] is None
    assert body["products"] == []


async def test_buyer_profiles_are_never_public(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    company = (await api_client.post("/api/me/company", json=buyer_body())).json()
    await db_session.execute(
        text("UPDATE companies SET verification_status = 'verified' WHERE id = :id"),
        {"id": company["id"]},
    )
    assert (await api_client.get(f"/api/public/companies/{company['slug']}")).status_code == 404


@pytest.mark.parametrize("slug", ["khong-ton-tai", "DROP TABLE", "%", "a" * 200])
async def test_unknown_slug_is_404(api_client: AsyncClient, slug: str) -> None:
    assert (await api_client.get(f"/api/public/companies/{slug}")).status_code == 404
