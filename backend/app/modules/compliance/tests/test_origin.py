"""SPEC_compliance_data_20_codes §5.2, §8: máy tính xuất xứ Chương 3/7/8 (bảng ca chuẩn) và API.

Quy tắc lấy từ chính seed (không viết cứng ngưỡng trong test). Thiếu dữ liệu → inconclusive, không
phải fail; requires_expert → luôn inconclusive (AGENTS.md §6.5)."""

import json
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compliance.calculators import Material, RuleData, roo_verdict
from app.modules.compliance.models import ComplianceCheck, RuleType
from app.modules.compliance.origin import (
    OriginAnswers,
    OriginRule,
    answer_schema,
    evaluate_origin,
)
from app.modules.compliance.seed import load_seed
from app.modules.compliance.tests.test_seed_loader import SEED_DIR, VERSION

RULES = {
    r["cn_code"]: r
    for r in json.loads((SEED_DIR / "product_specific_rules.json").read_text(encoding="utf-8"))
}


def rule(code: str) -> OriginRule:
    r = RULES[code]
    return OriginRule(
        r["rule_type"], r["params"], r["requires_expert"], r["requires_expert_reason"]
    )


def ans(**kw: Any) -> OriginAnswers:
    kw.setdefault("transit_third_country", False)
    return OriginAnswers(**kw)


def pct(value: str) -> Decimal:
    return Decimal(value)


def codes(result: Any) -> list[str]:
    return [r.code for r in result.reasons]


VESSEL_OK = {
    "sourcing": "CAUGHT_BY_VESSEL",
    "vessel_registered_vn_eu": True,
    "vessel_flag_vn_eu": True,
}

# (tên ca, mã, câu trả lời, trạng thái, mã lý do bắt buộc có)
CASES = [
    ("tom_nuoi_tu_giong_nhap", "03061792", {"sourcing": "FARMED_IN_VN"}, "pass", "WHOLLY_OBTAINED"),
    ("tom_nhap_so_che", "03061792", {"sourcing": "IMPORTED"}, "fail", "NOT_WHOLLY_OBTAINED"),
    (
        "tau_so_huu_60",
        "03034290",
        {**VESSEL_OK, "vessel_ownership_pct": pct("60")},
        "pass",
        "WHOLLY_OBTAINED",
    ),
    (
        "tau_so_huu_40",
        "03034290",
        {**VESSEL_OK, "vessel_ownership_pct": pct("40")},
        "fail",
        "VESSEL_CONDITIONS_NOT_MET",
    ),
    (
        "tau_khong_mang_co",
        "03034290",
        {**VESSEL_OK, "vessel_flag_vn_eu": False, "vessel_ownership_pct": pct("80")},
        "fail",
        "VESSEL_CONDITIONS_NOT_MET",
    ),
    (
        "ca_ngu_nhap_5pct",
        "03048700",
        {"restricted_nonorig_pct_weight": pct("5"), "materials_outside_territorial_sea": False},
        "inconclusive",
        "REQUIRES_EXPERT",
    ),
    (
        "ch7_8pct_8pct",
        "07123200",
        {"restricted_nonorig_pct_weight": pct("8"), "restricted_nonorig_pct_value": pct("8")},
        "pass",
        "WITHIN_TOLERANCE",
    ),
    (
        "ch7_8pct_trong_luong_12pct_gia",
        "07123200",
        {"restricted_nonorig_pct_weight": pct("8"), "restricted_nonorig_pct_value": pct("12")},
        "fail",
        "OVER_TOLERANCE",
    ),
    (
        "ch7_chi_khai_trong_luong",
        "07123200",
        {"restricted_nonorig_pct_weight": pct("8")},
        "inconclusive",
        "INPUTS_MISSING",
    ),
    (
        "nam_kho_nhap_dong_goi_lai",
        "07123200",
        {"only_article6_operations": True},
        "fail",
        "INSUFFICIENT_OPERATION",
    ),
    (
        "qua_them_duong_25pct",
        "08119085",
        {
            "restricted_nonorig_pct_weight": pct("0"),
            "restricted_nonorig_pct_value": pct("0"),
            "sugar_pct_weight": pct("25"),
        },
        "fail",
        "SUGAR_OVER_CAP",
    ),
    (
        "dieu_nhan_tu_dieu_tho_nhap",
        "08013200",
        {
            "restricted_nonorig_pct_weight": pct("100"),
            "restricted_nonorig_pct_value": pct("100"),
            "sugar_pct_weight": pct("0"),
        },
        "fail",
        "OVER_TOLERANCE",
    ),
    (
        "qua_ngot_duong_trong_muc",
        "08119085",
        {
            "restricted_nonorig_pct_weight": pct("0"),
            "restricted_nonorig_pct_value": pct("0"),
            "sugar_pct_weight": pct("20"),
        },
        "pass",
        "WITHIN_TOLERANCE",
    ),
]


