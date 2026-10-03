"""C2-A (DE_XUAT_MAY_TINH_THUE.md, tầng 1): trị giá tính thuế theo Incoterm và cơ sở của nước đến.

Hàm thuần có golden test dạng bảng; API kiểm trên seed 20 mã (chưa duyệt); số tiền là Decimal."""

import datetime as dt
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.service import create_admin
from app.modules.compliance.calculators import customs_value
from app.modules.compliance.models import ComplianceCheck, CustomsValuationRule
from app.modules.compliance.seed import load_seed
from app.modules.compliance.tests.test_seed_loader import SEED_DIR, VERSION

D = Decimal
INVOICE = D("100000")

# (tên ca, Incoterm, cước, bảo hiểm, chi phí sau cửa khẩu, cơ sở, trị giá kỳ vọng, cảnh báo)
CIF_BASIS = [
    ("cif_khong_dieu_chinh", "CIF", None, None, None, "CIF", D("100000"), ()),
    ("cip_khong_dieu_chinh", "CIP", D("3000"), D("500"), None, "CIF", D("100000"), ()),
    ("fob_cong_cuoc_va_bao_hiem", "FOB", D("3000"), D("500"), None, "CIF", D("103500"), ()),
    ("exw_cong_cuoc_va_bao_hiem", "EXW", D("3000"), D("500"), None, "CIF", D("103500"), ()),
    ("fca_cong_cuoc_va_bao_hiem", "FCA", D("1200.50"), D("99.50"), None, "CIF", D("101300.00"), ()),
    ("fas_cuoc_bang_0_da_khai", "FAS", D("0"), D("0"), None, "CIF", D("100000"), ()),
    ("cfr_chi_cong_bao_hiem", "CFR", D("3000"), D("500"), None, "CIF", D("100500"), ()),
    ("cpt_chi_cong_bao_hiem", "CPT", None, D("500"), None, "CIF", D("100500"), ()),
    ("dap_tru_chi_phi_sau_cua_khau", "DAP", None, None, D("4000"), "CIF", D("96000"), ()),
    ("dpu_tru_chi_phi_sau_cua_khau", "DPU", None, None, D("1500.25"), "CIF", D("98499.75"), ()),
    ("fob_thieu_cuoc", "FOB", None, D("500"), None, "CIF", D("100500"), ("MISSING_FREIGHT",)),
    (
        "fob_thieu_ca_hai",
        "FOB",
        None,
        None,
        None,
        "CIF",
        D("100000"),
        ("MISSING_FREIGHT", "MISSING_INSURANCE"),
    ),
    (
        "cfr_thieu_bao_hiem",
        "CFR",
        D("3000"),
        None,
        None,
        "CIF",
        D("100000"),
        ("MISSING_INSURANCE",),
    ),
    (
        "dap_thieu_chi_phi_sau_cua_khau",
        "DAP",
        None,
        None,
        None,
        "CIF",
        D("100000"),
        ("MISSING_POST_BORDER",),
    ),
    (
        "chua_khai_incoterm",
        None,
        D("3000"),
        D("500"),
        None,
        "CIF",
        D("100000"),
        ("INCOTERM_NOT_GIVEN",),
    ),
    (
        "nuoc_chua_co_quy_tac",
        "FOB",
        D("3000"),
        D("500"),
        None,
        None,
        D("100000"),
        ("NO_VALUATION_RULE",),
    ),
    (
        "chua_khai_incoterm_va_chua_co_quy_tac",
        None,
        None,
        None,
        None,
        None,
        D("100000"),
        ("NO_VALUATION_RULE", "INCOTERM_NOT_GIVEN"),
    ),
]

FOB_BASIS = [
    ("co_so_fob_giu_nguyen_fob", "FOB", None, None, None, "FOB", D("100000"), ()),
    ("co_so_fob_tru_cuoc_cfr", "CFR", D("3000"), None, None, "FOB", D("97000"), ()),
    ("co_so_fob_tru_cuoc_va_bao_hiem_cif", "CIF", D("3000"), D("500"), None, "FOB", D("96500"), ()),
    (
        "co_so_fob_cif_thieu_bao_hiem",
        "CIF",
        D("3000"),
        None,
        None,
        "FOB",
        D("97000"),
        ("MISSING_INSURANCE",),
    ),
]


@pytest.mark.parametrize(
    ("incoterm", "freight", "insurance", "post_border", "basis", "expected", "warnings"),
    [c[1:] for c in CIF_BASIS + FOB_BASIS],
    ids=[c[0] for c in CIF_BASIS + FOB_BASIS],
)
def test_customs_value_golden(
    incoterm: str | None,
    freight: Decimal | None,
    insurance: Decimal | None,
    post_border: Decimal | None,
    basis: Any,
    expected: Decimal,
    warnings: tuple[str, ...],
) -> None:
    out = customs_value(
        INVOICE,
        incoterm,
        freight=freight,
        insurance=insurance,
        post_border=post_border,
        basis=basis,
    )
    assert out.status == "ok"
    assert out.customs_value == expected
    assert set(out.warnings) == set(warnings)
    assert out.steps[0].code == "invoice" and out.steps[0].amount == INVOICE
    # phân rã cộng lại đúng bằng trị giá tính thuế
    assert sum((s.amount for s in out.steps), D(0)) == expected


