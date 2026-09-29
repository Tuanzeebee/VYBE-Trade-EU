"""Hàm thuần roo_verdict. Quy tắc và số liệu ở đây là SYNTHETIC — chỉ kiểm logic ba trạng thái
và phép tính, không phải quy tắc xuất xứ thật (golden test nạp từ CSV luật TM đã ký)."""

from decimal import Decimal

import pytest

from app.modules.compliance.calculators import Material, RooResult, RuleData, roo_verdict
from app.modules.compliance.models import RuleType

D = Decimal
PRODUCT_HS = "850490"


def rule(
    rule_type: RuleType = RuleType.MaxNOM, threshold: str | None = "70", **over: object
) -> RuleData:
    fields: dict[str, object] = {
        "rule_type": rule_type,
        "threshold_pct": None if threshold is None else D(threshold),
        "requires_expert": False,
    }
    fields.update(over)
    return RuleData(**fields)  # type: ignore[arg-type]


def mat(origin: str, value: str, hs: str | None = None) -> Material:
    return Material(origin_country=origin, value=D(value), hs_code=hs)


def verdict(
    r: RuleData | None,
    ex_works: str | None = "1000.00",
    materials: list[Material] | None = None,
    declared: bool = True,
    eu_cumulation: bool = True,
) -> RooResult:
    return roo_verdict(
        r,
        PRODUCT_HS,
        None if ex_works is None else D(ex_works),
        materials or [],
        materials_declared=declared,
        eu_cumulation=eu_cumulation,
    )


# ── MaxNOM ──────────────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    ("materials", "status", "nom"),
    [
        ([mat("VN", "250"), mat("CN", "690")], "pass", "69.00"),
        ([mat("CN", "700")], "pass", "70.00"),  # đúng ngưỡng: "không vượt quá" → pass
        ([mat("CN", "700.01")], "fail", "70.01"),
        ([mat("CN", "701")], "fail", "70.10"),
        ([mat("VN", "400"), mat("CN", "300")], "pass", "30.00"),
        ([mat("CN", "850"), mat("KR", "50"), mat("VN", "50")], "fail", "90.00"),
        ([mat("VN", "1000")], "pass", "0.00"),
        ([], "pass", "0.00"),  # đã khai và không có nguyên liệu nhập
    ],
)
def test_maxnom_status_and_nom(materials: list[Material], status: str, nom: str) -> None:
    r = verdict(rule(), materials=materials)
    assert (r.status, r.nom_pct) == (status, D(nom))


def test_maxnom_rounds_nom_up_so_display_never_understates() -> None:
    """70.004% vượt ngưỡng 70 → fail và hiển thị 70.01, không hiện 70.00 rồi báo fail."""
    r = verdict(rule(), ex_works="100000", materials=[mat("CN", "70004")])
    assert (r.status, r.nom_pct) == ("fail", D("70.01"))


def test_maxnom_rvc_is_complement_of_nom() -> None:
    assert verdict(rule(), materials=[mat("CN", "690")]).rvc_pct == D("31.00")


def test_eu_cumulation_flag_switches_result() -> None:
    materials = [mat("VN", "100"), mat("CN", "500"), mat("DE", "300")]
    on = verdict(rule(), materials=materials, eu_cumulation=True)
    off = verdict(rule(), materials=materials, eu_cumulation=False)
    assert (on.status, on.nom_pct) == ("pass", D("50.00"))
    assert (off.status, off.nom_pct) == ("fail", D("80.00"))


def test_vn_material_is_always_originating() -> None:
    assert verdict(rule(), materials=[mat("VN", "5000")], eu_cumulation=False).nom_pct == D("0.00")


@pytest.mark.parametrize("ex_works", [None, "0", "0.00"])
def test_maxnom_without_valid_ex_works_is_inconclusive(ex_works: str | None) -> None:
    r = verdict(rule(), ex_works=ex_works, materials=[mat("CN", "10")])
    assert r.status == "inconclusive"
    assert r.nom_pct is None


def test_maxnom_without_threshold_is_inconclusive_not_a_guess() -> None:
    assert verdict(rule(threshold=None), materials=[mat("CN", "10")]).status == "inconclusive"


# ── WO ──────────────────────────────────────────────────────────────────────
def test_wo_without_imported_materials_passes() -> None:
    assert verdict(rule(RuleType.WO, None), ex_works="1000.00").status == "pass"


def test_wo_with_non_originating_material_fails() -> None:
    assert verdict(rule(RuleType.WO, None), materials=[mat("CN", "10")]).status == "fail"


def test_wo_with_only_originating_materials_passes() -> None:
    assert (
        verdict(rule(RuleType.WO, None), materials=[mat("VN", "10"), mat("FR", "5")]).status
        == "pass"
    )


def test_wo_does_not_need_ex_works() -> None:
    assert verdict(rule(RuleType.WO, None), ex_works=None).status == "pass"


