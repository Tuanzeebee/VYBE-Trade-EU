import datetime as dt
from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import clear_subscribers
from app.modules.catalog.service import upsert_hs_codes
from app.modules.companies.tests.helpers import buyer_body, company_body, login_as, product_body
from app.modules.notifications import handlers
from scripts.seed_hs_codes import DEFAULT_CSV, load_csv


@pytest.fixture(autouse=True)
async def hs_seeded(db_session: AsyncSession) -> AsyncSession:
    """20 mã HS đợt 1 (B4) để sản phẩm có mã HS hợp lệ; mỗi test rollback."""
    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))
    return db_session


async def make_exporter(
    client: AsyncClient,
    session: AsyncSession,
    email: str = "exp@x.vn",
    *,
    verified: bool = True,
    **company: Any,
) -> tuple[str, str]:
    """Exporter có một sản phẩm; trả (company_id, product_id). Đăng xuất khi xong."""
    await login_as(client, "exporter", email)
    created = (await client.post("/api/me/company", json=company_body(**company))).json()
    product = (await client.post("/api/exporter/products", json=product_body())).json()
    if verified:
        await session.execute(
            text(
                "UPDATE companies SET verification_status = 'verified', verified_at = now() WHERE id = :id"
            ),
            {"id": created["id"]},
        )
    await client.post("/api/auth/logout")
    return str(created["id"]), str(product["id"])


async def make_buyer(
    client: AsyncClient, email: str = "buyer@x.de", language: str = "vi", **company: Any
) -> str:
    await login_as(client, "buyer", email, language)
    created = (await client.post("/api/me/company", json=buyer_body(**company))).json()
    await client.post("/api/auth/logout")
    return str(created["id"])


def rfq_body(product_id: str, **over: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "product_id": product_id,
        "quantity": "500.50",
        "unit": "kg",
        "target_price": "2.35",
        "currency": "EUR",
        "incoterms": "CIF",
        "destination_country": "DE",
        "destination_port": "Hamburg",
        "required_date": (dt.date.today() + dt.timedelta(days=60)).isoformat(),
        "message": "Cần báo giá 10 container gạo thơm.",
    }
    body.update(over)
    return body


class SessionOf:
    """Dùng phiên của test làm phiên của handler thông báo (để rollback cùng test)."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def __call__(self) -> "SessionOf":
        return self

    async def __aenter__(self) -> AsyncSession:
        return self.session

    async def __aexit__(self, *_: object) -> bool:
        return False


@pytest.fixture
async def notifications_on(db_session: AsyncSession) -> AsyncIterator[list[dict[str, Any]]]:
    """Bật handler thông báo với hàng đợi email trong bộ nhớ; trả danh sách email đã xếp hàng."""
    queued: list[dict[str, Any]] = []

    async def enqueue(payload: dict[str, Any]) -> None:
        queued.append(payload)

    previous_queue = handlers.set_enqueuer(enqueue)
    previous_factory = handlers.set_session_factory(lambda: SessionOf(db_session))  # type: ignore[arg-type,return-value]
    clear_subscribers()
    handlers.register()
    try:
        yield queued
    finally:
        handlers.set_enqueuer(previous_queue)
        handlers.set_session_factory(previous_factory)
        clear_subscribers()
