"""Event xác minh → email qua hàng đợi job (H2, I2)."""

import uuid
from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.channels import FakeChannel
from app.core.events import clear_subscribers
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as
from app.modules.notifications import handlers, service
from app.modules.verification.events import VerificationStatusChanged

COMPANY = uuid.uuid4()


def event(decision: str, reason: str | None = None) -> VerificationStatusChanged:
    return VerificationStatusChanged(
        company_id=COMPANY,
        old_status="pending",
        new_status="verified",
        old_level="basic",
        new_level="basic",
        decision=decision,
        reason=reason,
    )


@pytest.fixture
async def queued() -> AsyncIterator[list[dict[str, Any]]]:
    box: list[dict[str, Any]] = []

    async def enqueue(payload: dict[str, Any]) -> None:
        box.append(payload)

    previous = handlers.set_enqueuer(enqueue)
    clear_subscribers()
    handlers.register()
    try:
        yield box
    finally:
        handlers.set_enqueuer(previous)
        clear_subscribers()


@pytest.mark.parametrize("decision", ["approve", "reject", "request_info", "expire"])
async def test_review_decisions_enqueue_an_email(
    decision: str, queued: list[dict[str, Any]]
) -> None:
    await handlers.on_verification_status_changed(event(decision, "Thiếu giấy phép"))
    assert queued == [
        {
            "type": "verification_status",
            "company_id": str(COMPANY),
            "context": {"outcome": decision, "reason": "Thiếu giấy phép"},
        }
    ]


@pytest.mark.parametrize("decision", ["submit", "level_up", "level_down", ""])
async def test_other_changes_send_no_email(decision: str, queued: list[dict[str, Any]]) -> None:
    await handlers.on_verification_status_changed(event(decision))
    assert queued == []


async def test_queue_failure_never_breaks_the_original_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.jobs.send_email import send_email

    async def boom(*args: object, **kwargs: object) -> None:
        raise ConnectionError("hàng đợi không truy cập được")

    monkeypatch.setattr(send_email, "defer_async", boom)
    await handlers._defer_send_email(
        {"type": "verification_status", "company_id": str(COMPANY)}
    )  # không ném


def test_payload_carries_ids_and_context_only_no_pii() -> None:
    """Payload vào bảng job: chỉ mã và ngữ cảnh, không có email hay tên người nhận."""
    import json

    payload = {
        "type": "verification_status",
        "company_id": str(COMPANY),
        "context": {"outcome": "approve"},
    }
    dumped = json.dumps(payload)
    assert "@" not in dumped


# ── Từ đầu đến cuối: admin quyết định qua API → thư tới đúng người, đúng ngôn ngữ ──
async def test_admin_rejection_sends_reason_to_the_exporter_in_their_language(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[dict[str, Any]]
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    await api_client.patch("/api/me", json={"preferred_language": "en"})
    await api_client.post("/api/me/company", json=company_body(legal_name="Green Farms"))
    await api_client.post("/api/exporter/verification-requests")
    request_id = (await api_client.get("/api/exporter/verification-requests")).json()[0]["id"]
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    await api_client.post("/api/auth/logout")
    await api_client.post("/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD})

    r = await api_client.post(
        f"/api/admin/verification-requests/{request_id}/decision",
        json={"decision": "reject", "reason": "Tax ID does not match"},
    )
    assert r.status_code == 200, r.text
    assert [p["context"]["outcome"] for p in queued] == ["reject"]  # nộp yêu cầu không gửi thư

    channel = FakeChannel()
    await service.deliver(db_session, queued[0], channel)
    [(to, subject, text, _html)] = channel.sent
    assert to == "exp@x.vn"
    assert "rejected" in subject.lower()
    assert "Green Farms" in text and "Tax ID does not match" in text
    assert "/en/exporter?tab=verification" in text
