"""Kiểm chéo bằng chứng với nguồn cấp (I8). Dữ liệu SYNTHETIC.

"Xong khi": bằng chứng đã duyệt luôn có ≥ 1 kiểm chéo đủ nguồn/ảnh/người/ngày; không lên
evfta_verified khi bằng chứng bắt buộc chưa có kiểm chéo 'match'; so khớp nội bộ gắn cờ đúng.
"""

import datetime as dt
import io
import uuid

import pytest
from httpx import AsyncClient
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.core.errors import AppError
from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import company_body, login_as, product_body
from app.modules.verification import evidence_service
from app.modules.verification.models import ApprovalStatus, Evidence, EvidenceType
from app.modules.verification.tests.helpers import (
    TODAY,
    add_rule,
    add_type,
    prove_ownership,
    snapshot_key,
)
from app.modules.verification.tests.test_verification_requests import (
    QUEUE,
    SUBMIT,
    login_admin,
    new_exporter,
)

BODIES = "/api/admin/certification-bodies"
SGS = {
    "name": "SGS Vietnam",
    "official_domain": "sgs.com",
    "contact_email": "certcheck@sgs.com",
    "lookup_url": "https://www.sgs.com/certified-clients",
    "accreditation_body": "UKAS",
    "iaf_mla": True,
}


def checks_url(evidence_id: object) -> str:
    return f"/api/admin/evidences/{evidence_id}/checks"


async def add_evidence(
    session: AsyncSession, company_id: uuid.UUID | str, **over: object
) -> Evidence:
    if await session.get(EvidenceType, "iso_9001") is None:
        await add_type(session, None)
    values: dict[str, object] = {
        "company_id": uuid.UUID(str(company_id)),
        "type_code": "iso_9001",
        "file_key": f"evidence/{company_id}/{uuid.uuid4().hex}.pdf",
        "certificate_number": "VN-123",
        "issuer": "SGS (verify@sgs-check.fake)",
        "issued_at": TODAY - dt.timedelta(days=10),
        "approval_status": ApprovalStatus.pending,
    }
    row = Evidence(**(values | over))
    session.add(row)
    await session.flush()
    return row


async def reviewed_body(client: AsyncClient, **over: object) -> str:
    r = await client.post(BODIES, json={**SGS, **over})
    assert r.status_code == 201, r.text
    body_id = r.json()["id"]
    assert (await client.post(f"{BODIES}/{body_id}/review")).status_code == 200
    return str(body_id)


def external(company_id: object, **over: object) -> dict[str, object]:
    return {
        "check_type": "registry_lookup",
        "result": "match",
        "source": "https://www.iafcertsearch.org/",
        "snapshot_key": snapshot_key(str(company_id)),
        **over,
    }


