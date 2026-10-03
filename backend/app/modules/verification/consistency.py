"""Luật kiểm chéo hồ sơ (U22) — hàm thuần, không DB/HTTP.

Mỗi luật so hai nguồn dữ liệu của cùng công ty (ngành ↔ sản phẩm, mã vùng trồng ↔ chương HS, thị
trường đã xuất ↔ bằng chứng xuất khẩu, địa chỉ ĐKKD ↔ địa chỉ trên chứng nhận…). Kết quả là CỜ cho
admin và GỢI Ý cho chủ hồ sơ — không bao giờ tự đổi trạng thái xác minh hay cấp.
"""

import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass, field

# Ngành hợp lệ theo chương HS (2 số đầu). Chương không có trong bảng → không so.
CHAPTER_INDUSTRIES: dict[str, frozenset[str]] = {
    **{f"{c:02d}": frozenset({"agriculture", "food_beverage"}) for c in (1, 2, 4, 5)},
    "03": frozenset({"seafood"}),
    "06": frozenset({"agriculture", "fruits_vegetables"}),
    "07": frozenset({"agriculture", "fruits_vegetables"}),
    "08": frozenset({"agriculture", "fruits_vegetables"}),
    "09": frozenset({"agriculture", "coffee_tea", "spices"}),
    "10": frozenset({"agriculture"}),
    "11": frozenset({"agriculture", "food_beverage"}),
    "12": frozenset({"agriculture"}),
    "13": frozenset({"agriculture"}),
    "14": frozenset({"agriculture", "handicrafts"}),
    "15": frozenset({"agriculture", "food_beverage"}),
    "16": frozenset({"seafood", "food_beverage"}),
    **{f"{c}": frozenset({"food_beverage", "agriculture"}) for c in range(17, 25)},
    **{f"{c}": frozenset({"textiles"}) for c in range(50, 64)},
    "46": frozenset({"handicrafts"}),
    "44": frozenset({"handicrafts"}),
    "69": frozenset({"handicrafts"}),
    "94": frozenset({"handicrafts"}),
}
PLANT_CHAPTERS = frozenset(f"{c:02d}" for c in range(6, 15))
FRESH_PRODUCE_CHAPTERS = frozenset({"07", "08"})
ANIMAL_FOOD_CHAPTERS = frozenset({"02", "03", "04", "05", "16"})
SEAFOOD_CHAPTERS = frozenset({"03"})
FOOD_CHAPTERS = frozenset(f"{c:02d}" for c in range(2, 25))
FOOD_SAFETY_TYPES = frozenset({"haccp", "brcgs", "ifs", "iso_22000", "fssc_22000"})
EXPORT_EVIDENCE_TYPES = frozenset(
    {"export_contract", "bill_of_lading", "customs_declaration", "eur1_issued"}
)
ADDRESS_MIN_OVERLAP = 0.3


@dataclass(frozen=True)
class ConsistencyFacts:
    industry: str | None
    product_hs: list[str]
    facility_code_types: set[str]
    export_markets: list[str]
    evidence_types: set[str]  # loại bằng chứng đã nộp và chưa bị từ chối
    registered_address: str | None = None
    extracted_addresses: list[str] = field(default_factory=list)  # từ chứng nhận (U24)


@dataclass(frozen=True)
class Finding:
    code: str
    severity: str  # info | warning
    owner_visible: bool  # gợi ý cho chủ hồ sơ; False = chỉ admin
    message_vi: str
    message_en: str


def _chapters(codes: Iterable[str]) -> set[str]:
    return {c[:2] for c in codes if len(c) >= 2}


def _tokens(text: str) -> set[str]:
    decomposed = unicodedata.normalize("NFD", text.lower().replace("đ", "d"))
    plain = "".join(c if c.isalnum() else " " for c in decomposed if not unicodedata.combining(c))
    return {t for t in plain.split() if len(t) >= 2}


def address_overlap(a: str, b: str) -> float:
    left, right = _tokens(a), _tokens(b)
    if not left or not right:
        return 0.0
    return len(left & right) / min(len(left), len(right))


