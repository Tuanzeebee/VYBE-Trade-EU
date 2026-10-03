"""N8: giới hạn gói Basic 3 sản phẩm — hook limit_for, bảng plan_limits, chặn tạo sản phẩm thứ 4."""

import uuid
from collections.abc import Iterator
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import entitlements
from app.modules.billing import service
from app.modules.billing.tests.test_billing import admin, exporter, order
from app.modules.catalog.service import upsert_hs_codes
from app.modules.companies.tests.helpers import product_body
from app.modules.messaging.tests.conftest import notifications_on  # noqa: F401 — dùng lại fixture
from scripts.seed_hs_codes import DEFAULT_CSV, load_csv

PRODUCTS = "/api/exporter/products"


@pytest.fixture(autouse=True)
async def _hs(db_session: AsyncSession) -> None:
    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))


@pytest.fixture(autouse=True)
def _real_limits() -> Iterator[None]:
    """conftest tắt giới hạn mặc định; test N8 dùng nguồn giới hạn thật của billing."""
    previous = entitlements.register_limit(service.limit_for)
    yield
    entitlements.register_limit(previous)


# ── Hook ──────────────────────────────────────────────────────────────────────
async def test_limit_for_defaults_to_unlimited_when_no_provider(db_session: AsyncSession) -> None:
    previous = entitlements.register_limit(entitlements._no_limit)
    try:
        assert (
            await entitlements.limit_for(db_session, uuid.uuid4(), entitlements.MAX_PRODUCTS)
            is None
        )
    finally:
        entitlements.register_limit(previous)


async def test_provider_value_is_returned(db_session: AsyncSession) -> None:
    async def provider(session: AsyncSession, company_id: uuid.UUID, key: str) -> int | None:
        return 3

    previous = entitlements.register_limit(provider)
    try:
        assert (
            await entitlements.limit_for(db_session, uuid.uuid4(), entitlements.MAX_PRODUCTS) == 3
        )
    finally:
        entitlements.register_limit(previous)


# ── billing.service.limit_for ─────────────────────────────────────────────────
async def test_billing_limit_defaults_to_three_and_unknown_key_is_unlimited(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = uuid.UUID(await exporter(api_client))
    assert await service.limit_for(db_session, company_id, entitlements.MAX_PRODUCTS) == 3
    assert await service.limit_for(db_session, company_id, "something_else") is None


# ── Chặn tạo sản phẩm ─────────────────────────────────────────────────────────
async def make_products(client: AsyncClient, count: int) -> list[Any]:
    out = []
    for i in range(count):
        out.append(await client.post(PRODUCTS, json=product_body(name=f"Gạo thơm số {i}")))
    return out


async def test_fourth_product_is_blocked_on_basic_plan(api_client: AsyncClient) -> None:
    await exporter(api_client)
    first_three = await make_products(api_client, 3)
    assert [r.status_code for r in first_three] == [201, 201, 201]
    fourth = await api_client.post(PRODUCTS, json=product_body(name="Gạo thơm số 4"))
    assert fourth.status_code == 409
    assert fourth.json()["error"]["code"] == "product_limit_reached"


async def test_editing_and_deleting_existing_products_not_blocked_at_limit(
    api_client: AsyncClient,
) -> None:
    await exporter(api_client)
    created = await make_products(api_client, 3)
    product_id = created[0].json()["id"]
    patched = await api_client.patch(f"{PRODUCTS}/{product_id}", json={"name": "Đổi tên"})
    assert patched.status_code == 200, patched.text
    assert (await api_client.delete(f"{PRODUCTS}/{product_id}")).status_code in (200, 204)
    # xóa một sản phẩm thì có chỗ cho sản phẩm mới
    assert (await api_client.post(PRODUCTS, json=product_body(name="Mới"))).status_code == 201


async def test_more_products_entitlement_lifts_the_limit(
    api_client: AsyncClient,
    db_session: AsyncSession,
    notifications_on: list[dict[str, Any]],  # noqa: F811
) -> None:
    company_id = uuid.UUID(await exporter(api_client))
    await make_products(api_client, 3)
    assert (await api_client.post(PRODUCTS, json=product_body(name="Thứ tư"))).status_code == 409
    placed = await order(api_client, item="products_plus")
    await admin(api_client, db_session)
    confirm = await api_client.post(f"/api/admin/orders/{placed['id']}/confirm-payment", json={})
    assert confirm.status_code == 200, confirm.text
    assert await service.limit_for(db_session, company_id, entitlements.MAX_PRODUCTS) is None
    await exporter(api_client)  # đăng nhập lại là exporter
    assert (await api_client.post(PRODUCTS, json=product_body(name="Thứ tư"))).status_code == 201
