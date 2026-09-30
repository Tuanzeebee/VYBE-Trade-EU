"""Kênh email và 5 mẫu song ngữ (H2)."""

import re
import uuid
from email import message_from_bytes
from email.message import Message
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.channels import FakeChannel, SmtpEmailChannel
from app.core.config import get_settings
from app.modules.companies.tests.helpers import company_body, login_as
from app.modules.notifications import service
from app.modules.notifications.service import EmailType, render_email

LANGS = ["vi", "en"]
CONTEXT: dict[str, dict[str, Any]] = {
    "verification_status": {"outcome": "approve", "company_name": "Công ty A", "reason": None},
    "message": {"sender_name": "Global Foods GmbH"},
    "rfq": {"buyer_name": "Global Foods GmbH", "product_name": "Gạo thơm"},
    "new_match": {"count": 3},
    "expiry_alert": {"what": "verification", "expires_on": "2026-12-01"},
}
BASE = get_settings().public_base_url.rstrip("/")


@pytest.mark.parametrize("language", LANGS)
@pytest.mark.parametrize("email_type", list(EmailType))
def test_each_type_renders_in_both_languages_with_correct_link(
    email_type: EmailType, language: str
) -> None:
    mail = render_email(email_type, language, CONTEXT[email_type.value])
    assert mail.subject.strip() and "\n" not in mail.subject
    assert mail.text.strip() and mail.html.strip()
    assert mail.link.startswith(f"{BASE}/{language}/")  # ngôn ngữ người nhận + link tuyệt đối
    assert mail.link in mail.text
    assert f'href="{mail.link}"' in mail.html
    for part in (mail.subject, mail.text, mail.html):
        assert "{{" not in part and "{%" not in part  # không còn biểu thức chưa render


def test_types_are_exactly_the_five_in_the_spec() -> None:
    assert {t.value for t in EmailType} == {
        "message",
        "rfq",
        "verification_status",
        "new_match",
        "expiry_alert",
    }


@pytest.mark.parametrize("email_type", list(EmailType))
def test_vi_and_en_differ(email_type: EmailType) -> None:
    vi = render_email(email_type, "vi", CONTEXT[email_type.value])
    en = render_email(email_type, "en", CONTEXT[email_type.value])
    assert vi.subject != en.subject and vi.text != en.text


def test_unknown_language_falls_back_to_vietnamese() -> None:
    assert render_email(EmailType.message, "fr", CONTEXT["message"]).link.startswith(f"{BASE}/vi/")


@pytest.mark.parametrize(
    ("outcome", "needle_vi", "needle_en"),
    [
        ("approve", "đã được xác minh", "verified"),
        ("reject", "bị từ chối", "rejected"),
        ("request_info", "bổ sung", "more information"),
        ("expire", "hết hạn", "expired"),
    ],
)
def test_verification_email_says_the_right_outcome(
    outcome: str, needle_vi: str, needle_en: str
) -> None:
    ctx = {"outcome": outcome, "company_name": "Công ty A", "reason": "Thiếu giấy phép"}
    assert needle_vi in render_email(EmailType.verification_status, "vi", ctx).text
    assert needle_en in render_email(EmailType.verification_status, "en", ctx).text.lower()


def test_reason_is_shown_for_reject_and_request_info_only() -> None:
    for outcome, shown in (("reject", True), ("request_info", True), ("approve", False)):
        ctx = {"outcome": outcome, "company_name": "A", "reason": "LÝ-DO-RIÊNG"}
        assert (
            "LÝ-DO-RIÊNG" in render_email(EmailType.verification_status, "vi", ctx).text
        ) is shown


def test_html_escapes_user_supplied_text() -> None:
    ctx = {"outcome": "reject", "company_name": "<b>X</b>", "reason": '<script>alert("x")</script>'}
    html = render_email(EmailType.verification_status, "vi", ctx).html
    assert "<script>" not in html and "&lt;script&gt;" in html
    assert "<b>X</b>" not in html


def test_subject_cannot_be_header_injected() -> None:
    ctx = {"sender_name": "Evil\r\nBcc: victim@example.com"}
    subject = render_email(EmailType.message, "vi", ctx).subject
    assert "\r" not in subject and "\n" not in subject


