"""Điểm hoàn thiện hồ sơ (B3) — hàm thuần, không đụng DB/HTTP (AGENTS.md §5.3).

Điểm = tổng trọng số của các dòng ĐANG BẬT mà điều kiện đạt / tổng trọng số các dòng đang bật × 100.
Dòng tắt (chưa có tính năng, ví dụ logo, bằng chứng) không nằm trong mẫu số, nên hồ sơ điền đủ mọi
thứ hiện có luôn ra 100%. Trọng số là dữ liệu (bảng completeness_weights), không viết cứng ở đây.

Điểm hoàn thiện KHÔNG phải tín hiệu xác minh: không đặt cạnh huy hiệu verified, không dùng để
quyết định trạng thái xác minh (chỉ verification.service.decide() làm việc đó).
"""

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

COMPANY_DESCRIPTION_MIN = 150
PRODUCT_DESCRIPTION_MIN = 30
ADDRESS_MIN = 10
BUSINESS_MODELS = ("manufacturer", "trader", "both")

_TAX_SEPARATORS = re.compile(r"[\s-]")
_ID_SEPARATORS = re.compile(r"[\s.\-]")
_VAT_EORI = re.compile(r"^([A-Z]{2})([A-Z0-9]{2,15})$")


@dataclass(frozen=True)
class WeightRow:
    field_key: str
    group_key: str
    weight: Decimal
    is_enabled: bool


@dataclass(frozen=True)
class MissingItem:
    field_key: str
    group_key: str
    weight: Decimal


@dataclass(frozen=True)
class CompletenessResult:
    score: Decimal  # 0.00 – 100.00
    missing: tuple[MissingItem, ...]  # xếp theo trọng số giảm dần


def compute_score(facts: Mapping[str, bool], rows: Sequence[WeightRow]) -> CompletenessResult:
    enabled = [r for r in rows if r.is_enabled]
    total = sum((r.weight for r in enabled), Decimal(0))
    earned = sum((r.weight for r in enabled if facts.get(r.field_key, False)), Decimal(0))
    score = (earned * 100 / total) if total > 0 else Decimal(0)
    missing = sorted(
        (
            MissingItem(r.field_key, r.group_key, r.weight)
            for r in enabled
            if not facts.get(r.field_key, False)
        ),
        key=lambda m: (-m.weight, m.field_key),
    )
    return CompletenessResult(
        score.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), tuple(missing)
    )


def is_valid_vn_tax_id(value: str | None) -> bool:
    """Mã số thuế / mã số doanh nghiệp Việt Nam: 10 chữ số, hoặc 13 chữ số (đơn vị phụ thuộc)."""
    digits = _TAX_SEPARATORS.sub("", value or "")
    return digits.isdigit() and len(digits) in (10, 13)


def _normalize_id(value: str | None) -> str:
    return _ID_SEPARATORS.sub("", (value or "").strip()).upper()


def is_valid_vat_or_eori(country: str, vat: str | None, eori: str | None) -> bool:
    """Chỉ kiểm định dạng và tiền tố nước (không tra VIES).

    VAT của Hy Lạp dùng tiền tố EL; EORI của Hy Lạp dùng GR.
    """
    vat_prefixes = {country, "EL"} if country == "GR" else {country}
    for value, prefixes in ((vat, vat_prefixes), (eori, {country})):
        match = _VAT_EORI.match(_normalize_id(value))
        if match and match.group(1) in prefixes:
            return True
    return False


@dataclass(frozen=True)
class ProductFacts:
    """Dữ kiện của MỘT sản phẩm đang bật (mã HS là bắt buộc nên mọi sản phẩm đều có)."""

    has_image: bool
    description_length: int
    has_price: bool


@dataclass(frozen=True)
class CompanyFacts:
    type: Literal["exporter", "buyer"]
    country: str
    tax_id: str | None
    business_type: str | None
    founded_year: int | None
    address: str | None
    description_vi: str | None
    description_en: str | None
    website: str | None
    logo_key: str | None
    industry_sector: str | None
    company_size: str | None
    procurement_estimate: str | None
    vat_number: str | None
    eori_number: str | None
    export_markets: Sequence[str]
    languages: Sequence[str]
    sourcing_categories: Sequence[str]
    evidence_count: int = 0  # C6: số bằng chứng đã nộp và còn hạn


def _text_len(value: str | None) -> int:
    return len((value or "").strip())


def build_facts(company: CompanyFacts, products: Sequence[ProductFacts]) -> dict[str, bool]:
    """Đổi dữ liệu hồ sơ thành điều kiện đạt/không đạt (khóa = field_key của bảng trọng số).

    Không có khóa cho trường tự điền (legal_name, country, contact_email, registration_number):
    chúng không được làm tăng điểm.
    """
    if company.type == "buyer":
        return {
            "sourcing_categories": len(company.sourcing_categories) >= 1,
            "vat_or_eori": is_valid_vat_or_eori(
                company.country, company.vat_number, company.eori_number
            ),
            "company_size": bool(company.company_size),
            "procurement_estimate": bool(company.procurement_estimate),
            "business_type": _text_len(company.business_type) > 0,
            "website": _text_len(company.website) > 0,
            "logo": bool(company.logo_key),
        }
    return {
        "tax_id": is_valid_vn_tax_id(company.tax_id),
        "business_model": company.business_type in BUSINESS_MODELS,
        "founded_year": company.founded_year is not None,
        "address": _text_len(company.address) >= ADDRESS_MIN,
        "description_en": _text_len(company.description_en) >= COMPANY_DESCRIPTION_MIN,
        "description_vi": _text_len(company.description_vi) >= COMPANY_DESCRIPTION_MIN,
        "website": _text_len(company.website) > 0,
        "logo": bool(company.logo_key),
        "industry_sector": bool(company.industry_sector),
        "export_markets": len(company.export_markets) >= 1,
        "foreign_language": any(lang != "vi" for lang in company.languages),
        "product_hs": len(products) >= 1,
        "product_image": any(p.has_image for p in products),
        "product_description": any(
            p.description_length >= PRODUCT_DESCRIPTION_MIN for p in products
        ),
        "product_price": any(p.has_price for p in products),
        "evidence": company.evidence_count >= 1,
    }