def test_ddp_is_needs_review_without_any_number() -> None:
    out = customs_value(
        INVOICE, "DDP", freight=None, insurance=None, post_border=D("1000"), basis="CIF"
    )
    assert out.status == "needs_review" and out.customs_value is None
    assert out.reason == "DDP_NOT_SUPPORTED"


@pytest.mark.parametrize("incoterm", ["EXW", "DAP", "DPU"])
def test_unsupported_combinations_on_fob_basis_need_review(incoterm: str) -> None:
    out = customs_value(
        INVOICE, incoterm, freight=D("1"), insurance=D("1"), post_border=D("1"), basis="FOB"
    )
    assert out.status == "needs_review" and out.customs_value is None
    assert out.reason == "INCOTERM_NOT_SUPPORTED_FOR_BASIS"


def test_deductions_that_exhaust_the_price_need_review() -> None:
    out = customs_value(
        D("1000"), "DAP", freight=None, insurance=None, post_border=D("1000"), basis="CIF"
    )
    assert out.status == "needs_review" and out.reason == "INVALID_VALUE"


def test_missing_cost_is_not_invented() -> None:
    """Thiếu cước thì tính với 0 và cảnh báo, không tự điền một con số."""
    out = customs_value(INVOICE, "FOB", freight=None, insurance=None, post_border=None, basis="CIF")
    assert [s.code for s in out.steps] == ["invoice"]


# --- API --------------------------------------------------------------------------------------------

URL = "/api/public/tariff"
B3 = "03046200"  # nhóm B3, thuế cơ sở 5,5%, MFN 5,5%


@pytest.fixture
async def seeded(db_session: AsyncSession) -> AsyncSession:
    await load_seed(db_session, SEED_DIR, VERSION)
    return db_session


async def tariff(client: AsyncClient, **over: Any) -> dict[str, Any]:
    body = {"hs_code": B3, "destination": "DE", "product_value": "100000", **over}
    res = await client.post(URL, json=body)
    assert res.status_code == 200, res.text
    return res.json()  # type: ignore[no-any-return]