# ── Tổ chức cấp: dữ liệu cấu hình có người duyệt ───────────────────────────────────────────
async def test_certification_body_crud_review_and_audit(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_admin(api_client, db_session)
    r = await api_client.post(BODIES, json=SGS)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["reviewed_by"] is None  # tạo mới luôn chưa duyệt
    assert (await api_client.post(BODIES, json=SGS)).status_code == 409
    reviewed = (await api_client.post(f"{BODIES}/{body['id']}/review")).json()
    assert reviewed["reviewed_by"] is not None
    patched = await api_client.patch(
        f"{BODIES}/{body['id']}", json={"lookup_url": "https://sgs.com/x"}
    )
    assert patched.status_code == 200 and patched.json()["reviewed_by"] is None  # sửa → duyệt lại
    assert (await api_client.delete(f"{BODIES}/{body['id']}")).status_code == 204
    actions = set(await db_session.scalars(select(AuditLog.action_type)))
    assert {
        "certification_body.create",
        "certification_body.review",
        "certification_body.update",
        "certification_body.delete",
    } <= actions


@pytest.mark.parametrize(
    "over",
    [
        {"contact_email": "someone@gmail.com"},  # email ngoài domain chính thức
        {"official_domain": "not a domain"},
        {"lookup_url": "ftp://sgs.com"},
    ],
)
async def test_certification_body_validation(
    api_client: AsyncClient, db_session: AsyncSession, over: dict[str, object]
) -> None:
    await login_admin(api_client, db_session)
    assert (await api_client.post(BODIES, json={**SGS, **over})).status_code == 422


async def test_patch_cannot_move_email_outside_domain(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_admin(api_client, db_session)
    body_id = (await api_client.post(BODIES, json=SGS)).json()["id"]
    r = await api_client.patch(f"{BODIES}/{body_id}", json={"contact_email": "x@gmail.com"})
    assert r.status_code == 422


def _xlsx(rows: list[list[object]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    assert ws is not None
    ws.title = "data"
    ws.append(["name", "official_domain", "contact_email", "lookup_url", "iaf_mla"])
    for row in rows:
        ws.append(row)
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


async def test_import_never_reviews_and_export_shows_status(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_admin(api_client, db_session)
    data = _xlsx(
        [["Bureau Veritas", "bureauveritas.com", "verify@bureauveritas.com", None, "true"]]
    )
    files = {"file": ("bodies.xlsx", data, "application/octet-stream")}
    r = await api_client.post(f"{BODIES}/import?dry_run=false", files=files)
    assert r.status_code == 200 and r.json()["created"] == 1, r.text
    [body] = (await api_client.get(BODIES)).json()
    assert body["reviewed_by"] is None and body["iaf_mla"] is True
    assert (await api_client.get(f"{BODIES}/export.xlsx")).status_code == 200
    assert (await api_client.get(f"{BODIES}/template.xlsx")).status_code == 200


# ── Kiểm chéo nguồn ngoài: nguồn + ảnh chụp bắt buộc ───────────────────────────────────────
async def test_snapshot_presign_is_scoped_to_company_folder(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    await login_admin(api_client, db_session)
    r = await api_client.post(
        f"/api/admin/companies/{company_id}/check-snapshots", json={"content_type": "image/png"}
    )
    assert r.status_code == 201, r.text
    assert r.json()["key"].startswith(f"checks/{company_id}/") and r.json()["key"].endswith(".png")


@pytest.mark.parametrize(
    "over",
    [
        {"source": ""},
        {"snapshot_key": ""},
        {"snapshot_key": "checks/other-company/x.png"},
        {"snapshot_key": "evidence/x/a.pdf"},
        {"check_type": "issuer_email"},  # thiếu tổ chức cấp
    ],
)
async def test_external_check_requires_source_and_own_snapshot(
    api_client: AsyncClient,
    db_session: AsyncSession,
    company_id: uuid.UUID,
    over: dict[str, object],
) -> None:
    evidence = await add_evidence(db_session, company_id)
    await login_admin(api_client, db_session)
    r = await api_client.post(checks_url(evidence.id), json=external(company_id, **over))
    assert r.status_code == 422, r.text


async def test_snapshot_must_really_be_uploaded(db_session: AsyncSession) -> None:
    class Empty:
        async def get(self, key: str) -> bytes | None:
            return None

    company_id = uuid.uuid4()
    with pytest.raises(AppError) as exc:
        await evidence_service.ensure_snapshot(Empty(), company_id, f"checks/{company_id}/a.png")  # type: ignore[arg-type]
    assert exc.value.code == "invalid_snapshot"


async def test_issuer_email_check_needs_reviewed_body(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    evidence = await add_evidence(db_session, company_id)
    await login_admin(api_client, db_session)
    body_id = (await api_client.post(BODIES, json=SGS)).json()["id"]  # chưa duyệt
    payload = external(company_id, check_type="issuer_email", certification_body_id=body_id)
    assert (await api_client.post(checks_url(evidence.id), json=payload)).status_code == 422
    await api_client.post(f"{BODIES}/{body_id}/review")
    r = await api_client.post(checks_url(evidence.id), json=payload)
    assert r.status_code == 201, r.text
    out = r.json()
    assert (out["check_type"], out["certification_body_id"], out["checked_by"]) == (
        "issuer_email",
        body_id,
        out["checked_by"],
    )
    assert out["snapshot_url"] and out["checked_at"]


async def test_body_in_use_cannot_be_deleted(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    evidence = await add_evidence(db_session, company_id)
    await login_admin(api_client, db_session)
    body_id = await reviewed_body(api_client)
    await api_client.post(
        checks_url(evidence.id),
        json=external(company_id, check_type="issuer_email", certification_body_id=body_id),
    )
    assert (await api_client.delete(f"{BODIES}/{body_id}")).status_code == 409


# ── Chặn duyệt khi chưa kiểm chéo ──────────────────────────────────────────────────────────
async def test_evidence_cannot_be_approved_without_cross_check(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    evidence = await add_evidence(db_session, company_id)
    await login_admin(api_client, db_session)
    review = f"/api/admin/evidences/{evidence.id}/review"
    r = await api_client.post(review, json={"decision": "approve"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "cross_check_required"
    # not_found vẫn cho duyệt (trung thực: không có nguồn để đối chiếu) — có nguồn + ảnh + người.
    await api_client.post(checks_url(evidence.id), json=external(company_id, result="not_found"))
    assert (await api_client.post(review, json={"decision": "approve"})).status_code == 200
    audit = (
        await db_session.scalars(
            select(AuditLog).where(AuditLog.action_type == "evidence_check.registry_lookup")
        )
    ).one()
    assert audit.actor_id is not None and audit.created_at is not None
    assert audit.after_state is not None
    assert audit.after_state["source"] and audit.after_state["snapshot_key"]


async def test_reject_does_not_need_cross_check(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    evidence = await add_evidence(db_session, company_id)
    await login_admin(api_client, db_session)
    r = await api_client.post(
        f"/api/admin/evidences/{evidence.id}/review", json={"decision": "reject", "reason": "mờ"}
    )
    assert r.status_code == 200


# ── Cổng evfta_verified: bằng chứng bắt buộc phải kiểm chéo 'match' ─────────────────────────
@pytest.mark.usefixtures("hs_seeded")
async def test_only_match_cross_check_counts_for_evfta_verified(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID, reviewer_id: uuid.UUID
) -> None:
    await add_type(db_session, reviewer_id)
    await add_rule(db_session, reviewer_id, "iso_9001")
    await api_client.post("/api/exporter/products", json=product_body(hs_code="090121"))
    evidence = await add_evidence(db_session, company_id, approval_status=ApprovalStatus.approved)
    await prove_ownership(db_session, company_id)
    now = dt.datetime.now(dt.UTC)
    await companies.set_verification_state(
        db_session, company_id, status="verified", level="basic", verified_at=now, expires_at=None
    )
    await login_admin(api_client, db_session)

    async def level() -> str:
        return (await companies.get_verification_state(db_session, company_id)).level

    await api_client.post(checks_url(evidence.id), json=external(company_id, result="not_found"))
    assert await level() == "basic"
    await api_client.post(checks_url(evidence.id), json=external(company_id, result="match"))
    assert await level() == "evfta_verified"
    await api_client.post(checks_url(evidence.id), json=external(company_id, result="mismatch"))
    assert await level() == "basic"  # lần kiểm sau đè lần trước
    state = await companies.get_verification_state(db_session, company_id)
    assert state.status == "verified"  # kiểm chéo chỉ đổi MỨC qua decide(), không đổi trạng thái


# ── So khớp nội bộ qua API ─────────────────────────────────────────────────────────────────
@pytest.mark.usefixtures("hs_seeded")
async def test_consistency_flags_name_mismatch_and_records_findings(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    await api_client.post("/api/exporter/products", json=product_body(hs_code="090121"))
    evidence = await add_evidence(db_session, company_id)
    await login_admin(api_client, db_session)
    url = f"/api/admin/evidences/{evidence.id}/consistency"
    ok = await api_client.post(
        url,
        json={
            "holder_name": "Nong San Viet Co., Ltd",
            "holder_address": "720A Dien Bien Phu, TP Ho Chi Minh",
            "scope_categories": ["agriculture"],
        },
    )
    assert ok.status_code == 201, ok.text
    assert ok.json()["result"] == "match", ok.json()["facts"]
    bad = await api_client.post(url, json={"holder_name": "Công ty TNHH Thủy Sản Mekong"})
    findings = {f["rule"]: f["result"] for f in bad.json()["facts"]["findings"]}
    assert bad.json()["result"] == "mismatch" and findings["name"] == "mismatch"


async def test_consistency_detects_certificate_reused_by_another_company(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    a = await new_exporter(api_client, "a@x-one.vn", "Công ty A")
    b = await new_exporter(api_client, "b@x-two.vn", "Công ty B")
    await add_evidence(db_session, a, certificate_number="QMS 2024-777")
    copied = await add_evidence(db_session, b, certificate_number="qms2024-777")
    await login_admin(api_client, db_session)
    r = await api_client.post(f"/api/admin/evidences/{copied.id}/consistency", json={})
    findings = {f["rule"]: f["result"] for f in r.json()["facts"]["findings"]}
    assert findings["duplicate_certificate"] == "mismatch"
    assert findings["duplicate_tax_id"] == "mismatch"  # company_body mặc định cùng MST


# ── Email xác nhận: người nhận luôn từ bảng tổ chức cấp đã duyệt ────────────────────────────
async def test_issuer_email_draft_uses_registered_contact(
    api_client: AsyncClient, db_session: AsyncSession, company_id: uuid.UUID
) -> None:
    evidence = await add_evidence(db_session, company_id)
    await login_admin(api_client, db_session)
    body_id = await reviewed_body(api_client)
    r = await api_client.get(f"/api/admin/evidences/{evidence.id}/issuer-email?body_id={body_id}")
    assert r.status_code == 200, r.text
    draft = r.json()
    assert draft["to"] == "certcheck@sgs.com"
    assert "sgs-check.fake" not in draft["to"] and "VN-123" in draft["subject"]


# ── Hàng đợi: bằng chứng lệch lên đầu ──────────────────────────────────────────────────────
async def test_queue_puts_evidence_mismatch_first_and_lists_checks(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "exporter", "owner@c-corp.vn")
    clean = (
        await api_client.post(
            "/api/me/company",
            json=company_body(
                legal_name="Công ty C",
                tax_id="0100000001",
                website="https://c-corp.vn",
                contact_email="info@c-corp.vn",
            ),
        )
    ).json()["id"]
    await api_client.post(SUBMIT)  # C nộp trước, không có cờ
    other = await new_exporter(api_client, "d@d-two.vn", "Công ty D")
    evidence = await add_evidence(db_session, other)
    await api_client.post(SUBMIT)
    await login_admin(api_client, db_session)
    await api_client.post(
        f"/api/admin/evidences/{evidence.id}/consistency", json={"holder_name": "Ai Khác Hoàn Toàn"}
    )
    queue = (await api_client.get(QUEUE)).json()
    by_company = {q["company_id"]: q for q in queue}
    assert queue[0]["company_id"] == other
    assert {"code": "evidence_mismatch", "severity": "high"} in by_company[other]["signals"]
    assert [c["check_type"] for c in by_company[other]["checks"]] == ["internal_consistency"]
    assert clean in by_company


# ── Phân quyền ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", BODIES),
        ("POST", BODIES),
        ("GET", f"{BODIES}/template.xlsx"),
        ("GET", f"{BODIES}/export.xlsx"),
        ("PATCH", BODIES + "/{id}"),
        ("DELETE", BODIES + "/{id}"),
        ("POST", BODIES + "/{id}/review"),
        ("POST", "/api/admin/companies/{id}/check-snapshots"),
        ("POST", "/api/admin/evidences/{id}/checks"),
        ("POST", "/api/admin/evidences/{id}/consistency"),
        ("GET", "/api/admin/evidences/{id}/issuer-email?body_id={id}"),
    ],
)
async def test_crosscheck_routes_need_admin(
    api_client: AsyncClient, method: str, path: str
) -> None:
    url = path.format(id=uuid.uuid4())
    payload: dict[str, object] | None = {} if method in ("POST", "PATCH") else None
    assert (await api_client.request(method, url, json=payload)).status_code == 401
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.request(method, url, json=payload)).status_code == 403
