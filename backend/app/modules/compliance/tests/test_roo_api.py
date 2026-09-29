"""POST /api/public/roo. Quy tắc trong test là SYNTHETIC (không phải quy tắc xuất xứ thật)."""

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import company_body, login_as
from app.modules.compliance.models import ComplianceCheck, ProductSpecificRule, RuleType

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/public/roo"
HS = "090121"
TODAY = dt.datetime.now(dt.UTC).date()


def body(**over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {
        "hs_code": HS,
        "ex_works_value": "1000.00",
        "materials_declared": True,
        "materials": [{"origin_country": "CN", "value": "690.00", "hs_code": "390110"}],
    }
    b.update(over)
    return b


async def add_rule(
    session: AsyncSession, reviewer: uuid.UUID | None, hs: str = HS, **over: Any
) -> ProductSpecificRule:
    fields: dict[str, Any] = {
        "hs_code": hs,
        "rule_type": RuleType.MaxNOM,
        "threshold_pct": Decimal("70"),
        "requires_expert": False,
        "valid_from": TODAY - dt.timedelta(days=30),
        "rule_text": "synthetic rule",
        "source": "synthetic",
    }
    if reviewer is not None:
        fields["reviewed_by"] = reviewer
        fields["reviewed_at"] = dt.datetime.now(dt.UTC)
    fields.update(over)
    rule = ProductSpecificRule(**fields)
    session.add(rule)
    await session.flush()
    await session.refresh(rule)  # đọc lại để thấy đúng giá trị numeric như khi tải từ DB
    return rule


async def checks(session: AsyncSession) -> int:
    return int(await session.scalar(select(func.count()).select_from(ComplianceCheck)) or 0)


async def test_pass_writes_one_check_for_guest(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    rule = await add_rule(db_session, reviewer_id)
    r = await api_client.post(URL, json=body())
    assert r.status_code == 200, r.text
    d = r.json()
    assert (d["status"], d["nom_pct"], d["rvc_pct"], d["threshold_pct"]) == (
        "pass",
        "69.00",
        "31.00",
        "70.00",
    )
    assert (d["rule_type"], d["reason"], d["hs_formatted"]) == ("MaxNOM", None, "0901.21")
    assert await checks(db_session) == 1
    row = (await db_session.execute(select(ComplianceCheck))).scalars().one()
    assert (row.check_type.value, row.status, row.originating_status) == ("roo", "pass", "pass")
    assert (row.rule_id, row.company_id, row.origin_country, row.destination_country) == (
        rule.id,
        None,
        "VN",
        "EU",
    )
    assert (row.product_value, row.regional_value_content_pct) == (
        Decimal("1000.00"),
        Decimal("31.00"),
    )
    assert str(row.id) == d["check_id"]


async def test_logged_in_exporter_check_records_company(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id)
    await login_as(api_client, "exporter", "exp@x.vn")
    company_id = (await api_client.post("/api/me/company", json=company_body())).json()["id"]
    assert (await api_client.post(URL, json=body())).status_code == 200
    row = (await db_session.execute(select(ComplianceCheck))).scalars().one()
    assert str(row.company_id) == company_id


async def test_fail_when_over_threshold(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id, rule_type=RuleType.MaxNOM)
    m = [{"origin_country": "CN", "value": "701.00", "hs_code": "390110"}]
    r = await api_client.post(URL, json=body(materials=m))
    assert (r.json()["status"], r.json()["nom_pct"]) == ("fail", "70.10")


async def test_requires_expert_is_inconclusive_with_reason(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id, requires_expert=True)
    r = await api_client.post(URL, json=body(materials=[]))
    assert (r.json()["status"], r.json()["reason"]) == ("inconclusive", "requires_expert")


async def test_undeclared_materials_are_inconclusive(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id)
    r = await api_client.post(URL, json=body(materials_declared=False, materials=[]))
    assert (r.json()["status"], r.json()["reason"]) == ("inconclusive", "materials_not_declared")
    assert r.json()["nom_pct"] is None


async def test_no_imported_materials_declared_is_evaluated(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id)
    assert (await api_client.post(URL, json=body(materials=[]))).json()["status"] == "pass"


async def test_unsupported_when_no_rule_and_logged(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    r = await api_client.post(URL, json=body())
    assert (r.json()["status"], r.json()["reason"]) == ("unsupported", "no_rule")
    assert r.json()["nom_pct"] is None and r.json()["rule_type"] is None
    assert await checks(db_session) == 1


async def test_unreviewed_rule_is_never_used(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await add_rule(db_session, None)
    assert (await api_client.post(URL, json=body())).json()["status"] == "unsupported"


async def test_hs_outside_supported_catalog_is_unsupported(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    r = await api_client.post(URL, json=body(hs_code="940360"))
    assert (r.json()["status"], r.json()["reason"]) == ("unsupported", "no_rule")


async def test_two_rules_for_one_code_are_ambiguous(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id)
    await add_rule(db_session, reviewer_id, threshold_pct=Decimal("50"))
    r = await api_client.post(URL, json=body())
    assert (r.json()["status"], r.json()["reason"]) == ("inconclusive", "ambiguous_rule")


@pytest.mark.parametrize(
    ("valid_from_days", "valid_until_days", "expected"),
    [(-30, None, "pass"), (-30, 1, "pass"), (-30, 0, "unsupported"), (1, None, "unsupported")],
)
async def test_rule_validity_window(
    api_client: AsyncClient,
    db_session: AsyncSession,
    reviewer_id: uuid.UUID,
    valid_from_days: int,
    valid_until_days: int | None,
    expected: str,
) -> None:
    until = None if valid_until_days is None else TODAY + dt.timedelta(days=valid_until_days)
    await add_rule(
        db_session,
        reviewer_id,
        valid_from=TODAY + dt.timedelta(days=valid_from_days),
        valid_until=until,
    )
    assert (await api_client.post(URL, json=body())).json()["status"] == expected


async def test_eu_cumulation_counts_eu_material_as_originating(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id)
    m = [
        {"origin_country": "VN", "value": "100.00"},
        {"origin_country": "CN", "value": "500.00"},
        {"origin_country": "DE", "value": "300.00"},
    ]
    r = await api_client.post(URL, json=body(materials=m))
    assert (r.json()["status"], r.json()["nom_pct"]) == ("pass", "50.00")


async def test_cth_or_maxnom_uses_material_hs(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id, rule_type=RuleType.CTH_OR_MaxNOM)
    high = {"origin_country": "CN", "value": "800.00"}
    fail = await api_client.post(URL, json=body(materials=[{**high, "hs_code": "090121"}]))
    assert fail.json()["status"] == "fail"
    other_heading = await api_client.post(URL, json=body(materials=[{**high, "hs_code": "390110"}]))
    assert other_heading.json()["status"] == "pass"
    unknown = await api_client.post(URL, json=body(materials=[high]))
    assert unknown.json()["status"] == "inconclusive"


@pytest.mark.parametrize("hs", ["0901.21", "0901 21", " 090121 ", "09012100"])
async def test_roo_hs_code_formats(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID, hs: str
) -> None:
    await add_rule(db_session, reviewer_id)
    r = await api_client.post(URL, json=body(hs_code=hs))
    assert r.status_code == 200 and r.json()["status"] == "pass"


BAD_MATERIALS: list[Any] = [
    [{"origin_country": "CN", "value": "0"}],
    [{"origin_country": "CN", "value": "-1"}],
    [{"origin_country": "CN", "value": "1e3"}],
    [{"origin_country": "CN", "value": 5}],
    [{"origin_country": "CN", "value": "1.234"}],
    [{"origin_country": "CN", "value": "10", "hs_code": "12"}],
    [{"origin_country": "C", "value": "10"}],
    [{"origin_country": "CHN", "value": "10"}],
    [{"origin_country": "", "value": "10"}],
    [{"origin_country": "1A", "value": "10"}],
    [{"value": "10"}],
    [{"origin_country": "CN"}],
    ["CN"],
    [{"origin_country": "CN", "value": "10"}] * 51,
]


@pytest.mark.parametrize("materials", BAD_MATERIALS)
async def test_roo_rejects_bad_materials_and_does_not_log(
    api_client: AsyncClient, db_session: AsyncSession, materials: Any
) -> None:
    assert (await api_client.post(URL, json=body(materials=materials))).status_code == 422
    assert await checks(db_session) == 0


@pytest.mark.parametrize("value", ["0", "-5", "abc", "", "100.123", "1000000000000", 100, 100.5])
async def test_roo_rejects_bad_ex_works(
    api_client: AsyncClient, db_session: AsyncSession, value: Any
) -> None:
    assert (await api_client.post(URL, json=body(ex_works_value=value))).status_code == 422
    assert await checks(db_session) == 0


@pytest.mark.parametrize("hs", ["", "abc", "12345", "123456789", "0901-21"])
async def test_roo_rejects_bad_hs(
    api_client: AsyncClient, db_session: AsyncSession, hs: str
) -> None:
    assert (await api_client.post(URL, json=body(hs_code=hs))).status_code == 422
    assert await checks(db_session) == 0


async def test_roo_materials_declared_false_with_materials_is_rejected(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    assert (await api_client.post(URL, json=body(materials_declared=False))).status_code == 422
    assert await checks(db_session) == 0


async def test_ex_works_optional_gives_inconclusive_for_maxnom(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id)
    r = await api_client.post(URL, json=body(ex_works_value=None))
    assert (r.status_code, r.json()["status"]) == (200, "inconclusive")
    assert await checks(db_session) == 1


async def test_lowercase_country_is_normalized(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await add_rule(db_session, reviewer_id)
    m = [{"origin_country": "vn", "value": "999.00"}]
    r = await api_client.post(URL, json=body(materials=m))
    assert (r.json()["status"], r.json()["nom_pct"]) == ("pass", "0.00")


@pytest.mark.parametrize(
    "over",
    [
        {"rule_type": RuleType.MaxNOM, "threshold_pct": None},
        {"rule_type": RuleType.CTH_OR_MaxNOM, "threshold_pct": None},
        {"rule_type": RuleType.WO, "threshold_pct": Decimal("70")},
        {"rule_type": RuleType.CTH, "threshold_pct": Decimal("70")},
        {"threshold_pct": Decimal("0")},
        {"threshold_pct": Decimal("100.01")},
        {"valid_until": TODAY - dt.timedelta(days=365)},
    ],
)
async def test_bad_rule_rows_rejected_by_database(
    db_session: AsyncSession, over: dict[str, Any]
) -> None:
    with pytest.raises((IntegrityError, DBAPIError)):
        await add_rule(db_session, None, **over)


async def test_rule_reviewed_pair_must_be_together(
    db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    with pytest.raises(IntegrityError):
        await add_rule(db_session, None, reviewed_by=reviewer_id)
