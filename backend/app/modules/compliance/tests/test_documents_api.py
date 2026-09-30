"""POST /api/exporter/documents/eur1 và job sinh PDF nháp (C5). Dữ liệu là SYNTHETIC."""

import datetime as dt
import io
import uuid
from collections.abc import AsyncIterator
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import upsert_hs_codes
from app.modules.companies.tests.helpers import company_body, login_as
from app.modules.compliance import documents
from app.modules.compliance.eur1 import WATERMARK
from app.modules.compliance.models import (
    CheckType,
    ComplianceCheck,
    Document,
    DocumentStatus,
)
from app.modules.compliance.service import log_check
from conftest import FakeStorage

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/exporter/documents/eur1"


def body(check_id: object, **over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {
        "compliance_check_id": str(check_id),
        "consignee_name": "Global Foods GmbH",
        "consignee_address": "Hafenstrasse 12, Hamburg",
        "consignee_country": "DE",
        "invoice_number": "INV-2026-001",
        "invoice_date": (dt.datetime.now(dt.UTC).date() - dt.timedelta(days=2)).isoformat(),
        "goods_description": "Roasted coffee, not decaffeinated",
        "packages": "100 bags",
        "gross_mass_kg": "6200.50",
        "transport_details": "Sea freight",
        "remarks": None,
    }
    b.update(over)
    return b


@pytest.fixture
async def queued_jobs() -> AsyncIterator[list[str]]:
    box: list[str] = []

    async def enqueue(document_id: str) -> None:
        box.append(document_id)

    previous = documents.set_enqueuer(enqueue)
    yield box
    documents.set_enqueuer(previous)


@pytest.fixture
async def exporter(api_client: AsyncClient) -> uuid.UUID:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text
    return uuid.UUID(r.json()["id"])


async def roo_check(
    session: AsyncSession, company_id: uuid.UUID | None, status: str = "pass", hs: str = "090121"
) -> ComplianceCheck:
    return await log_check(
        session,
        check_type=CheckType.roo,
        hs_code=hs,
        destination_country="EU",
        origin_country="VN",
        status=status,
        company_id=company_id,
        product_value=Decimal("1000.00"),
        originating_status=status,
    )


async def test_eur1_only_when_roo_pass(
    api_client: AsyncClient,
    db_session: AsyncSession,
    exporter: uuid.UUID,
    queued_jobs: list[str],
) -> None:
    for status in ("fail", "inconclusive", "unsupported"):
        check = await roo_check(db_session, exporter, status)
        r = await api_client.post(URL, json=body(check.id))
        assert r.status_code == 409, (status, r.text)
    assert queued_jobs == []
    assert list(await db_session.scalars(select(Document))) == []


async def test_tariff_check_cannot_be_used(
    api_client: AsyncClient, db_session: AsyncSession, exporter: uuid.UUID, queued_jobs: list[str]
) -> None:
    check = await log_check(
        db_session,
        check_type=CheckType.tariff,
        hs_code="090121",
        destination_country="DE",
        status="ok",
        company_id=exporter,
        product_value=Decimal("100"),
    )
    assert (await api_client.post(URL, json=body(check.id))).status_code == 409


async def test_check_of_another_company_or_a_guest_or_unknown_is_not_usable(
    api_client: AsyncClient, db_session: AsyncSession, exporter: uuid.UUID, queued_jobs: list[str]
) -> None:
    guest = await roo_check(db_session, None)
    assert (await api_client.post(URL, json=body(guest.id))).status_code in (404, 409)
    assert (await api_client.post(URL, json=body(uuid.uuid4()))).status_code in (404, 409)
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "exporter", "other@x.vn")
    await api_client.post("/api/me/company", json=company_body(legal_name="Công ty khác"))
    mine = await roo_check(db_session, exporter)
    assert (await api_client.post(URL, json=body(mine.id))).status_code in (404, 409)
    assert queued_jobs == []


async def test_request_creates_queued_document_and_enqueues_job(
    api_client: AsyncClient, db_session: AsyncSession, exporter: uuid.UUID, queued_jobs: list[str]
) -> None:
    check = await roo_check(db_session, exporter)
    r = await api_client.post(URL, json=body(check.id))
    assert r.status_code == 202, r.text
    doc = r.json()
    assert (doc["status"], doc["document_type"], doc["file_url"]) == ("queued", "eur1_draft", None)
    assert queued_jobs == [doc["id"]]


async def test_generation_writes_pdf_with_watermark_and_audit(
    api_client: AsyncClient, db_session: AsyncSession, exporter: uuid.UUID, queued_jobs: list[str]
) -> None:
    check = await roo_check(db_session, exporter)
    document_id = uuid.UUID((await api_client.post(URL, json=body(check.id))).json()["id"])
    storage = FakeStorage()
    await documents.generate_document(db_session, storage, document_id)

    doc = await db_session.get(Document, document_id)
    assert doc is not None and doc.status is DocumentStatus.ready and doc.file_key is not None
    assert doc.file_key.startswith(f"documents/{exporter}/") and doc.file_key.endswith(".pdf")
    pdf = FakeStorage.objects[doc.file_key]
    page = PdfReader(io.BytesIO(pdf)).pages[0].extract_text()
    assert WATERMARK in page
    assert "Cong ty TNHH Nong San Viet" in page and "Global Foods GmbH" in page
    assert "Germany" in page and "0901.21" in page
    audit = (
        (
            await db_session.execute(
                select(AuditLog).where(AuditLog.action_type == "document.generate")
            )
        )
        .scalars()
        .one()
    )
    assert audit.entity_id == str(document_id)
    assert audit.after_state is not None and audit.after_state["check_id"] == str(check.id)