# ── CTH ─────────────────────────────────────────────────────────────────────
def test_cth_passes_when_every_imported_material_is_in_another_heading() -> None:
    r = verdict(
        rule(RuleType.CTH, None), materials=[mat("CN", "10", "390110"), mat("KR", "5", "740200")]
    )
    assert r.status == "pass"


def test_cth_fails_when_an_imported_material_shares_the_heading() -> None:
    r = verdict(
        rule(RuleType.CTH, None), materials=[mat("CN", "10", "390110"), mat("CN", "5", "850410")]
    )
    assert r.status == "fail"


def test_cth_missing_material_hs_is_inconclusive_never_fail() -> None:
    assert (
        verdict(rule(RuleType.CTH, None), materials=[mat("CN", "10", None)]).status
        == "inconclusive"
    )


def test_cth_ignores_hs_of_originating_materials() -> None:
    r = verdict(
        rule(RuleType.CTH, None), materials=[mat("VN", "10", None), mat("DE", "5", "850410")]
    )
    assert r.status == "pass"


# ── CTH hoặc MaxNOM ─────────────────────────────────────────────────────────
def test_cth_or_maxnom_passes_when_maxnom_branch_passes_even_if_cth_fails() -> None:
    r = verdict(rule(RuleType.CTH_OR_MaxNOM), materials=[mat("CN", "690", "850410")])
    assert r.status == "pass"


def test_cth_or_maxnom_passes_when_cth_branch_passes_even_if_maxnom_fails() -> None:
    r = verdict(rule(RuleType.CTH_OR_MaxNOM), materials=[mat("CN", "800", "390110")])
    assert r.status == "pass"


def test_cth_or_maxnom_fail_only_when_both_branches_fail() -> None:
    r = verdict(rule(RuleType.CTH_OR_MaxNOM), materials=[mat("CN", "800", "850410")])
    assert (r.status, r.nom_pct) == ("fail", D("80.00"))


def test_cth_or_maxnom_maxnom_fails_and_cth_unknown_is_inconclusive_not_fail() -> None:
    """Thiếu mã HS nguyên liệu: nhánh CTH chưa biết → không được kết luận fail."""
    r = verdict(rule(RuleType.CTH_OR_MaxNOM), materials=[mat("CN", "800", None)])
    assert r.status == "inconclusive"


def test_cth_or_maxnom_maxnom_unknown_and_cth_fails_is_inconclusive() -> None:
    r = verdict(rule(RuleType.CTH_OR_MaxNOM), ex_works=None, materials=[mat("CN", "800", "850410")])
    assert r.status == "inconclusive"


# ── Chung ───────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("rule_type", list(RuleType))
def test_requires_expert_always_inconclusive(rule_type: RuleType) -> None:
    """Kể cả khi số liệu rõ ràng pass hoặc fail."""
    r = rule(rule_type, "70" if "MaxNOM" in rule_type else None, requires_expert=True)
    assert verdict(r, materials=[mat("VN", "1000")]).status == "inconclusive"
    assert verdict(r, materials=[mat("CN", "900", "850410")]).status == "inconclusive"


@pytest.mark.parametrize("rule_type", list(RuleType))
def test_undeclared_materials_inconclusive(rule_type: RuleType) -> None:
    """Chưa khai ≠ không có nguyên liệu nhập."""
    r = verdict(rule(rule_type, "70" if "MaxNOM" in rule_type else None), declared=False)
    assert r.status == "inconclusive"
    assert r.nom_pct is None


def test_no_imported_materials_declared_is_evaluated() -> None:
    assert verdict(rule(), materials=[], declared=True).status == "pass"


def test_no_rule_is_unsupported() -> None:
    r = verdict(None, materials=[mat("CN", "10")])
    assert (r.status, r.nom_pct, r.rvc_pct) == ("unsupported", None, None)


def test_three_statuses_are_distinct() -> None:
    statuses = {
        verdict(rule(), materials=[mat("VN", "1")]).status,
        verdict(rule(), materials=[mat("CN", "999")]).status,
        verdict(rule(), declared=False).status,
    }
    assert statuses == {"pass", "fail", "inconclusive"}


def test_inconclusive_and_unsupported_carry_no_percentages() -> None:
    for r in (verdict(rule(), declared=False), verdict(None)):
        assert (r.nom_pct, r.rvc_pct) == (None, None)


@pytest.mark.parametrize(
    ("result", "reason"),
    [
        (verdict(None), "no_rule"),
        (verdict(rule(requires_expert=True)), "requires_expert"),
        (verdict(rule(), declared=False), "materials_not_declared"),
        (verdict(rule(), ex_works=None, materials=[mat("CN", "1")]), "insufficient_data"),
        (verdict(rule(), materials=[mat("VN", "1")]), None),
        (verdict(rule(), materials=[mat("CN", "999")]), None),
    ],
)
def test_reason_explains_inconclusive_and_unsupported(
    result: RooResult, reason: str | None
) -> None:
    assert result.reason == reason
