"""U4: chứng nhận chỉ bắt buộc loại + file (khách: "chỉ cần tải lên là xong"); loại "Khác" tự ghi tên;
admin nhập ngày khi duyệt — loại có hạn dùng không được duyệt khi chưa có ngày cấp."""

import datetime as dt
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as
from app.modules.verification.tests.helpers import TODAY, add_type

pytestmark = pytest.mark.usefixtures("hs_seeded")
LIST = "/api/exporter/evidences"


async def _exporter(client: AsyncClient) -> str:
    await login_as(client, "exporter", "u4@x.vn")
    r = await client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


def _file(company_id: str) -> str:
    return f"evidence/{company_id}/{uuid.uuid4().hex}.pdf"


async def _as_admin(client: AsyncClient, session: AsyncSession) -> None:
    await create_admin(session, "admin-u4@evfta.eu", PASSWORD)
    r = await client.post(
        "/api/auth/login", json={"email": "admin-u4@evfta.eu", "password": PASSWORD}
    )
    assert r.status_code == 200, r.text


async def test_type_and_file_are_enough(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    company = await _exporter(api_client)
    await add_type(db_session, reviewer_id)
    r = await api_client.post(LIST, json={"type_code": "iso_9001", "file_key": _file(company)})
    assert r.status_code == 201, r.text
    d = r.json()
    assert (d["issued_at"], d["expires_at"], d["certificate_number"]) == (None, None, None)
    assert d["approval_status"] == "pending"


async def test_other_type_requires_a_document_name(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    company = await _exporter(api_client)
    await add_type(db_session, reviewer_id, code="other")
    missing = await api_client.post(LIST, json={"type_code": "other", "file_key": _file(company)})
    assert missing.status_code == 422
    r = await api_client.post(
        LIST,
        json={
            "type_code": "other",
            "file_key": _file(company),
            "custom_type_name": "Giấy chứng nhận Halal",
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["custom_type_name"] == "Giấy chứng nhận Halal"


async def test_custom_name_is_dropped_for_regular_types(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    company = await _exporter(api_client)
    await add_type(db_session, reviewer_id)
    r = await api_client.post(
        LIST, json={"type_code": "iso_9001", "file_key": _file(company), "custom_type_name": "X"}
    )
    assert r.json()["custom_type_name"] is None


async def test_admin_must_enter_issue_date_to_approve_a_type_with_validity(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    company = await _exporter(api_client)
    await add_type(db_session, reviewer_id, code="eur1_issued", validity=12)
    evidence = (
        await api_client.post(LIST, json={"type_code": "eur1_issued", "file_key": _file(company)})
    ).json()
    await _as_admin(api_client, db_session)
    review = f"/api/admin/evidences/{evidence['id']}/review"
    refused = await api_client.post(review, json={"decision": "approve"})
    assert refused.status_code == 422
    assert refused.json()["error"]["code"] == "issued_at_required"
    issued = TODAY - dt.timedelta(days=30)
    r = await api_client.post(review, json={"decision": "approve", "issued_at": issued.isoformat()})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["approval_status"] == "approved"
    assert d["issued_at"] == issued.isoformat()
    assert d["expires_at"] is not None  # hệ thống tự tính +12 tháng


async def test_admin_can_approve_undated_type_without_validity_and_add_expiry(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    company = await _exporter(api_client)
    await add_type(db_session, reviewer_id)
    evidence = (
        await api_client.post(LIST, json={"type_code": "iso_9001", "file_key": _file(company)})
    ).json()
    await _as_admin(api_client, db_session)
    expiry = (TODAY + dt.timedelta(days=400)).isoformat()
    r = await api_client.post(
        f"/api/admin/evidences/{evidence['id']}/review",
        json={"decision": "approve", "expires_at": expiry},
    )
    assert r.status_code == 200, r.text
    assert (r.json()["issued_at"], r.json()["expires_at"]) == (None, expiry)


async def test_future_issue_date_entered_by_admin_is_rejected(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    company = await _exporter(api_client)
    await add_type(db_session, reviewer_id, code="eur1_issued", validity=12)
    evidence = (
        await api_client.post(LIST, json={"type_code": "eur1_issued", "file_key": _file(company)})
    ).json()
    await _as_admin(api_client, db_session)
    tomorrow = (TODAY + dt.timedelta(days=1)).isoformat()
    r = await api_client.post(
        f"/api/admin/evidences/{evidence['id']}/review",
        json={"decision": "approve", "issued_at": tomorrow},
    )
    assert r.status_code == 422
