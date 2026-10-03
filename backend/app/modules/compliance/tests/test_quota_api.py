"""U13: kịch bản hạn ngạch qua API — chỉ từ hạn ngạch + phân nhóm ĐÃ DUYỆT. Số liệu SYNTHETIC."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD
from app.modules.compliance.models import (
    ComplianceCheck,
    DutyType,
    ProductSubtype,
    TariffQuota,
)
from app.modules.compliance.tests.test_tariff_api import (
    RICE,
    TODAY,
    URL,
    add_line,
    assert_no_numbers,
    body,
)

pytestmark = pytest.mark.usefixtures("hs_seeded")

NOW = dt.datetime.now(dt.UTC)


async def add_subtype(
    session: AsyncSession, reviewer: uuid.UUID | None, code: str, prefix: str = "1006"
) -> ProductSubtype:
    row = ProductSubtype(
        code=code,
        hs_prefix=prefix,
        name_vi=f"Phân nhóm {code}",
        name_en=f"Subtype {code}",
        reviewed_by=reviewer,
        reviewed_at=NOW if reviewer else None,
    )
    session.add(row)
    await session.flush()
    return row


async def add_quota(
    session: AsyncSession,
    reviewer: uuid.UUID | None,
    eligible: list[ProductSubtype],
    **over: Any,
) -> TariffQuota:
    fields: dict[str, Any] = {
        "agreement_code": "EVFTA",
        "destination": "EU",
        "hs_prefix": "100630",
        "quota_code": "09.TEST",
        "quota_year": TODAY.year,
        "volume": Decimal("30000"),
        "in_quota_duty_type": DutyType.ad_valorem,
        "in_quota_rate": Decimal("0"),
        "out_quota_duty_type": DutyType.specific,
        "out_quota_specific": Decimal("100"),
        "specific_unit": "tonne",
        "licence_note_vi": "Cần giấy chứng nhận chủng loại (synthetic).",
        "valid_from": TODAY - dt.timedelta(days=30),
        "reviewed_by": reviewer,
        "reviewed_at": NOW if reviewer else None,
    }
    fields.update(over)
    row = TariffQuota(**fields)
    row.eligible_subtypes = eligible
    session.add(row)
    await session.flush()
    return row


async def rice_line(session: AsyncSession, reviewer: uuid.UUID) -> None:
    await add_line(
        session,
        reviewer,
        hs=RICE,
        duty_type=DutyType.specific,
        mfn_rate=None,
        evfta_rate_current=Decimal("0"),
        quota_required=True,
        quota_note="TRQ synthetic",
    )


def rice(**over: Any) -> dict[str, Any]:
    return body(hs_code=RICE, product_value="50000.00", shipments_per_year=None, **over)


async def test_eligible_subtype_gets_in_and_out_of_quota_scenarios(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await rice_line(db_session, reviewer_id)
    fragrant = await add_subtype(db_session, reviewer_id, "rice_fragrant_listed")
    await add_subtype(db_session, reviewer_id, "rice_fragrant_other")  # vd ST25: không đủ điều kiện
    await add_quota(db_session, reviewer_id, [fragrant])

    r = await api_client.post(
        URL,
        json=rice(subtype_code="rice_fragrant_listed", quantity="100", quota_allocated="unknown"),
    )
    assert r.status_code == 200, r.text
    out = r.json()
    assert (out["status"], out["data_status"], out["review_reason"]) == (
        "quota_scenarios",
        "reviewed",
        None,
    )
    assert [(s["kind"], s["duty"]) for s in out["scenarios"]] == [
        ("in_quota", "0.00"),
        ("out_of_quota", "10000.00"),
    ]
    assert out["savings"] == "10000.00"
    assert out["conditions"] == ["origin", "allocation", "subtype", "licence"]
    assert out["quota"]["quota_code"] == "09.TEST" and out["quota"]["volume"] == "30000.000"
    assert out["subtype"]["code"] == "rice_fragrant_listed"
    assert out["quota_allocated"] == "unknown"
    # Không bao giờ trình bày như 0% vô điều kiện: số MFN/ưu đãi thường vẫn trống.
    assert out["mfn_rate"] is None and out["evfta_rate"] is None

    check = await db_session.scalar(select(ComplianceCheck).order_by(ComplianceCheck.created_at))
    assert check is not None
    assert (check.status, check.data_status) == ("quota_scenarios", "reviewed")
    assert check.scenario is not None and check.scenario["subtype_code"] == "rice_fragrant_listed"


@pytest.mark.parametrize(
    ("over", "reason"),
    [
        ({}, "subtype_required"),
        (
            {"subtype_code": "rice_fragrant_other", "quantity": "100"},
            "subtype_not_eligible",
        ),  # ST25
        ({"subtype_code": "rice_fragrant_listed"}, "quantity_required"),
        ({"subtype_code": "rice_unknown", "quantity": "100"}, "subtype_not_eligible"),
    ],
)
async def test_needs_review_cases_have_no_numbers(
    api_client: AsyncClient,
    db_session: AsyncSession,
    reviewer_id: uuid.UUID,
    over: dict[str, Any],
    reason: str,
) -> None:
    await rice_line(db_session, reviewer_id)
    fragrant = await add_subtype(db_session, reviewer_id, "rice_fragrant_listed")
    await add_subtype(db_session, reviewer_id, "rice_fragrant_other")
    await add_quota(db_session, reviewer_id, [fragrant])
    out = (await api_client.post(URL, json=rice(**over))).json()
    assert (out["status"], out["review_reason"]) == ("needs_review", reason)
    assert_no_numbers(out)
    assert out["scenarios"] == [] and out["quota"] is None
    # Phân nhóm đã duyệt được đưa ra để người dùng chọn.
    assert {s["code"] for s in out["subtypes"]} == {"rice_fragrant_listed", "rice_fragrant_other"}


async def test_unreviewed_quota_or_subtype_is_never_used(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await rice_line(db_session, reviewer_id)
    reviewed_subtype = await add_subtype(db_session, reviewer_id, "rice_fragrant_listed")
    draft_subtype = await add_subtype(db_session, None, "rice_draft")
    await add_quota(db_session, None, [reviewed_subtype])  # hạn ngạch chưa duyệt
    out = (
        await api_client.post(URL, json=rice(subtype_code="rice_fragrant_listed", quantity="10"))
    ).json()
    assert (out["status"], out["review_reason"]) == ("needs_review", "no_quota_data")
    assert_no_numbers(out)
    assert "rice_draft" not in {s["code"] for s in out["subtypes"]}

    await add_quota(db_session, reviewer_id, [draft_subtype], quota_code="09.DRAFT")
    out = (await api_client.post(URL, json=rice(subtype_code="rice_draft", quantity="10"))).json()
    assert (out["status"], out["review_reason"]) == ("needs_review", "subtype_not_eligible")


async def test_existing_st25_rule_still_holds_without_quota_rows(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await rice_line(db_session, reviewer_id)
    out = (await api_client.post(URL, json=rice(subtype_code="rice_st25", quantity="5"))).json()
    assert (out["status"], out["review_reason"]) == ("needs_review", "no_quota_data")
    assert_no_numbers(out)


async def test_options_list_subtypes_only_when_a_reviewed_quota_exists(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await rice_line(db_session, reviewer_id)
    fragrant = await add_subtype(db_session, reviewer_id, "rice_fragrant_listed")
    params = {"hs_code": RICE, "destination": "DE"}
    before = (await api_client.get("/api/public/tariff/options", params=params)).json()
    assert (before["quota_agreements"], before["subtypes"]) == ([], [])
    await add_quota(db_session, reviewer_id, [fragrant])
    after = (await api_client.get("/api/public/tariff/options", params=params)).json()
    assert after["quota_agreements"] == ["EVFTA"]
    assert [s["code"] for s in after["subtypes"]] == ["rice_fragrant_listed"]


async def test_quantity_must_be_a_decimal_string(api_client: AsyncClient) -> None:
    for bad in (100, "-1", "1,5", "abc"):
        r = await api_client.post(URL, json=rice(subtype_code="rice_x", quantity=bad))
        assert r.status_code == 422, bad


async def test_admin_manages_subtypes_and_quotas(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    for url in ("/api/admin/product-subtypes", "/api/admin/tariff-quotas"):
        assert (await api_client.get(url)).status_code == 401
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    login = {"email": "admin@evfta.eu", "password": PASSWORD}
    assert (await api_client.post("/api/auth/login", json=login)).status_code == 200

    subtype = await api_client.post(
        "/api/admin/product-subtypes",
        json={
            "code": "Rice_Fragrant",
            "hs_prefix": "1006.30",
            "name_vi": "Gạo thơm",
            "name_en": "Fragrant rice",
        },
    )
    assert subtype.status_code == 201, subtype.text
    assert (subtype.json()["code"], subtype.json()["hs_prefix"]) == ("rice_fragrant", "100630")

    quota = {
        "destination": "EU",
        "hs_prefix": "100630",
        "volume": "30000",
        "in_quota_duty_type": "ad_valorem",
        "in_quota_rate": "0",
        "out_quota_duty_type": "specific",
        "out_quota_specific": "100",
        "specific_unit": "tonne",
        "valid_from": "2026-01-01",
        "eligible_subtypes": ["rice_fragrant"],
    }
    created = await api_client.post("/api/admin/tariff-quotas", json=quota)
    assert created.status_code == 201, created.text
    assert created.json()["eligible_subtypes"] == ["rice_fragrant"]
    assert created.json()["agreement_code"] == "EVFTA" and created.json()["reviewed_by"] is None

    bad = await api_client.post("/api/admin/tariff-quotas", json={**quota, "specific_unit": None})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "invalid_quota"
    unknown = await api_client.post(
        "/api/admin/tariff-quotas", json={**quota, "eligible_subtypes": ["nope"]}
    )
    assert unknown.status_code == 422 and unknown.json()["error"]["code"] == "unknown_subtype"

    quota_id = created.json()["id"]
    reviewed = (await api_client.post(f"/api/admin/tariff-quotas/{quota_id}/review")).json()
    assert reviewed["reviewed_by"] is not None
    patched = (
        await api_client.patch(f"/api/admin/tariff-quotas/{quota_id}", json={"volume": "40000"})
    ).json()
    assert (patched["volume"], patched["reviewed_by"]) == ("40000.000", None)  # sửa → duyệt lại

    in_use = await api_client.delete(f"/api/admin/product-subtypes/{subtype.json()['id']}")
    assert in_use.status_code == 409 and in_use.json()["error"]["code"] == "subtype_in_use"
    assert (await api_client.delete(f"/api/admin/tariff-quotas/{quota_id}")).status_code == 204
    assert (
        await api_client.delete(f"/api/admin/product-subtypes/{subtype.json()['id']}")
    ).status_code == 204