def test_verification_link_points_to_the_workspace_tab() -> None:
    link = render_email(EmailType.verification_status, "en", CONTEXT["verification_status"]).link
    assert link == f"{BASE}/en/exporter?tab=verification"


# ── Kênh ────────────────────────────────────────────────────────────────────
async def test_fake_channel_records_messages() -> None:
    channel = FakeChannel()
    await channel.send("a@x.vn", "Chủ đề", "nội dung", "<p>nội dung</p>")
    assert channel.sent == [("a@x.vn", "Chủ đề", "nội dung", "<p>nội dung</p>")]


async def test_smtp_channel_builds_multipart_utf8_mail(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    class FakeSMTP:
        def __init__(self, host: str, port: int, timeout: float | None = None) -> None:
            captured["addr"] = (host, port)

        def __enter__(self) -> "FakeSMTP":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def send_message(self, message: Message) -> None:
            captured["raw"] = message.as_bytes()

    monkeypatch.setattr("app.core.channels.smtplib.SMTP", FakeSMTP)
    await SmtpEmailChannel("mail.test", 2525, "noreply@evfta.eu").send(
        "người-nhận@example.com", "Xác minh hồ sơ", "Xin chào", "<p>Xin chào</p>"
    )
    assert captured["addr"] == ("mail.test", 2525)
    parsed = message_from_bytes(captured["raw"])
    assert parsed["To"] == "người-nhận@example.com" or "example.com" in parsed["To"]
    assert parsed["From"] == "noreply@evfta.eu"
    assert parsed.is_multipart()
    types = [p.get_content_type() for p in parsed.walk()]
    assert "text/plain" in types and "text/html" in types


async def test_smtp_channel_rejects_header_injection() -> None:
    channel = SmtpEmailChannel("mail.test", 2525, "noreply@evfta.eu")
    with pytest.raises(ValueError):
        await channel.send("a@x.vn\r\nBcc: v@x.vn", "s", "t", "<p>t</p>")


# ── Giao thư: người nhận và ngôn ngữ ────────────────────────────────────────
async def exporter_with_language(client: AsyncClient, email: str, language: str) -> uuid.UUID:
    await login_as(client, "exporter", email)
    await client.patch("/api/me", json={"preferred_language": language})
    r = await client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text
    return uuid.UUID(r.json()["id"])


@pytest.mark.parametrize("language", LANGS)
async def test_email_uses_recipient_language(
    api_client: AsyncClient, db_session: AsyncSession, language: str
) -> None:
    company_id = await exporter_with_language(api_client, f"{language}@x.vn", language)
    channel = FakeChannel()
    payload = {
        "type": "verification_status",
        "company_id": str(company_id),
        "context": {"outcome": "approve", "reason": None},
    }
    await service.deliver(db_session, payload, channel)
    [(to, subject, text, html)] = channel.sent
    assert to == f"{language}@x.vn"
    assert f"/{language}/" in text and f"/{language}/" in html
    assert (
        subject
        == render_email(
            EmailType.verification_status,
            language,
            {"outcome": "approve", "company_name": "Công ty TNHH Nông Sản Việt", "reason": None},
        ).subject
    )


async def test_deliver_includes_company_name_from_the_database(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = await exporter_with_language(api_client, "n@x.vn", "vi")
    channel = FakeChannel()
    await service.deliver(
        db_session,
        {
            "type": "verification_status",
            "company_id": str(company_id),
            "context": {"outcome": "reject", "reason": "Sai MST"},
        },
        channel,
    )
    assert "Công ty TNHH Nông Sản Việt" in channel.sent[0][2]
    assert "Sai MST" in channel.sent[0][2]


async def test_deliver_skips_deleted_or_unknown_recipient(db_session: AsyncSession) -> None:
    channel = FakeChannel()
    payload = {
        "type": "verification_status",
        "company_id": str(uuid.uuid4()),
        "context": {"outcome": "approve"},
    }
    await service.deliver(db_session, payload, channel)
    assert channel.sent == []


def test_email_body_never_carries_secrets_or_password_words() -> None:
    for email_type in EmailType:
        for language in LANGS:
            mail = render_email(email_type, language, CONTEXT[email_type.value])
            assert not re.search(r"password|mật khẩu|token", mail.text, re.IGNORECASE)
