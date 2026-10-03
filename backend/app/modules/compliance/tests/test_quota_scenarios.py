"""U13: bảng golden cho quota_scenarios (hàm thuần). Số liệu SYNTHETIC, không phải thuế thật.

Giữ AGENTS.md §6.4 (sửa đổi): chỉ trả số khi có đúng một hạn ngạch đã duyệt và phân nhóm đủ điều
kiện đã duyệt; ST25 / phân nhóm ngoài danh sách / thiếu dữ liệu → needs_review, không số.
"""

from decimal import Decimal

import pytest

from app.modules.compliance.calculators import QuotaData, QuotaDuty, QuotaResult, quota_scenarios
from app.modules.compliance.models import DutyType

AD = DutyType.ad_valorem
SP = DutyType.specific
MX = DutyType.mixed
VALUE = Decimal("50000.00")  # EUR / lô

# Gạo thơm synthetic: trong hạn ngạch 0%, ngoài hạn ngạch 100 EUR/tấn.
RICE = QuotaData(QuotaDuty(AD, rate=Decimal("0")), QuotaDuty(SP, specific=Decimal("100")), "tonne")
# Cá ngừ synthetic: trong hạn ngạch 0%, ngoài hạn ngạch 20%.
TUNA = QuotaData(QuotaDuty(AD, rate=Decimal("0")), QuotaDuty(AD, rate=Decimal("20")))


def run(
    quota: QuotaData | None,
    *,
    found: int = 1,
    chosen: bool = True,
    eligible: bool = True,
    quantity: str | None = None,
) -> QuotaResult:
    return quota_scenarios(
        found,
        quota,
        subtype_chosen=chosen,
        subtype_eligible=eligible,
        product_value=VALUE,
        quantity=None if quantity is None else Decimal(quantity),
    )


def test_fragrant_rice_in_and_out_of_quota_with_quantity() -> None:
    result = run(RICE, quantity="100")
    assert result.status == "quota_scenarios"
    inside, outside = result.scenarios
    assert (inside.kind, inside.duty) == ("in_quota", Decimal("0.00"))
    assert (outside.kind, outside.duty_type, outside.duty) == (
        "out_of_quota",
        SP,
        Decimal("10000.00"),
    )
    assert result.savings == Decimal("10000.00")


def test_ad_valorem_quota_needs_no_quantity() -> None:
    result = run(TUNA)
    assert result.status == "quota_scenarios"
    assert [s.duty for s in result.scenarios] == [Decimal("0.00"), Decimal("10000.00")]


@pytest.mark.parametrize(
    ("kwargs", "reason"),
    [
        ({"quota": None, "found": 0}, "no_quota_data"),
        ({"quota": RICE, "found": 2}, "no_quota_data"),  # hai hạn ngạch khớp = mơ hồ
        ({"quota": RICE, "chosen": False, "quantity": "100"}, "subtype_required"),
        ({"quota": RICE, "eligible": False, "quantity": "100"}, "subtype_not_eligible"),  # ST25
        ({"quota": RICE}, "quantity_required"),  # thuế tuyệt đối mà chưa có khối lượng
        (
            {"quota": QuotaData(QuotaDuty(AD, rate=Decimal("0")), QuotaDuty(MX)), "quantity": "5"},
            "mixed_duty",
        ),
        (
            {
                "quota": QuotaData(
                    QuotaDuty(AD, rate=Decimal("30")), QuotaDuty(AD, rate=Decimal("20"))
                )
            },
            "data_anomaly",
        ),
        (
            {
                "quota": QuotaData(
                    QuotaDuty(AD, rate=Decimal("0")), QuotaDuty(SP, specific=Decimal("9"))
                )
            },
            "no_quota_data",  # thuế tuyệt đối thiếu đơn vị = dữ liệu không đủ
        ),
        ({"quota": QuotaData(QuotaDuty(AD), QuotaDuty(AD, rate=Decimal("20")))}, "no_quota_data"),
    ],
)
def test_needs_review_never_has_numbers(kwargs: dict[str, object], reason: str) -> None:
    result = run(**kwargs)  # type: ignore[arg-type]
    assert (result.status, result.review_reason) == ("needs_review", reason)
    assert result.scenarios == () and result.savings is None


def test_quantity_is_ignored_for_pure_ad_valorem_and_money_is_rounded_half_up() -> None:
    quota = QuotaData(QuotaDuty(AD, rate=Decimal("0")), QuotaDuty(AD, rate=Decimal("12.345")))
    result = quota_scenarios(
        1,
        quota,
        subtype_chosen=True,
        subtype_eligible=True,
        product_value=Decimal("100.00"),
        quantity=Decimal("3"),
    )
    assert result.scenarios[1].duty == Decimal("12.35")  # 12.345 → 12.35