async def test_fob_shipment_is_taxed_on_cif_value(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    out = await tariff(
        api_client,
        incoterm="FOB",
        freight="3000",
        insurance="500",
        currency="USD",
        import_date="2022-12-31",
    )
    assert out["status"] == "ok"
    assert out["product_value"] == "100000"  # giá hóa đơn giữ nguyên
    assert out["customs_value"] == "103500.00"
    assert out["mfn_rate"] == "5.5000" and out["mfn_duty"] == "5692.50"
    # 31/12/2022: bậc 3/4 của nhóm B3 → còn 1/4 thuế cơ sở = 1,375%
    assert out["evfta_rate"] == "1.3750" and out["evfta_duty"] == "1423.13"
    assert out["savings"] == "4269.37"
    assert out["rate_date"] == "2022-12-31"
    assert out["staging"] == {"category": "B3", "stage": 3, "stages": 4, "zero_from": "2023-01-01"}
    valuation = out["valuation"]
    assert valuation["basis"] == "CIF" and valuation["incoterm"] == "FOB"
    assert valuation["currency"] == "USD" and valuation["warnings"] == []
    assert [(s["code"], s["amount"]) for s in valuation["steps"]] == [
        ("invoice", "100000.00"),
        ("freight", "3000.00"),
        ("insurance", "500.00"),
    ]


async def test_same_goods_cif_has_lower_duty_than_fob_with_costs(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    cif = await tariff(api_client, incoterm="CIF", import_date="2022-12-31")
    fob = await tariff(
        api_client, incoterm="FOB", freight="3000", insurance="500", import_date="2022-12-31"
    )
    assert cif["customs_value"] == "100000.00"
    assert D(fob["mfn_duty"]) > D(cif["mfn_duty"])


async def test_without_incoterm_behaviour_is_unchanged_but_warns(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    out = await tariff(api_client, import_date="2026-06-01")
    assert out["customs_value"] == "100000.00" and out["mfn_duty"] == "5500.00"
    assert out["savings"] == "5500.00"
    assert out["valuation"]["warnings"] == ["INCOTERM_NOT_GIVEN"]
    assert out["staging"]["stage"] == 4 and out["staging"]["stages"] == 4  # đã về 0 từ 2023


async def test_missing_costs_warn_but_still_calculate(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    out = await tariff(api_client, incoterm="FOB", import_date="2026-06-01")
    assert out["status"] == "ok" and out["customs_value"] == "100000.00"
    assert set(out["valuation"]["warnings"]) == {"MISSING_FREIGHT", "MISSING_INSURANCE"}


async def test_dap_subtracts_post_border_costs(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    out = await tariff(
        api_client, incoterm="DAP", post_border_costs="4000", import_date="2026-06-01"
    )
    assert out["customs_value"] == "96000.00" and out["mfn_duty"] == "5280.00"
    assert [(s["code"], s["amount"]) for s in out["valuation"]["steps"]][-1] == (
        "post_border",
        "-4000.00",
    )


async def test_ddp_needs_review_and_has_no_numbers(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    out = await tariff(api_client, incoterm="DDP", import_date="2026-06-01")
    assert out["status"] == "needs_review" and out["review_reason"] == "ddp_not_supported"
    for key in ("customs_value", "mfn_rate", "evfta_rate", "mfn_duty", "evfta_duty", "savings"):
        assert out[key] is None, key
    assert out["valuation"]["customs_value"] is None


async def test_unsupported_code_has_no_valuation(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    out = await tariff(api_client, hs_code="990000", incoterm="FOB")
    assert out["status"] == "unsupported" and out["valuation"] is None
    assert out["customs_value"] is None and out["staging"] is None


async def test_check_log_records_the_valuation_inputs(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    out = await tariff(
        api_client, incoterm="FOB", freight="3000", insurance="500", import_date="2026-06-01"
    )
    check = await seeded.scalar(
        select(ComplianceCheck).where(ComplianceCheck.id == out["check_id"])
    )
    assert check is not None and check.scenario is not None
    assert check.product_value == D("100000.00")  # giá hóa đơn
    assert check.scenario["import_date"] == "2026-06-01"
    assert check.scenario["valuation"]["customs_value"] == "103500.00"
    assert check.scenario["valuation"]["incoterm"] == "FOB"


@pytest.mark.parametrize(
    "bad",
    [
        {"import_date": "2020-07-31"},
        {"import_date": "2999-01-01"},
        {"import_date": "01/06/2026"},
        {"freight": "-1"},
        {"freight": "1e3"},
        {"insurance": "1.234"},
        {"post_border_costs": 500},  # số JSON không được nhận
        {"incoterm": "XYZ"},
        {"currency": "usd"},
    ],
)
async def test_invalid_inputs_are_rejected(
    api_client: AsyncClient, seeded: AsyncSession, bad: dict[str, Any]
) -> None:
    res = await api_client.post(
        URL, json={"hs_code": B3, "destination": "DE", "product_value": "100000", **bad}
    )
    assert res.status_code == 422, bad


async def test_zero_cost_is_accepted_and_differs_from_missing(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    zero = await tariff(
        api_client, incoterm="FOB", freight="0", insurance="0", import_date="2026-06-01"
    )
    assert zero["valuation"]["warnings"] == []


async def test_unreviewed_rule_is_flagged_and_reviewed_rule_is_not(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    out = await tariff(
        api_client, incoterm="FOB", freight="1", insurance="1", import_date="2026-06-01"
    )
    assert (
        "customs_valuation" in out["unreviewed_components"] and out["review_state"] == "UNREVIEWED"
    )
    # không khai Incoterm thì quy tắc trị giá không được dùng → không tính là thành phần chưa duyệt
    plain = await tariff(api_client, import_date="2026-06-01")
    assert "customs_valuation" not in plain["unreviewed_components"]

    admin = await create_admin(seeded, "luat-tm@evfta.eu", "correct-horse-battery")
    rule = await seeded.scalar(
        select(CustomsValuationRule).where(CustomsValuationRule.country == "DE")
    )
    assert rule is not None
    rule.reviewed_by, rule.reviewed_at = admin, dt.datetime.now(dt.UTC)
    await seeded.flush()
    after = await tariff(
        api_client, incoterm="FOB", freight="1", insurance="1", import_date="2026-06-01"
    )
    assert "customs_valuation" not in after["unreviewed_components"]


# --- seed và duyệt ----------------------------------------------------------------------------------


async def test_seed_loads_valuation_rules_for_eu_and_uk_unreviewed(seeded: AsyncSession) -> None:
    rows = list(await seeded.scalars(select(CustomsValuationRule)))
    assert len(rows) == 28 and {r.basis for r in rows} == {"CIF"}
    assert {"DE", "FR", "GB"} <= {r.country for r in rows}
    assert all(r.reviewed_by is None for r in rows)
    again = await load_seed(seeded, SEED_DIR, VERSION)
    assert again.tables["customs_valuation_rules"].added == 0
    assert again.tables["customs_valuation_rules"].changed == 0
