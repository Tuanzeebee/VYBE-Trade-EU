"""U3: bậc giá theo số lượng, quy cách đóng gói, OEM/thương hiệu riêng, mô tả một ngôn ngữ + dịch máy,
hậu kiểm sản phẩm mới."""

import uuid
from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.translation import FakeTranslation, TranslationError
from app.modules.auth.service import create_admin
from app.modules.companies import product_service
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as, product_body

pytestmark = pytest.mark.usefixtures("hs_seeded")
PRODUCTS = "/api/exporter/products"


@pytest.fixture
async def queued() -> AsyncIterator[list[uuid.UUID]]:
    """Bắt các lần xếp job dịch thay vì đẩy vào hàng đợi thật."""
    calls: list[uuid.UUID] = []

    async def enqueue(product_id: uuid.UUID) -> None:
        calls.append(product_id)

    previous = product_service.set_translation_enqueuer(enqueue)
    yield calls
    product_service.set_translation_enqueuer(previous)


async def _seller(client: AsyncClient, email: str = "u3@x.vn", **company: object) -> None:
    await login_as(client, "exporter", email)
    assert (await client.post("/api/me/company", json=company_body(**company))).status_code == 201


async def test_price_tiers_replace_min_max_and_set_default_moq(
    api_client: AsyncClient, queued: list[uuid.UUID]
) -> None:
    await _seller(api_client)
    r = await api_client.post(
        PRODUCTS,
        json=product_body(
            price_min=None,
            price_max=None,
            moq=None,
            price_tiers=[
                {"min_quantity": "100", "unit_price": "520.00"},
                {"min_quantity": "25", "unit_price": "560.00"},
                {"min_quantity": "500", "unit_price": "495.50"},
            ],
        ),
    )
    assert r.status_code == 201, r.text
    p = r.json()
    assert [t["min_quantity"] for t in p["price_tiers"]] == ["25.00", "100.00", "500.00"]
    # Tóm tắt suy ra từ bậc giá để thẻ danh bạ/RFQ vẫn đọc được như cũ.
    assert (p["price_min"], p["price_max"]) == ("495.50", "560.00")
    assert p["moq"] == "25.00"


async def test_duplicate_tier_quantity_is_rejected(api_client: AsyncClient) -> None:
    await _seller(api_client)
    r = await api_client.post(
        PRODUCTS,
        json=product_body(
            price_tiers=[
                {"min_quantity": "25", "unit_price": "560"},
                {"min_quantity": "25", "unit_price": "540"},
            ]
        ),
    )
    assert r.status_code == 422


async def test_packagings_and_brand_model_round_trip(api_client: AsyncClient) -> None:
    await _seller(api_client)
    body = product_body(
        brand_model="oem",
        packagings=[
            {"pack_size": "25", "pack_unit": "kg", "pack_type": "bag", "channel": "horeca"},
            {"pack_size": "1", "pack_unit": "kg", "pack_type": "bag", "channel": "retail"},
        ],
    )
    p = (await api_client.post(PRODUCTS, json=body)).json()
    assert p["brand_model"] == "oem"
    assert [(x["pack_size"], x["channel"]) for x in p["packagings"]] == [
        ("25.000", "horeca"),
        ("1.000", "retail"),
    ]
    r = await api_client.patch(
        f"{PRODUCTS}/{p['id']}",
        json={"packagings": [{"pack_size": "50", "pack_unit": "kg", "pack_type": "sack"}]},
    )
    assert r.status_code == 200, r.text
    assert [(x["pack_size"], x["pack_type"], x["channel"]) for x in r.json()["packagings"]] == [
        ("50.000", "sack", "any")
    ]


@pytest.mark.parametrize(
    "bad",
    [
        {"brand_model": "white_label"},
        {"packagings": [{"pack_size": "0", "pack_unit": "kg", "pack_type": "bag"}]},
        {"packagings": [{"pack_size": "1", "pack_unit": "barrel", "pack_type": "bag"}]},
        {"packagings": [{"pack_size": "1", "pack_unit": "kg", "pack_type": "bag", "channel": "x"}]},
    ],
)
async def test_invalid_product_extensions_are_rejected(
    api_client: AsyncClient, bad: dict[str, object]
) -> None:
    await _seller(api_client)
    assert (await api_client.post(PRODUCTS, json=product_body(**bad))).status_code == 422


