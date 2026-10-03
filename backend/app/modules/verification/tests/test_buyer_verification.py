"""U6/ADR-0004: xác minh buyer là TÙY CHỌN (B1 — KYB nhẹ), đi qua cùng decide() với admin duyệt.

Buyer chưa xác minh vẫn xem, nhắn tin và gửi RFQ trong hạn mức (test ở messaging/test_rfq.py).
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import buyer_body, login_as
from app.modules.verification.models import VerificationDecision
from app.modules.verification.tests.test_verification_requests import QUEUE, login_admin

pytestmark = pytest.mark.usefixtures("hs_seeded")

SUBMIT = "/api/buyer/verification-requests"


async def new_buyer(client: AsyncClient, email: str, **company: object) -> str:
    await client.post("/api/auth/logout")
    await login_as(client, "buyer", email)
    r = await client.post("/api/me/company", json=buyer_body(**company))
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


async def test_buyer_requests_verification_and_admin_approves(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = await new_buyer(api_client, "b1@x.de")
    r = await api_client.post(SUBMIT)
    assert r.status_code == 201, r.text
    assert (r.json()["status"], r.json()["evidence_ids"]) == ("pending", [])
    assert [x["status"] for x in (await api_client.get(SUBMIT)).json()] == ["pending"]

    await login_admin(api_client, db_session)
    queue = (await api_client.get(QUEUE)).json()
    item = next(i for i in queue if i["company_id"] == company_id)
    assert item["company"]["type"] == "buyer" and item["products"] == []
    assert item["company"]["vat_number"] == "DE123456789"
    decided = await api_client.post(
        f"/api/admin/verification-requests/{item['request_id']}/decision",
        json={"decision": "approve"},
    )
    assert decided.status_code == 200, decided.text

    state = await companies.get_verification_state(db_session, uuid.UUID(company_id))
    # Buyer không có sản phẩm → không bao giờ được nâng mức evfta_verified.
    assert (state.status, state.level) == ("verified", "basic")
    decisions = list(
        await db_session.scalars(
            select(VerificationDecision.decision).where(
                VerificationDecision.company_id == uuid.UUID(company_id)
            )
        )
    )
    assert [d.value for d in decisions] == ["submit", "approve"]


async def test_buyer_needs_vat_or_registration_number(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = await new_buyer(api_client, "b2@x.de", vat_number=None)
    r = await api_client.post(SUBMIT)
    assert r.status_code == 422 and r.json()["error"]["code"] == "identifier_required"
    state = await companies.get_verification_state(db_session, uuid.UUID(company_id))
    assert state.status == "unverified"

    await api_client.patch("/api/me/company", json={"registration_number": "HRB 12345"})
    assert (await api_client.post(SUBMIT)).status_code == 201


async def test_buyer_cannot_submit_twice_and_lists_only_own(api_client: AsyncClient) -> None:
    await new_buyer(api_client, "b3@x.de")
    assert (await api_client.post(SUBMIT)).status_code == 201
    r = await api_client.post(SUBMIT)
    assert r.status_code == 409 and r.json()["error"]["code"] == "invalid_transition"
    await new_buyer(api_client, "b4@x.de", legal_name="Other Foods BV", country="NL")
    assert (await api_client.get(SUBMIT)).json() == []


async def test_buyer_verification_routes_need_a_buyer(api_client: AsyncClient) -> None:
    for method in ("get", "post"):
        assert (await api_client.request(method, SUBMIT)).status_code == 401
    await login_as(api_client, "exporter", "exp@x.vn")
    for method in ("get", "post"):
        assert (await api_client.request(method, SUBMIT)).status_code == 403
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "buyer", "nocompany@x.de")
    assert (await api_client.post(SUBMIT)).status_code == 404
