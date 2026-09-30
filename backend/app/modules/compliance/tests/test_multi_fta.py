"""U12: nhiều hiệp định — hiệp định áp dụng suy ra từ dòng thuế ĐÃ DUYỆT. Số liệu là SYNTHETIC."""

import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD
from app.modules.compliance.models import ComplianceCheck
from app.modules.compliance.tests.test_tariff_api import COFFEE, URL, add_line, body

pytestmark = pytest.mark.usefixtures("hs_seeded")

OPTIONS = "/api/public/tariff/options"


async def test_non_eu_market_uses_its_only_reviewed_agreement(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_line(db_session, reviewer_id)  # EVFTA / EU
    await add_line(
        db_session,
        reviewer_id,
        destination="GB",
        agreement_code="UKVFTA",
        mfn_rate=Decimal("8"),
        evfta_rate_current=Decimal("2"),
    )
    r = await api_client.post(URL, json=body(destination="GB"))
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["status"] == "ok"
    assert out["agreement"]["code"] == "UKVFTA"
    assert (out["preferential_rate"], out["preferential_duty"]) == ("2.0000", "200.00")
    assert out["evfta_rate"] == out["preferential_rate"]  # tên cũ giữ để tương thích
    check = await db_session.scalar(select(ComplianceCheck).order_by(ComplianceCheck.created_at))
    assert check is not None and check.agreement_code == "UKVFTA"

    eu = (await api_client.post(URL, json=body(destination="DE"))).json()
    assert (eu["agreement"]["code"], eu["preferential_rate"]) == ("EVFTA", "6.0000")


async def test_market_with_several_agreements_must_choose(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    for code, rate in (("CPTPP", "3"), ("VJEPA", "1")):
        await add_line(
            db_session,
            reviewer_id,
            destination="JP",
            agreement_code=code,
            mfn_rate=Decimal("10"),
            evfta_rate_current=Decimal(rate),
        )
    await add_line(db_session, None, destination="JP", agreement_code="RCEP")  # chưa duyệt
    options = (
        await api_client.get(OPTIONS, params={"hs_code": COFFEE, "destination": "jp"})
    ).json()
    assert [a["code"] for a in options["agreements"]] == ["CPTPP", "VJEPA"]

    r = await api_client.post(URL, json=body(destination="JP"))
    assert r.status_code == 422 and r.json()["error"]["code"] == "agreement_required"
    chosen = (await api_client.post(URL, json=body(destination="JP", agreement="VJEPA"))).json()
    assert (chosen["status"], chosen["preferential_rate"]) == ("ok", "1.0000")
    # Hiệp định chỉ có dòng chưa duyệt: không bao giờ dùng.
    rcep = (await api_client.post(URL, json=body(destination="JP", agreement="RCEP"))).json()
    assert rcep["status"] == "unsupported" and rcep["preferential_rate"] is None


async def test_options_need_valid_inputs(api_client: AsyncClient) -> None:
    assert (
        await api_client.get(OPTIONS, params={"hs_code": "12", "destination": "DE"})
    ).status_code == 422
    assert (
        await api_client.get(OPTIONS, params={"hs_code": COFFEE, "destination": "DEU"})
    ).status_code == 422
    empty = (await api_client.get(OPTIONS, params={"hs_code": COFFEE, "destination": "US"})).json()
    assert empty["agreements"] == []


async def test_admin_manages_agreements_and_tariff_line_agreement_codes(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    assert (await api_client.get("/api/admin/trade-agreements")).status_code == 401
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    login = {"email": "admin@evfta.eu", "password": PASSWORD}
    assert (await api_client.post("/api/auth/login", json=login)).status_code == 200
    listed = (await api_client.get("/api/admin/trade-agreements")).json()
    codes = {a["code"]: a for a in listed}
    assert {"EVFTA", "UKVFTA", "CPTPP", "RCEP"} <= set(codes)
    assert all(a["reviewed_by"] is None for a in listed)  # bản nháp, chờ luật TM duyệt
    assert codes["EVFTA"]["partners"] == ["EU"]

    line = {
        "hs_code": COFFEE,
        "destination": "GB",
        "agreement_code": "UKVFTA",
        "duty_type": "ad_valorem",
        "mfn_rate": "8",
        "evfta_rate_current": "2",
        "valid_from": "2026-01-01",
    }
    assert (await api_client.post("/api/admin/tariff-lines", json=line)).status_code == 201
    r = await api_client.post("/api/admin/tariff-lines", json={**line, "agreement_code": "NOPE"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "unknown_agreement"

    uk = codes["UKVFTA"]["id"]
    r = await api_client.delete(f"/api/admin/trade-agreements/{uk}")
    assert r.status_code == 409 and r.json()["error"]["code"] == "agreement_in_use"
    reviewed = (await api_client.post(f"/api/admin/trade-agreements/{uk}/review")).json()
    assert reviewed["reviewed_by"] is not None
    patched = (
        await api_client.patch(
            f"/api/admin/trade-agreements/{uk}", json={"in_force_from": "2021-05-01"}
        )
    ).json()
    assert (patched["in_force_from"], patched["reviewed_by"]) == ("2021-05-01", None)

    created = await api_client.post(
        "/api/admin/trade-agreements",
        json={"code": "TEST_FTA", "name_vi": "Thử", "name_en": "Test", "partners": ["xx"]},
    )
    assert created.status_code == 201 and created.json()["partners"] == ["XX"]
    dup = await api_client.post(
        "/api/admin/trade-agreements", json={"code": "TEST_FTA", "name_vi": "a", "name_en": "b"}
    )
    assert dup.status_code == 409
    assert (
        await api_client.delete(f"/api/admin/trade-agreements/{created.json()['id']}")
    ).status_code == 204