async def test_one_language_description_queues_translation(
    api_client: AsyncClient, queued: list[uuid.UUID]
) -> None:
    await _seller(api_client)
    p = (
        await api_client.post(
            PRODUCTS,
            json=product_body(description_en=None, description_source_lang="vi"),
        )
    ).json()
    assert queued == [uuid.UUID(p["id"])]
    # Cả hai ngôn ngữ do người viết → không cần dịch.
    both = (await api_client.post(PRODUCTS, json=product_body(name="Cà phê"))).json()
    assert uuid.UUID(both["id"]) not in queued


async def test_translation_job_fills_missing_language_and_flags_it(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    await _seller(api_client)
    p = (await api_client.post(PRODUCTS, json=product_body(description_en=None))).json()
    fake = FakeTranslation(lambda text, source, target: "Fragrant long-grain rice.")
    assert await product_service.translate_missing_description(db_session, fake, uuid.UUID(p["id"]))
    assert fake.calls[0][1:] == ("vi", "en")
    refreshed = (await api_client.get(f"{PRODUCTS}/{p['id']}")).json()
    assert refreshed["description_en"] == "Fragrant long-grain rice."
    assert refreshed["description_en_machine"] is True
    assert refreshed["description_vi_machine"] is False


async def test_human_edit_replaces_machine_translation(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    await _seller(api_client)
    p = (await api_client.post(PRODUCTS, json=product_body(description_en=None))).json()
    await product_service.translate_missing_description(
        db_session, FakeTranslation(), uuid.UUID(p["id"])
    )
    r = await api_client.patch(f"{PRODUCTS}/{p['id']}", json={"description_en": "Our own text."})
    assert r.json()["description_en_machine"] is False
    # Bản do người viết không bao giờ bị job ghi đè.
    assert not await product_service.translate_missing_description(
        db_session, FakeTranslation(), uuid.UUID(p["id"])
    )


async def test_translation_failure_leaves_field_empty(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    await _seller(api_client)
    p = (await api_client.post(PRODUCTS, json=product_body(description_en=None))).json()

    def fail(text: str, source: str, target: str) -> str:
        raise TranslationError("down")

    assert not await product_service.translate_missing_description(
        db_session, FakeTranslation(fail), uuid.UUID(p["id"])
    )
    assert (await api_client.get(f"{PRODUCTS}/{p['id']}")).json()["description_en"] is None


async def test_public_profile_shows_tiers_and_packagings(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    await _seller(api_client, legal_name="Công ty Gạo Mekong")
    await api_client.post(
        PRODUCTS,
        json=product_body(
            price_tiers=[{"min_quantity": "25", "unit_price": "560"}],
            packagings=[{"pack_size": "25", "pack_unit": "kg", "pack_type": "bag"}],
        ),
    )
    await db_session.execute(
        text(
            "UPDATE companies SET verification_status = 'verified', verified_at = now() "
            "WHERE legal_name = 'Công ty Gạo Mekong'"
        )
    )
    slug = (await api_client.get("/api/me/company")).json()["slug"]
    product = (await api_client.get(f"/api/public/companies/{slug}")).json()["products"][0]
    assert product["price_tiers"] == [{"min_quantity": "25.00", "unit_price": "560.00"}]
    assert product["packagings"][0]["pack_size"] == "25.000"


async def test_admin_sees_new_products_and_industry_mismatch(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    # Công ty khai ngành thủy sản nhưng đăng gạo (nhóm nông sản) → cờ cho admin, không tự ẩn.
    await _seller(api_client, industry_sector="seafood")
    await api_client.post(PRODUCTS, json=product_body())
    await create_admin(db_session, "admin-u3@x.vn", PASSWORD)
    await api_client.post("/api/auth/login", json={"email": "admin-u3@x.vn", "password": PASSWORD})
    rows = (await api_client.get("/api/admin/products", params={"recent_days": 7})).json()
    assert len(rows) == 1
    assert rows[0]["industry_mismatch"] is True
    assert rows[0]["created_at"] is not None
    assert (
        await api_client.get("/api/admin/products", params={"recent_days": 0})
    ).status_code == 422