async def test_generation_is_idempotent(
    api_client: AsyncClient, db_session: AsyncSession, exporter: uuid.UUID, queued_jobs: list[str]
) -> None:
    check = await roo_check(db_session, exporter)
    document_id = uuid.UUID((await api_client.post(URL, json=body(check.id))).json()["id"])
    await documents.generate_document(db_session, FakeStorage(), document_id)
    first = (await db_session.get(Document, document_id)).file_key  # type: ignore[union-attr]
    await documents.generate_document(db_session, FakeStorage(), document_id)
    assert (await db_session.get(Document, document_id)).file_key == first  # type: ignore[union-attr]
    audits = list(
        await db_session.scalars(
            select(AuditLog).where(AuditLog.action_type == "document.generate")
        )
    )
    assert len(audits) == 1


async def test_list_returns_presigned_url_only_when_ready(
    api_client: AsyncClient, db_session: AsyncSession, exporter: uuid.UUID, queued_jobs: list[str]
) -> None:
    check = await roo_check(db_session, exporter)
    document_id = (await api_client.post(URL, json=body(check.id))).json()["id"]
    [row] = (await api_client.get("/api/exporter/documents")).json()
    assert (row["status"], row["file_url"]) == ("queued", None)
    await documents.generate_document(db_session, FakeStorage(), uuid.UUID(document_id))
    [row] = (await api_client.get("/api/exporter/documents")).json()
    assert row["status"] == "ready" and row["file_url"].startswith("https://fake/documents/")
    got = await api_client.get(f"/api/exporter/documents/{document_id}")
    assert got.json()["id"] == document_id


async def test_other_exporter_cannot_see_or_open_my_documents(
    api_client: AsyncClient, db_session: AsyncSession, exporter: uuid.UUID, queued_jobs: list[str]
) -> None:
    check = await roo_check(db_session, exporter)
    document_id = (await api_client.post(URL, json=body(check.id))).json()["id"]
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "exporter", "other@x.vn")
    await api_client.post("/api/me/company", json=company_body(legal_name="Công ty khác"))
    assert (await api_client.get("/api/exporter/documents")).json() == []
    assert (await api_client.get(f"/api/exporter/documents/{document_id}")).status_code == 404


@pytest.mark.parametrize(
    "over",
    [
        {"consignee_country": "VN"},
        {"consignee_country": "XX"},
        {"consignee_country": "de "},  # chuẩn hóa được thì chấp nhận — xem test riêng
        {"invoice_date": "2999-01-01"},
        {"gross_mass_kg": "0"},
        {"gross_mass_kg": "-1"},
        {"gross_mass_kg": "abc"},
        {"gross_mass_kg": 100},
        {"consignee_name": ""},
        {"consignee_name": "x" * 256},
        {"goods_description": ""},
        {"goods_description": "x" * 2001},
        {"invoice_number": ""},
        {"packages": ""},
        {"compliance_check_id": "khong-phai-uuid"},
    ],
)
async def test_input_validation(
    api_client: AsyncClient,
    db_session: AsyncSession,
    exporter: uuid.UUID,
    queued_jobs: list[str],
    over: dict[str, Any],
) -> None:
    check = await roo_check(db_session, exporter)
    payload = body(check.id, **over)
    if over.get("compliance_check_id"):
        payload["compliance_check_id"] = over["compliance_check_id"]
    r = await api_client.post(URL, json=payload)
    if over == {"consignee_country": "de "}:
        assert r.status_code == 202
    else:
        assert r.status_code == 422, r.text
        assert queued_jobs == []


async def test_documents_401_and_403(api_client: AsyncClient) -> None:
    for method, path in (
        ("POST", URL),
        ("GET", "/api/exporter/documents"),
        ("GET", f"/api/exporter/documents/{uuid.uuid4()}"),
    ):
        assert (await api_client.request(method, path, json={})).status_code == 401
    await login_as(api_client, "buyer", "b@x.vn")
    for method, path in (("POST", URL), ("GET", "/api/exporter/documents")):
        assert (await api_client.request(method, path, json={})).status_code == 403


async def test_document_without_company_profile_404(
    api_client: AsyncClient, db_session: AsyncSession, queued_jobs: list[str]
) -> None:
    await login_as(api_client, "exporter", "nocompany@x.vn")
    check = await roo_check(db_session, None)
    assert (await api_client.post(URL, json=body(check.id))).status_code == 404


async def test_goods_description_fallback_prefers_the_eight_digit_catalog_name(
    api_client: AsyncClient, db_session: AsyncSession, exporter: uuid.UUID, queued_jobs: list[str]
) -> None:
    await upsert_hs_codes(
        db_session,
        [
            HsCodeIn(
                code="09012190",
                name_vi="Cà phê rang",
                name_en="Roasted coffee eightdigit",
                category="agriculture",
                is_calculator_supported=True,
            )
        ],
    )
    check = await roo_check(db_session, exporter, hs="09012190")
    document_id = uuid.UUID((await api_client.post(URL, json=body(check.id))).json()["id"])
    doc = await db_session.get_one(Document, document_id)
    doc.input_data = {**doc.input_data, "goods_description": ""}
    await db_session.flush()
    await documents.generate_document(db_session, FakeStorage(), document_id)
    ready = await db_session.get_one(Document, document_id)
    assert ready.file_key is not None
    text = PdfReader(io.BytesIO(FakeStorage.objects[ready.file_key])).pages[0].extract_text()
    assert "eightdigit" in text