@pytest.mark.parametrize(
    ("code", "answers", "status", "reason"),
    [c[1:] for c in CASES],
    ids=[c[0] for c in CASES],
)
def test_golden_origin_cases(code: str, answers: dict[str, Any], status: str, reason: str) -> None:
    result = evaluate_origin(rule(code), ans(**answers))
    assert result.status == status
    assert reason in codes(result)


@pytest.mark.parametrize(
    ("code", "answers"),
    [("03061792", {"sourcing": "FARMED_IN_VN"}), ("07123200", {"only_article6_operations": True})],
)
def test_transit_storage_keeps_rule_result_and_adds_transport_doc(
    code: str, answers: dict[str, Any]
) -> None:
    base = evaluate_origin(rule(code), ans(**answers))
    transit = evaluate_origin(
        rule(code),
        ans(**answers, transit_third_country=True, transit_handling="STORAGE_UNDER_CUSTOMS"),
    )
    assert transit.status == base.status
    assert transit.additional_evidence == ("TRANSPORT_DOC",)
    assert "TRANSIT_STORAGE_ONLY" in codes(transit)
    assert base.additional_evidence == ()


def test_transit_with_processing_fails_even_if_rule_would_pass() -> None:
    result = evaluate_origin(
        rule("03061792"),
        ans(sourcing="FARMED_IN_VN", transit_third_country=True, transit_handling="PROCESSED"),
    )
    assert result.status == "fail" and "TRANSIT_PROCESSED" in codes(result)


def test_transit_without_handling_answer_is_inconclusive() -> None:
    result = evaluate_origin(
        rule("03061792"), ans(sourcing="FARMED_IN_VN", transit_third_country=True)
    )
    assert result.status == "inconclusive" and result.inputs_missing == ("transit_handling",)


@pytest.mark.parametrize("code", sorted(RULES))
def test_no_answers_is_inconclusive_with_inputs_missing_never_fail(code: str) -> None:
    result = evaluate_origin(rule(code), OriginAnswers())
    assert result.status == "inconclusive"
    assert result.inputs_missing == ("transit_third_country",)
    only_transit = evaluate_origin(rule(code), ans())
    assert only_transit.status == "inconclusive"
    assert only_transit.inputs_missing  # còn thiếu câu trả lời theo loại quy tắc


@pytest.mark.parametrize("code", ["03046200", "03043200", "03048700"])
def test_requires_expert_never_pass_or_fail(code: str) -> None:
    assert RULES[code]["requires_expert"] is True
    perfect = ans(
        restricted_nonorig_pct_weight=pct("0"),
        materials_outside_territorial_sea=False,
    )
    result = evaluate_origin(rule(code), perfect)
    assert result.status == "inconclusive" and codes(result) == ["REQUIRES_EXPERT"]
    failing = evaluate_origin(rule(code), ans(only_article6_operations=True))
    assert failing.status == "inconclusive"


def test_vessel_ownership_threshold_comes_from_params() -> None:
    low_bar = OriginRule("WO_PRODUCT_VESSEL", {"vessel_min_ownership_pct": "30"})
    result = evaluate_origin(low_bar, ans(**VESSEL_OK, vessel_ownership_pct=pct("40")))
    assert result.status == "pass"
    result = evaluate_origin(low_bar, ans(**VESSEL_OK, vessel_ownership_pct=pct("29.99")))
    assert result.status == "fail"


def test_confirmed_tolerance_for_chapter_3_materials_is_used() -> None:
    confirmed = OriginRule(
        "WO_MATERIALS",
        {"restricted_chapters": [3], "tolerance_pct": "10", "tolerance_status": "CONFIRMED"},
    )
    inside = evaluate_origin(confirmed, ans(restricted_nonorig_pct_weight=pct("5")))
    over = evaluate_origin(confirmed, ans(restricted_nonorig_pct_weight=pct("11")))
    assert (inside.status, over.status) == ("pass", "fail")


