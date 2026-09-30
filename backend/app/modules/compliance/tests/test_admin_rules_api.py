"""API admin nhập + duyệt dòng thuế và quy tắc xuất xứ (C1/C4). Dữ liệu là SYNTHETIC."""

import datetime as dt
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, login_as
from app.modules.compliance.service import find_lines, find_rules

pytestmark = pytest.mark.usefixtures("hs_seeded")

TODAY = dt.datetime.now(dt.UTC).date()
FROM = (TODAY - dt.timedelta(days=30)).isoformat()

TARIFF = "/api/admin/tariff-lines"
RULES = "/api/admin/roo-rules"


def tariff_body(**over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {
        "hs_code": "090121",
        "destination": "EU",
        "duty_type": "ad_valorem",
        "mfn_rate": "7.5",
        "evfta_rate_current": "0",
        "quota_required": False,
        "source_url": "https://example.test/x",
        "valid_from": FROM,
    }
    b.update(over)
    return b


def rule_body(**over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {
        "hs_code": "090121",
        "rule_type": "MaxNOM",
        "threshold_pct": "70",
        "requires_expert": False,
        "rule_text": "synthetic",
        "source": "synthetic",
        "valid_from": FROM,
    }
    b.update(over)
    return b


@pytest.fixture
async def admin(api_client: AsyncClient, db_session: AsyncSession) -> AsyncClient:
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    r = await api_client.post(
        "/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD}
    )
    assert r.status_code == 200, r.text
    return api_client


async def audit_actions(session: AsyncSession) -> list[str]:
    rows = await session.scalars(select(AuditLog.action_type).order_by(AuditLog.created_at))
    return list(rows)


ROUTES = [
    ("GET", TARIFF),
    ("POST", TARIFF),
    ("PATCH", f"{TARIFF}/00000000-0000-0000-0000-000000000000"),
    ("POST", f"{TARIFF}/00000000-0000-0000-0000-000000000000/review"),
    ("DELETE", f"{TARIFF}/00000000-0000-0000-0000-000000000000"),
    ("GET", RULES),
    ("POST", RULES),
    ("PATCH", f"{RULES}/00000000-0000-0000-0000-000000000000"),
    ("POST", f"{RULES}/00000000-0000-0000-0000-000000000000/review"),
    ("DELETE", f"{RULES}/00000000-0000-0000-0000-000000000000"),
]


@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_admin_routes_401_without_session(
    api_client: AsyncClient, method: str, path: str
) -> None:
    assert (await api_client.request(method, path, json={})).status_code == 401


@pytest.mark.parametrize("role", ["exporter", "buyer"])
@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_admin_routes_403_for_other_roles(
    api_client: AsyncClient, role: str, method: str, path: str
) -> None:
    await login_as(api_client, role, f"{role}@x.vn")
    assert (await api_client.request(method, path, json={})).status_code == 403


# ── Dòng thuế ───────────────────────────────────────────────────────────────
async def test_created_tariff_line_is_unreviewed_and_not_public(
    admin: AsyncClient, db_session: AsyncSession
) -> None:
    r = await admin.post(TARIFF, json=tariff_body())
    assert r.status_code == 201, r.text
    d = r.json()
    assert (d["reviewed_by"], d["reviewed_at"], d["mfn_rate"]) == (None, None, "7.5000")
    assert await find_lines(db_session, "090121", "EU", TODAY) == []


async def test_review_makes_line_public_and_records_admin(
    admin: AsyncClient, db_session: AsyncSession
) -> None:
    line_id = (await admin.post(TARIFF, json=tariff_body())).json()["id"]
    r = await admin.post(f"{TARIFF}/{line_id}/review")
    assert r.status_code == 200, r.text
    me = (await admin.get("/api/me")).json()
    assert r.json()["reviewed_by"] == me["id"] and r.json()["reviewed_at"] is not None
    assert len(await find_lines(db_session, "090121", "EU", TODAY)) == 1
    assert await audit_actions(db_session) == [
        "user.create_admin",
        "tariff_line.create",
        "tariff_line.review",
    ]


async def test_editing_a_reviewed_line_removes_review(
    admin: AsyncClient, db_session: AsyncSession
) -> None:
    """Sửa dòng đã duyệt → phải duyệt lại; không có cửa sổ nào số mới đi ra công khai chưa duyệt."""
    line_id = (await admin.post(TARIFF, json=tariff_body())).json()["id"]
    await admin.post(f"{TARIFF}/{line_id}/review")
    r = await admin.patch(f"{TARIFF}/{line_id}", json={"mfn_rate": "9"})
    assert r.status_code == 200, r.text
    assert (r.json()["mfn_rate"], r.json()["reviewed_by"], r.json()["reviewed_at"]) == (
        "9.0000",
        None,
        None,
    )
    assert await find_lines(db_session, "090121", "EU", TODAY) == []
    assert "tariff_line.update" in await audit_actions(db_session)


async def test_patch_is_partial(admin: AsyncClient) -> None:
    line_id = (await admin.post(TARIFF, json=tariff_body(quota_note="giữ"))).json()["id"]
    r = await admin.patch(f"{TARIFF}/{line_id}", json={"condition_note": "mới"})
    assert (r.json()["quota_note"], r.json()["condition_note"], r.json()["mfn_rate"]) == (
        "giữ",
        "mới",
        "7.5000",
    )


async def test_patch_can_clear_a_nullable_field(admin: AsyncClient) -> None:
    line_id = (await admin.post(TARIFF, json=tariff_body(quota_note="x"))).json()["id"]
    r = await admin.patch(f"{TARIFF}/{line_id}", json={"quota_note": None})
    assert r.json()["quota_note"] is None


async def test_list_filters_by_hs_and_review_state(admin: AsyncClient) -> None:
    a = (await admin.post(TARIFF, json=tariff_body())).json()["id"]
    await admin.post(TARIFF, json=tariff_body(hs_code="090111"))
    await admin.post(f"{TARIFF}/{a}/review")
    everything = (await admin.get(TARIFF)).json()
    assert len(everything) == 2
    assert [x["id"] for x in (await admin.get(TARIFF, params={"reviewed": "true"})).json()] == [a]
    assert len((await admin.get(TARIFF, params={"reviewed": "false"})).json()) == 1
    only_coffee = (await admin.get(TARIFF, params={"hs_code": "0901.11"})).json()
    assert [x["hs_code"] for x in only_coffee] == ["090111"]


async def test_delete_unreviewed_ok_and_reviewed_conflict(
    admin: AsyncClient, db_session: AsyncSession
) -> None:
    draft = (await admin.post(TARIFF, json=tariff_body())).json()["id"]
    assert (await admin.delete(f"{TARIFF}/{draft}")).status_code == 204
    assert (await admin.get(TARIFF)).json() == []
    reviewed = (await admin.post(TARIFF, json=tariff_body())).json()["id"]
    await admin.post(f"{TARIFF}/{reviewed}/review")
    assert (await admin.delete(f"{TARIFF}/{reviewed}")).status_code == 409
    assert len(await find_lines(db_session, "090121", "EU", TODAY)) == 1


@pytest.mark.parametrize(
    "over",
    [
        {"hs_code": "999999"},  # không có trong danh mục
        {"hs_code": "abc"},
        {"destination": "US"},
        {"mfn_rate": "101"},
        {"mfn_rate": "-1"},
        {"mfn_rate": 7.5},  # số JSON không được nhận (float)
        {"mfn_rate": "1e1"},
        {"mfn_rate": "7.55555"},
        {"evfta_rate_current": "abc"},
        {"duty_type": "other"},
        {"valid_until": FROM},  # bằng valid_from
        {"valid_from": "không phải ngày"},
        {"source_url": "x" * 1025},
    ],
)
async def test_tariff_line_validation(admin: AsyncClient, over: dict[str, Any]) -> None:
    assert (await admin.post(TARIFF, json=tariff_body(**over))).status_code == 422


async def test_destination_normalized_and_member_state_accepted(admin: AsyncClient) -> None:
    assert (await admin.post(TARIFF, json=tariff_body(destination="de"))).json()[
        "destination"
    ] == "DE"


async def test_review_unknown_line_404(admin: AsyncClient) -> None:
    assert (
        await admin.post(f"{TARIFF}/00000000-0000-0000-0000-000000000000/review")
    ).status_code == 404


async def test_patch_rejects_invalid_state_and_leaves_line_unchanged(admin: AsyncClient) -> None:
    line_id = (await admin.post(TARIFF, json=tariff_body())).json()["id"]
    await admin.post(f"{TARIFF}/{line_id}/review")
    assert (await admin.patch(f"{TARIFF}/{line_id}", json={"valid_until": FROM})).status_code == 422
    kept = (await admin.get(TARIFF)).json()[0]
    assert (kept["valid_until"], kept["reviewed_by"] is not None) == (None, True)


# ── Quy tắc xuất xứ ─────────────────────────────────────────────────────────
async def test_created_rule_is_unreviewed_and_not_used(
    admin: AsyncClient, db_session: AsyncSession
) -> None:
    r = await admin.post(RULES, json=rule_body())
    assert r.status_code == 201, r.text
    assert (r.json()["reviewed_by"], r.json()["threshold_pct"]) == (None, "70.00")
    assert await find_rules(db_session, "090121", TODAY) == []


async def test_review_rule_makes_it_usable_and_edit_removes_review(
    admin: AsyncClient, db_session: AsyncSession
) -> None:
    rule_id = (await admin.post(RULES, json=rule_body())).json()["id"]
    assert (await admin.post(f"{RULES}/{rule_id}/review")).status_code == 200
    assert len(await find_rules(db_session, "090121", TODAY)) == 1
    r = await admin.patch(f"{RULES}/{rule_id}", json={"threshold_pct": "60"})
    assert (r.json()["threshold_pct"], r.json()["reviewed_by"]) == ("60.00", None)
    assert await find_rules(db_session, "090121", TODAY) == []
    actions = await audit_actions(db_session)
    assert {"roo_rule.create", "roo_rule.review", "roo_rule.update"} <= set(actions)


async def test_rule_delete_only_when_unreviewed(admin: AsyncClient) -> None:
    draft = (await admin.post(RULES, json=rule_body())).json()["id"]
    assert (await admin.delete(f"{RULES}/{draft}")).status_code == 204
    reviewed = (await admin.post(RULES, json=rule_body())).json()["id"]
    await admin.post(f"{RULES}/{reviewed}/review")
    assert (await admin.delete(f"{RULES}/{reviewed}")).status_code == 409


@pytest.mark.parametrize(
    "over",
    [
        {"rule_type": "MaxNOM", "threshold_pct": None},
        {"rule_type": "CTH_OR_MaxNOM", "threshold_pct": None},
        {"rule_type": "WO", "threshold_pct": "70"},
        {"rule_type": "CTH", "threshold_pct": "70"},
        {"threshold_pct": "0"},
        {"threshold_pct": "100.01"},
        {"threshold_pct": 70},
        {"rule_type": "XYZ"},
        {"hs_code": "999999"},
        {"valid_until": FROM},
    ],
)
async def test_rule_validation(admin: AsyncClient, over: dict[str, Any]) -> None:
    assert (await admin.post(RULES, json=rule_body(**over))).status_code == 422


@pytest.mark.parametrize(
    ("rule_type", "threshold"), [("WO", None), ("CTH", None), ("CTH_OR_MaxNOM", "70")]
)
async def test_valid_rule_types_accepted(
    admin: AsyncClient, rule_type: str, threshold: str | None
) -> None:
    r = await admin.post(RULES, json=rule_body(rule_type=rule_type, threshold_pct=threshold))
    assert r.status_code == 201, r.text


async def test_patch_rule_type_requires_consistent_threshold(admin: AsyncClient) -> None:
    rule_id = (await admin.post(RULES, json=rule_body())).json()["id"]
    assert (await admin.patch(f"{RULES}/{rule_id}", json={"rule_type": "WO"})).status_code == 422
    ok = await admin.patch(f"{RULES}/{rule_id}", json={"rule_type": "WO", "threshold_pct": None})
    assert ok.status_code == 200


async def test_update_audit_holds_before_and_after(
    admin: AsyncClient, db_session: AsyncSession
) -> None:
    line_id = (await admin.post(TARIFF, json=tariff_body())).json()["id"]
    await admin.post(f"{TARIFF}/{line_id}/review")
    await admin.patch(f"{TARIFF}/{line_id}", json={"mfn_rate": "9"})
    row = (
        (
            await db_session.execute(
                select(AuditLog).where(AuditLog.action_type == "tariff_line.update")
            )
        )
        .scalars()
        .one()
    )
    assert row.before_state is not None and row.after_state is not None
    assert (row.before_state["mfn_rate"], row.after_state["mfn_rate"]) == ("7.5000", "9.0000")
    assert row.before_state["reviewed_by"] is not None and row.after_state["reviewed_by"] is None
    assert row.entity_id == line_id
