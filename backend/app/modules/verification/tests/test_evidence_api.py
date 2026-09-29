"""API bằng chứng của exporter và danh sách kiểm (C6). Loại và quy tắc trong test là SYNTHETIC."""

import datetime as dt
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.companies.tests.helpers import login_as, product_body
from app.modules.verification.models import ApprovalStatus, Evidence
from app.modules.verification.tests.helpers import TODAY, add_rule, add_type, body

pytestmark = pytest.mark.usefixtures("hs_seeded")

LIST = "/api/exporter/evidences"


@pytest.fixture
async def exporter(api_client: AsyncClient) -> str:
    """Exporter đã đăng nhập, có công ty; trả về company_id."""
    await login_as(api_client, "exporter", "exp@x.vn")
    from app.modules.companies.tests.helpers import company_body

    r = await api_client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


# ── Nộp bằng chứng ──────────────────────────────────────────────────────────
async def test_create_evidence_pending_with_structured_fields(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    r = await api_client.post(LIST, json=body(exporter))
    assert r.status_code == 201, r.text
    d = r.json()
    assert (d["type_code"], d["certificate_number"], d["issuer"], d["approval_status"]) == (
        "iso_9001",
        "VN-123",
        "SGS Vietnam",
        "pending",
    )
    assert (d["type_name_vi"], d["type_name_en"]) == ("Loại iso_9001", "Type iso_9001")


async def test_certificate_number_and_issuer_stored(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    created = (await api_client.post(LIST, json=body(exporter))).json()
    row = await db_session.get(Evidence, uuid.UUID(created["id"]))
    assert row is not None and (row.certificate_number, row.issuer) == ("VN-123", "SGS Vietnam")


async def test_evidence_type_is_a_closed_set_from_reviewed_list(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, None, code="unreviewed")  # luật TM chưa duyệt
    await add_type(db_session, reviewer_id, code="inactive", active=False)
    for code in ("unreviewed", "inactive", "khong_co", ""):
        r = await api_client.post(LIST, json=body(exporter, type_code=code))
        assert r.status_code == 422, (code, r.text)


async def test_origin_type_expiry_is_computed_not_trusted(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id, code="eur1_issued", validity=12)
    issued = dt.date(TODAY.year, 1, 31) - dt.timedelta(days=1)
    r = await api_client.post(
        LIST,
        json=body(
            exporter,
            type_code="eur1_issued",
            issued_at=issued.isoformat(),
            expires_at="2099-01-01",
        ),
    )
    assert r.status_code == 201, r.text
    assert r.json()["expires_at"] == dt.date(issued.year + 1, issued.month, issued.day).isoformat()


@pytest.mark.parametrize(
    "over",
    [
        {"issued_at": (TODAY + dt.timedelta(days=1)).isoformat()},  # cấp trong tương lai
        {"issued_at": "khong-phai-ngay"},
        {"expires_at": (TODAY - dt.timedelta(days=60)).isoformat()},  # trước ngày cấp
        {"file_key": "evidence/other-company/abc.pdf"},
        {"file_key": "logos/x/abc.png"},
        {"file_key": ""},
        {"certificate_number": "x" * 129},
        {"issuer": "x" * 256},
    ],
)
async def test_create_evidence_validation(
    api_client: AsyncClient,
    db_session: AsyncSession,
    exporter: str,
    reviewer_id: uuid.UUID,
    over: dict[str, Any],
) -> None:
    await add_type(db_session, reviewer_id)
    assert (await api_client.post(LIST, json=body(exporter, **over))).status_code == 422


async def test_file_key_must_belong_to_own_company(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    stranger = str(uuid.uuid4())
    r = await api_client.post(LIST, json=body(exporter, file_key=f"evidence/{stranger}/a.pdf"))
    assert r.status_code == 422


async def test_evidence_without_company_404(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await login_as(api_client, "exporter", "nocompany@x.vn")
    await add_type(db_session, reviewer_id)
    r = await api_client.post(LIST, json=body(str(uuid.uuid4())))
    assert r.status_code == 404


async def test_list_get_patch_delete_own_evidence(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    created = (await api_client.post(LIST, json=body(exporter))).json()
    evidence_id = created["id"]
    assert [x["id"] for x in (await api_client.get(LIST)).json()] == [evidence_id]
    assert (await api_client.get(f"{LIST}/{evidence_id}")).json()["id"] == evidence_id
    patched = await api_client.patch(f"{LIST}/{evidence_id}", json={"issuer": "Bureau Veritas"})
    assert (patched.json()["issuer"], patched.json()["approval_status"]) == (
        "Bureau Veritas",
        "pending",
    )
    assert (await api_client.delete(f"{LIST}/{evidence_id}")).status_code == 204
    assert (await api_client.get(LIST)).json() == []


async def test_editing_approved_evidence_returns_it_to_pending(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    evidence_id = (await api_client.post(LIST, json=body(exporter))).json()["id"]
    row = await db_session.get(Evidence, uuid.UUID(evidence_id))
    assert row is not None
    row.approval_status = ApprovalStatus.approved
    row.reviewed_by = reviewer_id
    await db_session.flush()
    r = await api_client.patch(f"{LIST}/{evidence_id}", json={"certificate_number": "NEW-1"})
    assert r.json()["approval_status"] == "pending"


async def test_other_exporter_cannot_touch_my_evidence(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    evidence_id = (await api_client.post(LIST, json=body(exporter))).json()["id"]
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "exporter", "other@x.vn")
    from app.modules.companies.tests.helpers import company_body

    await api_client.post("/api/me/company", json=company_body(legal_name="Công ty khác"))
    assert (await api_client.get(f"{LIST}/{evidence_id}")).status_code == 404
    assert (
        await api_client.patch(f"{LIST}/{evidence_id}", json={"issuer": "x"})
    ).status_code == 404
    assert (await api_client.delete(f"{LIST}/{evidence_id}")).status_code == 404
    assert (await api_client.get(LIST)).json() == []


async def test_evidence_routes_401_and_403(api_client: AsyncClient) -> None:
    assert (await api_client.get(LIST)).status_code == 401
    assert (await api_client.post(LIST, json={})).status_code == 401
    assert (await api_client.get(f"{LIST}/checklist")).status_code == 401
    await login_as(api_client, "buyer", "buyer@x.vn")
    for method, path in (("GET", LIST), ("POST", LIST), ("GET", f"{LIST}/checklist")):
        assert (await api_client.request(method, path, json={})).status_code == 403


async def test_evidence_delete_writes_audit(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    evidence_id = (await api_client.post(LIST, json=body(exporter))).json()["id"]
    await api_client.delete(f"{LIST}/{evidence_id}")
    actions = list(await db_session.scalars(select(AuditLog.action_type)))
    assert "evidence.create" in actions and "evidence.delete" in actions


# ── Presign tải file bằng chứng ─────────────────────────────────────────────
async def test_presign_evidence_pdf_for_exporter(api_client: AsyncClient, exporter: str) -> None:
    r = await api_client.post(
        "/api/uploads/presign", json={"purpose": "evidence", "content_type": "application/pdf"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["key"].startswith(f"evidence/{exporter}/") and r.json()["key"].endswith(".pdf")


async def test_presign_evidence_rejects_other_content_types_and_buyers(
    api_client: AsyncClient,
) -> None:
    await login_as(api_client, "buyer", "b@x.vn")
    r = await api_client.post(
        "/api/uploads/presign", json={"purpose": "evidence", "content_type": "application/pdf"}
    )
    assert r.status_code in (403, 404)
    r2 = await api_client.post(
        "/api/uploads/presign", json={"purpose": "evidence", "content_type": "application/zip"}
    )
    assert r2.status_code == 422


# ── Danh sách kiểm theo nhóm hàng ───────────────────────────────────────────
async def add_product(client: AsyncClient, hs: str = "090121") -> None:
    r = await client.post("/api/exporter/products", json=product_body(hs_code=hs))
    assert r.status_code == 201, r.text


async def test_checklist_per_category(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id, code="iso_9001")
    await add_type(db_session, reviewer_id, code="haccp")
    await add_type(db_session, reviewer_id, code="other_cat")
    await add_rule(db_session, reviewer_id, "iso_9001", category="agriculture")
    await add_rule(db_session, reviewer_id, "haccp", category="agriculture")
    await add_rule(db_session, reviewer_id, "other_cat", category="seafood")  # nhóm không liên quan
    await add_product(api_client, "090121")  # cà phê rang → agriculture
    items = (await api_client.get(f"{LIST}/checklist")).json()
    assert sorted(i["type_code"] for i in items) == ["haccp", "iso_9001"]
    assert {i["state"] for i in items} == {"missing"}
    assert all(i["required"] for i in items)


async def test_checklist_state_follows_evidence(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    await add_rule(db_session, reviewer_id, "iso_9001")
    await add_product(api_client)
    evidence_id = (await api_client.post(LIST, json=body(exporter))).json()["id"]
    [item] = (await api_client.get(f"{LIST}/checklist")).json()
    assert item["state"] == "pending"
    row = await db_session.get(Evidence, uuid.UUID(evidence_id))
    assert row is not None
    row.approval_status = ApprovalStatus.approved
    await db_session.flush()
    [item] = (await api_client.get(f"{LIST}/checklist")).json()
    assert item["state"] == "approved"


async def test_checklist_ignores_unreviewed_rules_and_types(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id, code="ok")
    await add_type(db_session, None, code="draft_type")
    await add_rule(db_session, None, "ok")  # luật chưa duyệt
    await add_rule(db_session, reviewer_id, "draft_type")  # loại chưa duyệt
    await add_product(api_client)
    assert (await api_client.get(f"{LIST}/checklist")).json() == []


async def test_coffee_checklist_reminds_eudr_only_when_rule_exists(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id, code="eudr_file")
    await add_product(api_client, "090111")
    assert (await api_client.get(f"{LIST}/checklist")).json() == []  # chưa có luật → không nhắc
    await add_rule(
        db_session, reviewer_id, "eudr_file", required=False, note="Nộp hồ sơ EUDR (synthetic)"
    )
    [item] = (await api_client.get(f"{LIST}/checklist")).json()
    assert (item["type_code"], item["required"], item["note"]) == (
        "eudr_file",
        False,
        "Nộp hồ sơ EUDR (synthetic)",
    )


async def test_checklist_empty_without_products(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    await add_rule(db_session, reviewer_id, "iso_9001")
    assert (await api_client.get(f"{LIST}/checklist")).json() == []


async def test_exporter_sees_only_reviewed_active_types(
    api_client: AsyncClient, db_session: AsyncSession, exporter: str, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id, code="visible", validity=12)
    await add_type(db_session, None, code="draft")
    await add_type(db_session, reviewer_id, code="inactive", active=False)
    r = await api_client.get("/api/exporter/evidence-types")
    assert r.status_code == 200, r.text
    [item] = r.json()
    assert (item["code"], item["validity_months"], item["name_vi"]) == (
        "visible",
        12,
        "Loại visible",
    )
    assert set(item) == {
        "code",
        "name_vi",
        "name_en",
        "group",
        "validity_months",
    }  # không lộ dữ liệu duyệt


async def test_evidence_types_401_and_403(api_client: AsyncClient) -> None:
    assert (await api_client.get("/api/exporter/evidence-types")).status_code == 401
    await login_as(api_client, "buyer", "b2@x.vn")
    assert (await api_client.get("/api/exporter/evidence-types")).status_code == 403