def test_unknown_or_missing_rule_is_inconclusive_not_supported() -> None:
    assert evaluate_origin(None, ans()).status == "inconclusive"
    assert evaluate_origin(OriginRule("CTH", {}), ans()).status == "inconclusive"
    assert answer_schema("CTH") == ()


def test_legacy_roo_calculator_never_evaluates_new_rule_types() -> None:
    result = roo_verdict(
        RuleData(RuleType.WO_PRODUCT, None, False),
        "03061792",
        Decimal(1000),
        [Material("VN", Decimal(1000), None)],
        materials_declared=True,
    )
    assert result.status == "inconclusive" and result.reason == "use_origin_calculator"


# --- API -------------------------------------------------------------------------------------------

ORIGIN = "/api/public/origin"


async def _origin(client: AsyncClient, **body: Any) -> dict[str, Any]:
    res = await client.post(ORIGIN, json=body)
    assert res.status_code == 200, res.text
    return res.json()  # type: ignore[no-any-return]


async def test_api_pass_returns_savings_and_disclaimer(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await _origin(
        api_client,
        hs_code="03061792",
        consignment_value_eur="100000",
        transit_third_country=False,
        sourcing="FARMED_IN_VN",
    )
    assert out["status"] == "pass" and out["preference_applicable"] is True
    assert out["savings"] == "12000.00"
    assert out["review_state"] == "UNREVIEWED" and out["unreviewed_components"][0] == "origin_rule"
    assert out["disclaimer"] is not None
    check = await db_session.scalar(
        select(ComplianceCheck).where(ComplianceCheck.id == out["check_id"])
    )
    assert check is not None and check.originating_status == "pass" and check.rule_id is not None
    assert check.review_state == "UNREVIEWED" and check.data_version == VERSION


async def test_api_fail_has_zero_savings(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await _origin(
        api_client,
        hs_code="08013200",
        consignment_value_eur="100000",
        transit_third_country=False,
        restricted_nonorig_pct_weight="100",
        restricted_nonorig_pct_value="100",
        sugar_pct_weight="0",
    )
    assert out["status"] == "fail" and out["preference_applicable"] is False
    assert out["savings"] == "0.00"


async def test_api_missing_answers_inconclusive(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await _origin(api_client, hs_code="07123200", transit_third_country=False)
    assert out["status"] == "inconclusive" and out["savings"] is None
    assert set(out["inputs_missing"]) == {
        "restricted_nonorig_pct_weight",
        "restricted_nonorig_pct_value",
    }


async def test_api_unsupported_code_has_no_conclusion(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await _origin(api_client, hs_code="100630", transit_third_country=False)
    assert out["status"] == "unsupported" and out["preference_applicable"] is False
    assert out["savings"] is None and out["disclaimer"] is None
    assert [r["code"] for r in out["reasons"]] == ["NOT_SUPPORTED"]


async def test_api_rejects_non_string_percent(api_client: AsyncClient) -> None:
    res = await api_client.post(
        ORIGIN, json={"hs_code": "07123200", "restricted_nonorig_pct_weight": 8}
    )
    assert res.status_code == 422
    res = await api_client.post(
        ORIGIN, json={"hs_code": "07123200", "restricted_nonorig_pct_weight": "101"}
    )
    assert res.status_code == 422


async def test_api_questions_follow_rule_type(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    res = await api_client.get(
        "/api/public/hs-codes/03034290/origin-questions", headers={"Accept-Language": "en"}
    )
    out = res.json()
    assert out["status"] == "ok" and out["rule_type"] == "WO_PRODUCT_VESSEL"
    assert [q["order"] for q in out["questions"]] == [1, 2, 3]
    names = {i["name"]: i for i in out["inputs"]}
    assert names["vessel_ownership_pct"]["required_if"] == "sourcing=CAUGHT_BY_VESSEL"
    assert out["disclaimer"].startswith("Note")
    none = (await api_client.get("/api/public/hs-codes/100630/origin-questions")).json()
    assert none["status"] == "unsupported" and none["inputs"] == [] and none["disclaimer"] is None