def evaluate(f: ConsistencyFacts) -> list[Finding]:
    out: list[Finding] = []
    chapters = _chapters(f.product_hs)
    if f.industry and f.industry != "other":
        off = sorted(
            c
            for c in chapters
            if c in CHAPTER_INDUSTRIES and f.industry not in CHAPTER_INDUSTRIES[c]
        )
        if off:
            out.append(
                Finding(
                    "industry_product_mismatch",
                    "warning",
                    True,
                    "Ngành khai báo khác nhóm của một số sản phẩm (chương HS "
                    + ", ".join(off)
                    + "). Kiểm tra lại ngành hoặc mã HS.",
                    "The declared industry differs from some products (HS chapters "
                    + ", ".join(off)
                    + "). Check the industry or HS codes.",
                )
            )
    if "growing_area" in f.facility_code_types and chapters and not chapters & PLANT_CHAPTERS:
        out.append(
            Finding(
                "growing_area_without_plant_products",
                "warning",
                True,
                "Có mã số vùng trồng nhưng chưa có sản phẩm thực vật (chương HS 06–14).",
                "Growing-area codes are listed but there are no plant products (HS 06–14).",
            )
        )
    if chapters & FRESH_PRODUCE_CHAPTERS and "growing_area" not in f.facility_code_types:
        out.append(
            Finding(
                "fresh_produce_without_growing_area",
                "info",
                True,
                "Rau quả tươi xuất sang EU thường cần mã số vùng trồng và cơ sở đóng gói.",
                "Fresh produce for the EU usually needs growing-area and packing codes.",
            )
        )
    if chapters & SEAFOOD_CHAPTERS and "establishment" not in f.facility_code_types:
        out.append(
            Finding(
                "seafood_without_establishment",
                "warning",
                True,
                "Thủy sản vào EU phải từ cơ sở được EU cấp phép: hãy khai mã cơ sở (TRACES).",
                "Seafood for the EU must come from an EU-approved establishment: add its code.",
            )
        )
    if (
        "establishment" in f.facility_code_types
        and chapters
        and not chapters & ANIMAL_FOOD_CHAPTERS
    ):
        out.append(
            Finding(
                "establishment_without_animal_food",
                "info",
                False,
                "Có mã cơ sở EU cấp phép nhưng không có sản phẩm động vật / thủy sản.",
                "An EU establishment code is listed but there are no animal or seafood products.",
            )
        )
    food = bool(chapters & FOOD_CHAPTERS)
    safety = bool(f.evidence_types & FOOD_SAFETY_TYPES)
    if food and not safety:
        out.append(
            Finding(
                "food_without_food_safety_certificate",
                "info",
                True,
                "Buyer thực phẩm ở EU thường hỏi HACCP, BRCGS, IFS hoặc ISO 22000.",
                "EU food buyers usually ask for HACCP, BRCGS, IFS or ISO 22000.",
            )
        )
    if safety and chapters and not food:
        out.append(
            Finding(
                "food_safety_certificate_without_food",
                "info",
                False,
                "Có chứng nhận an toàn thực phẩm nhưng không có sản phẩm thực phẩm.",
                "A food-safety certificate is listed but there are no food products.",
            )
        )
    abroad = [m for m in f.export_markets if m != "VN"]
    if abroad and not f.evidence_types & EXPORT_EVIDENCE_TYPES:
        out.append(
            Finding(
                "export_markets_without_evidence",
                "warning",
                True,
                "Đã khai thị trường xuất khẩu nhưng chưa có bằng chứng (hợp đồng, B/L, tờ khai).",
                "Export markets are declared but no export evidence (contract, B/L) is filed.",
            )
        )
    if f.registered_address:
        different = [
            a
            for a in f.extracted_addresses
            if address_overlap(f.registered_address, a) < ADDRESS_MIN_OVERLAP
        ]
        if different:
            out.append(
                Finding(
                    "certificate_address_mismatch",
                    "warning",
                    False,
                    "Địa chỉ trên chứng nhận khác địa chỉ đăng ký kinh doanh: "
                    + "; ".join(different),
                    "Certificate address differs from the registered address: "
                    + "; ".join(different),
                )
            )
    return out
