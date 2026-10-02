"""Xem trước nội dung file bằng chứng TRƯỚC khi nộp (POST /api/exporter/evidences/extract-preview).

Chỉ gợi ý để điền sẵn form: không tạo bản ghi bằng chứng / trích xuất, không đổi trạng thái, không
quyết định xác minh. Model là bản giả; dev mặc định model giả không đọc được gì nên bộ đọc theo quy
tắc phải lấp chỗ trống."""

import json
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.chat import FakeChatModel
from app.modules.companies.tests.helpers import company_body, login_as
from app.modules.verification import extraction_service
from app.modules.verification.models import (
    Evidence,
    EvidenceExtraction,
    EvidenceType,
    VerificationDecision,
)
from app.modules.verification.tests.helpers import add_type
from app.modules.verification.tests.test_extraction import CERT_TEXT, GOOD, make_pdf
from conftest import FakeStorage

URL = "/api/exporter/evidences/extract-preview"


async def seller(client: AsyncClient, email: str = "p@x.vn") -> str:
    await login_as(client, "exporter", email)
    created = await client.post("/api/me/company", json=company_body())
    return str(
        created.json()["id"]
        if created.status_code == 201
        else (await client.get("/api/me/company")).json()["id"]
    )


def put(company_id: str, data: bytes, ext: str = "pdf") -> str:
    key = f"evidence/{company_id}/{uuid.uuid4().hex}.{ext}"
    FakeStorage.objects[key] = data
    return key


async def approved_haccp(session: AsyncSession, reviewer: uuid.UUID) -> None:
    if await session.get(EvidenceType, "haccp") is None:
        await add_type(session, reviewer, code="haccp")


async def untouched(session: AsyncSession) -> None:
    """Xem trước không để lại dấu vết nào trong DB."""
    for table in (Evidence, EvidenceExtraction, VerificationDecision):
        assert await session.scalar(select(func.count()).select_from(table)) == 0


async def test_default_fake_model_reads_nothing_so_rules_fill_the_form(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    company_id = await seller(api_client)
    await approved_haccp(db_session, reviewer_id)
    r = await api_client.post(URL, json={"file_key": put(company_id, make_pdf(CERT_TEXT))})
    assert r.status_code == 200, r.text
    body = r.json()
    assert (body["status"], body["method"]) == ("ready", "rules")
    assert body["fields"]["type_code"] == "haccp"
    assert body["fields"]["certificate_number"] == "VN-HACCP-2026-00123"
    assert body["fields"]["issuer"] == "Bureau Veritas Certification Vietnam"
    assert (body["fields"]["issued_at"], body["fields"]["expires_at"]) == (
        "2026-03-01",
        "2029-02-28",
    )
    await untouched(db_session)


async def test_model_result_wins_and_rules_only_fill_gaps(
    api_client: AsyncClient,
    db_session: AsyncSession,
    reviewer_id: uuid.UUID,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    company_id = await seller(api_client)
    await approved_haccp(db_session, reviewer_id)
    partial = {**GOOD, "issuer": None, "issued_at": "2026-04-01"}
    chat = FakeChatModel(lambda system, user: json.dumps(partial))
    monkeypatch.setattr(extraction_service, "get_chat_model", lambda: chat)
    r = await api_client.post(URL, json={"file_key": put(company_id, make_pdf(CERT_TEXT))})
    body = r.json()
    assert body["method"] == "text+rules"
    assert body["fields"]["issued_at"] == "2026-04-01"  # model đúng hơn quy tắc: giữ nguyên
    assert (
        body["fields"]["issuer"] == "Bureau Veritas Certification Vietnam"
    )  # quy tắc lấp chỗ trống
    assert body["fields"]["holder_name"] == "Nong San Viet Co., Ltd"  # chỉ model đọc được
    _, user = chat.calls[0]
    assert "quality@nongsanviet.vn" not in user  # liên hệ vẫn bị che trước khi gửi model
    await untouched(db_session)


async def test_broken_model_falls_back_to_rules_instead_of_failing(
    api_client: AsyncClient,
    db_session: AsyncSession,
    reviewer_id: uuid.UUID,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    company_id = await seller(api_client)
    await approved_haccp(db_session, reviewer_id)

    def boom(system: str, user: str) -> str:
        raise RuntimeError("model offline")

    monkeypatch.setattr(extraction_service, "get_chat_model", lambda: FakeChatModel(boom))
    r = await api_client.post(URL, json={"file_key": put(company_id, make_pdf(CERT_TEXT))})
    assert (r.json()["status"], r.json()["method"]) == ("ready", "rules")


async def test_unapproved_type_is_never_suggested(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = await seller(api_client)  # chưa có loại nào được duyệt
    r = await api_client.post(URL, json={"file_key": put(company_id, make_pdf(CERT_TEXT))})
    body = r.json()
    assert body["status"] == "ready"
    assert body["fields"]["type_code"] is None
    assert body["fields"]["certificate_number"] == "VN-HACCP-2026-00123"


async def test_unreadable_text_is_failed_not_invented(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    company_id = await seller(api_client)
    await approved_haccp(db_session, reviewer_id)
    lines = ["Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor"]
    r = await api_client.post(URL, json={"file_key": put(company_id, make_pdf(lines))})
    body = r.json()
    assert (body["status"], body["fields"]) == ("failed", {})
    assert body["error"] == "unreadable_model_output"


async def test_scanned_pdf_and_images_are_skipped_without_a_vision_model(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    company_id = await seller(api_client)
    scanned = await api_client.post(URL, json={"file_key": put(company_id, make_pdf([]))})
    assert (scanned.json()["status"], scanned.json()["error"]) == (
        "skipped",
        "scanned_document_needs_vision",
    )
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    image = await api_client.post(URL, json={"file_key": put(company_id, png, "png")})
    assert image.json()["status"] == "skipped"
    await untouched(db_session)


async def test_preview_of_a_missing_file_is_failed_and_does_not_crash(
    api_client: AsyncClient,
) -> None:
    company_id = await seller(api_client)
    key = f"evidence/{company_id}/never-uploaded.pdf"
    r = await api_client.post(URL, json={"file_key": key})
    assert r.status_code == 200
    assert r.json()["status"] in ("failed", "skipped")


async def test_other_companys_key_is_rejected(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    mine = await seller(api_client, "mine@x.vn")
    other_key = f"evidence/{uuid.uuid4()}/{uuid.uuid4().hex}.pdf"
    FakeStorage.objects[other_key] = make_pdf(CERT_TEXT)
    r = await api_client.post(URL, json={"file_key": other_key})
    assert (r.status_code, r.json()["error"]["code"]) == (422, "invalid_file_key")
    # Key hợp lệ nhưng thuộc thư mục khác (logo, sản phẩm) cũng không được đọc.
    r = await api_client.post(URL, json={"file_key": f"logos/{mine}/a.pdf"})
    assert r.status_code == 422


async def test_requires_an_exporter_session(api_client: AsyncClient) -> None:
    assert (await api_client.post(URL, json={"file_key": "evidence/x/y.pdf"})).status_code == 401
    await login_as(api_client, "buyer", "buyer@x.de")
    assert (await api_client.post(URL, json={"file_key": "evidence/x/y.pdf"})).status_code == 403
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "exporter", "nocompany@x.vn")  # chưa tạo công ty
    assert (await api_client.post(URL, json={"file_key": "evidence/x/y.pdf"})).status_code == 404


async def test_empty_key_is_a_validation_error(api_client: AsyncClient) -> None:
    await seller(api_client)
    assert (await api_client.post(URL, json={"file_key": ""})).status_code == 422
