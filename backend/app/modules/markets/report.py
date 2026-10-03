"""Báo cáo go-to-market (U18) — phần thuần: chỉ số → bảng giá trị đã định dạng, lời văn mẫu,
kiểm tra lời văn do model viết.

Quy tắc số liệu: model KHÔNG được viết chữ số; chỉ dùng placeholder {khoá} trong danh sách chỉ số.
Server điền giá trị; lời văn có chữ số hoặc khoá lạ bị loại và thay bằng lời văn mẫu.
"""

import csv
import io
import json
import re
from collections.abc import Mapping
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

# N5: định vị và năng lực đứng đầu. Đây là các phần do model/lời văn mẫu viết; mục "segments"
# (phân khúc) là văn bản người duyệt nhập nên không nằm ở đây mà được ghép ở report_service.
SECTIONS = (
    "positioning",
    "summary",
    "market",
    "recommendations",
    "competition",
    "compliance",
    "branding",
    "risks",
    "next_steps",
)
SEGMENTS_SECTION = "segments"
# Thứ tự hiển thị: phân khúc nằm ngay sau "thị trường nên ưu tiên".
DISPLAY_SECTIONS = (
    *SECTIONS[: SECTIONS.index("recommendations") + 1],
    SEGMENTS_SECTION,
    *SECTIONS[SECTIONS.index("recommendations") + 1 :],
)
# Phần miễn phí; phần còn lại cần gói đầy đủ
SUMMARY_SECTIONS = ("positioning", "summary", "recommendations")
PLACEHOLDER = re.compile(r"\{([a-z0-9_]+)\}")
DIGIT = re.compile(r"[0-9]")
MAX_SECTION_CHARS = 2000
MAIN_COMPETITOR_SHARE = Decimal("0.05")  # đối thủ "đáng chú ý" khi chiếm từ 5% nguồn cung ngoài EU
BENCHMARKS_CSV = Path(__file__).resolve().parents[3] / "data" / "gtm_benchmarks.csv"

SECTION_TITLES = {
    "vi": {
        "summary": "Tóm tắt",
        "market": "Bức tranh thị trường EU",
        "recommendations": "Thị trường nên ưu tiên",
        "competition": "Đối thủ và thị phần",
        "positioning": "Định vị và năng lực",
        "segments": "Phân khúc thị trường",
        "compliance": "Thuế, hạn ngạch và cảnh báo",
        "branding": "OEM hay thương hiệu riêng",
        "risks": "Rủi ro cần lưu ý",
        "next_steps": "Bước tiếp theo",
    },
    "en": {
        "summary": "Summary",
        "market": "EU market overview",
        "recommendations": "Priority markets",
        "competition": "Competitors and market shares",
        "positioning": "Positioning and capacity",
        "segments": "Market segments",
        "compliance": "Tariffs, quotas and alerts",
        "branding": "OEM or own brand",
        "risks": "Risks to watch",
        "next_steps": "Next steps",
    },
}

# Tên nước (vi / en) cho báo cáo; thiếu thì dùng mã.
COUNTRY_NAMES: dict[str, tuple[str, str]] = {
    "AT": ("Áo", "Austria"),
    "BE": ("Bỉ", "Belgium"),
    "BG": ("Bulgaria", "Bulgaria"),
    "HR": ("Croatia", "Croatia"),
    "CY": ("Síp", "Cyprus"),
    "CZ": ("Séc", "Czechia"),
    "DK": ("Đan Mạch", "Denmark"),
    "EE": ("Estonia", "Estonia"),
    "FI": ("Phần Lan", "Finland"),
    "FR": ("Pháp", "France"),
    "DE": ("Đức", "Germany"),
    "GR": ("Hy Lạp", "Greece"),
    "HU": ("Hungary", "Hungary"),
    "IE": ("Ireland", "Ireland"),
    "IT": ("Ý", "Italy"),
    "LV": ("Latvia", "Latvia"),
    "LT": ("Litva", "Lithuania"),
    "LU": ("Luxembourg", "Luxembourg"),
    "MT": ("Malta", "Malta"),
    "NL": ("Hà Lan", "Netherlands"),
    "PL": ("Ba Lan", "Poland"),
    "PT": ("Bồ Đào Nha", "Portugal"),
    "RO": ("Romania", "Romania"),
    "SK": ("Slovakia", "Slovakia"),
    "SI": ("Slovenia", "Slovenia"),
    "ES": ("Tây Ban Nha", "Spain"),
    "SE": ("Thụy Điển", "Sweden"),
    "VN": ("Việt Nam", "Vietnam"),
    "IN": ("Ấn Độ", "India"),
    "CN": ("Trung Quốc", "China"),
    "EC": ("Ecuador", "Ecuador"),
    "AR": ("Argentina", "Argentina"),
    "TH": ("Thái Lan", "Thailand"),
    "ID": ("Indonesia", "Indonesia"),
    "BR": ("Brazil", "Brazil"),
    "CI": ("Bờ Biển Ngà", "Côte d'Ivoire"),
    "KH": ("Campuchia", "Cambodia"),
    "MM": ("Myanmar", "Myanmar"),
    "PK": ("Pakistan", "Pakistan"),
    "BD": ("Bangladesh", "Bangladesh"),
    "UA": ("Ukraine", "Ukraine"),
    "RU": ("Nga", "Russia"),
    "US": ("Hoa Kỳ", "United States"),
    "TR": ("Thổ Nhĩ Kỳ", "Türkiye"),
    "LK": ("Sri Lanka", "Sri Lanka"),
    "KE": ("Kenya", "Kenya"),
    "NG": ("Nigeria", "Nigeria"),
    "PE": ("Peru", "Peru"),
    "CO": ("Colombia", "Colombia"),
    "UG": ("Uganda", "Uganda"),
    "ET": ("Ethiopia", "Ethiopia"),
    "MX": ("Mexico", "Mexico"),
    "CL": ("Chile", "Chile"),
    "PH": ("Philippines", "Philippines"),
    "MY": ("Malaysia", "Malaysia"),
    "VE": ("Venezuela", "Venezuela"),
    "GB": ("Anh", "United Kingdom"),
    "NO": ("Na Uy", "Norway"),
    "CH": ("Thụy Sĩ", "Switzerland"),
    "NZ": ("New Zealand", "New Zealand"),
}

# Mô tả từng khoá chỉ số cho model (model chỉ thấy mô tả, không thấy giá trị).
METRIC_DESCRIPTIONS: dict[str, str] = {
    "product_name": "tên nhóm sản phẩm",
    "year": "năm của số liệu",
    "source": "nguồn số liệu",
    "eu_import_total": "tổng nhập khẩu của các nước EU từ thế giới",
    "vn_rank": "thứ hạng của Việt Nam trong các nguồn cung ngoài EU",
    "vn_extra_eu_share": "thị phần của Việt Nam trong nhập khẩu ngoài EU của EU",
    "top1_country": "thị trường ưu tiên thứ nhất",
    "top1_import": "nhập khẩu của thị trường thứ nhất",
    "top1_vn_share": "thị phần Việt Nam ở thị trường thứ nhất",
    "top1_growth": "tăng trưởng nhập khẩu bình quân năm của thị trường thứ nhất",
    "top2_country": "thị trường ưu tiên thứ hai",
    "top2_import": "nhập khẩu của thị trường thứ hai",
    "top2_vn_share": "thị phần Việt Nam ở thị trường thứ hai",
    "top3_country": "thị trường ưu tiên thứ ba",
    "top3_import": "nhập khẩu của thị trường thứ ba",
    "top3_vn_share": "thị phần Việt Nam ở thị trường thứ ba",
    "pot1_country": "thị trường tiềm năng thứ nhất",
    "pot1_import": "nhập khẩu của thị trường tiềm năng thứ nhất",
    "pot1_vn_share": "thị phần Việt Nam ở thị trường tiềm năng thứ nhất",
    "pot2_country": "thị trường tiềm năng thứ hai",
    "comp1_country": "đối thủ lớn nhất của Việt Nam trong nguồn cung ngoài EU",
    "comp1_share": "thị phần của đối thủ lớn nhất",
    "comp2_country": "đối thủ lớn thứ hai của Việt Nam trong nguồn cung ngoài EU",
    "comp2_share": "thị phần của đối thủ lớn thứ hai",
    "main_competitor": "đối thủ đáng chú ý (chiếm từ 5% nguồn cung ngoài EU)",
    "main_competitor_share": "thị phần của đối thủ đáng chú ý",
    "concentration": "mức độ tập trung nguồn cung (cao / trung bình / thấp)",
    "vn_unit_price": "đơn giá nhập khẩu EU của hàng Việt Nam",
    "extra_eu_unit_price": "đơn giá trung bình hàng ngoài EU",
    "price_position": "vị trí giá hàng Việt Nam so với mặt bằng (cao hơn / tương đương / thấp hơn)",
    "company_capacity": "sản lượng công ty có thể cung cấp",
    "tariff_text": "mô tả thuế nhập khẩu EU của mã hàng",
    "alerts_text": "các cảnh báo ngành đang áp dụng",
    "brand_model": "mô hình kinh doanh công ty khai (OEM / thương hiệu riêng / cả hai)",
    "budget_ratio": "ngân sách marketing dự kiến so với doanh thu dự kiến",
    "benchmark_pct": "mốc ngân sách marketing để xây thương hiệu ở EU",
    "branding_advice": "khuyến nghị OEM hay thương hiệu riêng theo quy tắc",
    "positioning_score": "điểm năng lực tổng hợp của doanh nghiệp trên thang 100",
}


@dataclass(frozen=True)
class CompanyFacts:
    name: str
    capacity_value: Decimal | None = None
    capacity_unit: str | None = None
    capacity_period: str | None = None
    brand_model: str | None = None  # oem | own_brand | both
    positioning_score: str | None = None  # điểm định vị đã định dạng (N5), vd "58,3"


def load_benchmarks(path: Path = BENCHMARKS_CSV) -> dict[str, Decimal]:
    lines = [
        line
        for line in path.read_text(encoding="utf-8-sig").splitlines()
        if line.strip() and not line.startswith("#")
    ]
    return {
        row["key"].strip(): Decimal(row["value"].strip())
        for row in csv.DictReader(io.StringIO("\n".join(lines)))
    }


def country(code: str, lang: str) -> str:
    names = COUNTRY_NAMES.get(code)
    return (names[1] if lang == "en" else names[0]) if names else code


def eur(value: Decimal, lang: str) -> str:
    """Số tiền EUR đọc được: 39,9 triệu EUR / EUR 39.9 million."""
    amount = float(value)
    units = (
        [(1e9, "tỷ EUR"), (1e6, "triệu EUR"), (1e3, "nghìn EUR")]
        if lang == "vi"
        else [(1e9, "billion"), (1e6, "million"), (1e3, "thousand")]
    )
    for size, label in units:
        if amount >= size:
            text = f"{amount / size:.1f}"
            return f"{text.replace('.', ',')} {label}" if lang == "vi" else f"EUR {text} {label}"
    return f"{amount:.0f} EUR"


def pct(ratio: Decimal, lang: str) -> str:
    """Tỷ lệ → phần trăm một chữ số thập phân; rất nhỏ nhưng khác 0 hiện "<0,1%"."""
    text = "<0.1%" if 0 < ratio < Decimal("0.0005") else f"{float(ratio) * 100:.1f}%"
    return text.replace(".", ",") if lang == "vi" else text


def unit_price(value: Decimal, lang: str) -> str:
    text = f"{float(value):.2f}"
    return f"{text.replace('.', ',')} EUR/kg" if lang == "vi" else f"EUR {text}/kg"


def _concentration(hhi: Decimal, lang: str) -> str:
    level = "high" if hhi >= 2500 else "medium" if hhi >= 1500 else "low"
    return {"vi": {"high": "cao", "medium": "trung bình", "low": "thấp"}}.get(lang, {}).get(
        level, level
    )


def branding_advice(budget_ratio: Decimal | None, benchmark: Decimal, lang: str) -> str | None:
    """Quy tắc (không phải model): ngân sách marketing dưới mốc → ưu tiên OEM / nhãn riêng của nhà
    phân phối trước; bằng hoặc trên mốc → có thể thử thương hiệu riêng ở một thị trường."""
    if budget_ratio is None:
        return None
    below = budget_ratio * 100 < benchmark
    if lang == "en":
        return (
            "start with OEM / distributor private label and build a brand later"
            if below
            else "an own brand can be tested in one priority market"
        )
    return (
        "nên bắt đầu bằng OEM / nhãn riêng của nhà phân phối, xây thương hiệu sau"
        if below
        else "có thể thử thương hiệu riêng ở một thị trường ưu tiên"
    )


def build_metrics(
    rec: Mapping[str, Any],
    price: Mapping[str, Any] | None,
    tariff_text: str | None,
    alerts: list[str],
    company: CompanyFacts,
    budget: Mapping[str, Decimal | None],
    lang: str,
) -> dict[str, str]:
    """Bảng giá trị đã định dạng (chuỗi). Chỉ có khoá khi có số liệu tương ứng."""
    m: dict[str, str] = {}
    family = rec.get("family") or {}
    m["product_name"] = family.get("name_en" if lang == "en" else "name_vi") or rec.get("query", "")
    if rec.get("year"):
        m["year"] = str(rec["year"])
    m["source"] = str(rec.get("source") or "Eurostat Comext")
    countries = rec.get("countries") or []
    if countries:
        total = sum((Decimal(c["import_value"]) for c in countries), Decimal(0))
        m["eu_import_total"] = eur(total, lang)
    if rec.get("vn_rank"):
        m["vn_rank"] = str(rec["vn_rank"])
    if rec.get("vn_extra_eu_share"):
        m["vn_extra_eu_share"] = pct(Decimal(rec["vn_extra_eu_share"]), lang)
    for i, market in enumerate(rec.get("top_markets") or [], start=1):
        m[f"top{i}_country"] = country(market["country"], lang)
        m[f"top{i}_import"] = eur(Decimal(market["import_value"]), lang)
        m[f"top{i}_vn_share"] = pct(Decimal(market["vn_share"]), lang)
        if market.get("import_cagr") is not None:
            m[f"top{i}_growth"] = pct(Decimal(market["import_cagr"]), lang)
    for i, market in enumerate(rec.get("potential_markets") or [], start=1):
        m[f"pot{i}_country"] = country(market["country"], lang)
        m[f"pot{i}_import"] = eur(Decimal(market["import_value"]), lang)
        m[f"pot{i}_vn_share"] = pct(Decimal(market["vn_share"]), lang)
    competitors = [c for c in rec.get("competitors") or [] if c["partner"] != "VN"]
    for i, comp in enumerate(competitors[:2], start=1):
        m[f"comp{i}_country"] = country(comp["partner"], lang)
        m[f"comp{i}_share"] = pct(Decimal(comp["share"]), lang)
    if competitors and Decimal(competitors[0]["share"]) >= MAIN_COMPETITOR_SHARE:
        m["main_competitor"] = m["comp1_country"]
        m["main_competitor_share"] = m["comp1_share"]
    if rec.get("hhi"):
        m["concentration"] = _concentration(Decimal(rec["hhi"]), lang)
    if price and price.get("status") == "ok":
        vn = price.get("vietnam")
        avg = price.get("extra_eu_average")
        if vn:
            m["vn_unit_price"] = unit_price(Decimal(vn["unit_price"]), lang)
        if avg:
            m["extra_eu_unit_price"] = unit_price(Decimal(avg["unit_price"]), lang)
        if vn and avg:
            ratio = Decimal(vn["unit_price"]) / Decimal(avg["unit_price"])
            position = (
                "higher"
                if ratio > Decimal("1.05")
                else "lower"
                if ratio < Decimal("0.95")
                else "same"
            )
            m["price_position"] = (
                {"higher": "cao hơn", "lower": "thấp hơn", "same": "tương đương"}[position]
                if lang == "vi"
                else {"higher": "above", "lower": "below", "same": "in line with"}[position]
            )
    if company.capacity_value:
        periods = {"year": "năm", "month": "tháng"} if lang == "vi" else {}
        raw_unit = company.capacity_unit or ""
        unit = {"tonne": "tấn" if lang == "vi" else "tonnes"}.get(raw_unit, raw_unit)
        period = company.capacity_period or "year"
        amount = f"{Decimal(company.capacity_value).normalize():f}"
        m["company_capacity"] = f"{amount} {unit}/{periods.get(period, period)}"
    if tariff_text:
        m["tariff_text"] = tariff_text
    if alerts:
        m["alerts_text"] = "; ".join(alerts)
    if company.brand_model:
        m["brand_model"] = (
            {"oem": "OEM", "own_brand": "thương hiệu riêng", "both": "cả OEM và thương hiệu riêng"}
            if lang == "vi"
            else {"oem": "OEM", "own_brand": "own brand", "both": "both OEM and own brand"}
        ).get(company.brand_model, company.brand_model)
    if company.positioning_score:
        m["positioning_score"] = company.positioning_score
    benchmark: Decimal = load_benchmarks().get("marketing_pct_of_revenue") or Decimal(5)
    marketing, revenue = budget.get("marketing"), budget.get("revenue")
    budget_share = marketing / revenue if marketing and revenue and revenue > 0 else None
    if budget_share is not None:
        m["budget_ratio"] = pct(budget_share, lang)
        m["benchmark_pct"] = pct(benchmark / 100, lang)
        advice = branding_advice(budget_share, benchmark, lang)
        if advice:
            m["branding_advice"] = advice
    return m


# ── Lời văn mẫu (khi không có model hoặc model viết sai quy tắc) ─────────────
TEMPLATES_JSON = Path(__file__).resolve().parents[3] / "data" / "gtm_report_templates.json"


def load_templates(path: Path = TEMPLATES_JSON) -> dict[str, dict[str, list[str]]]:
    """Câu mẫu theo ngôn ngữ và phần (dữ liệu cấu hình, sửa được mà không đổi code)."""
    data: dict[str, dict[str, list[str]]] = json.loads(path.read_text(encoding="utf-8"))
    return data


def fill(text: str, metrics: Mapping[str, str]) -> str:
    return PLACEHOLDER.sub(lambda match: metrics.get(match.group(1), match.group(0)), text)


def template_narrative(metrics: Mapping[str, str], lang: str) -> dict[str, str]:
    """Câu mẫu chỉ dùng khi đủ mọi khoá của câu đó; phần không còn câu nào để trống."""
    templates = load_templates()
    out: dict[str, str] = {}
    for section in SECTIONS:
        sentences = [
            fill(sentence, metrics)
            for sentence in templates.get(lang, templates["vi"])[section]
            if set(PLACEHOLDER.findall(sentence)) <= set(metrics)
        ]
        out[section] = " ".join(sentences)
    return out


def model_prompt(metrics: Mapping[str, str], lang: str) -> tuple[str, str]:
    language = "tiếng Việt" if lang == "vi" else "English"
    system = (
        "Bạn là chuyên gia xuất khẩu nông sản, thực phẩm sang EU. Viết lời văn cho báo cáo "
        f"go-to-market bằng {language}. Trả về DUY NHẤT một đối tượng JSON có đúng các khoá: "
        + ", ".join(SECTIONS)
        + ". Mỗi giá trị 2–4 câu văn xuôi. TUYỆT ĐỐI KHÔNG viết chữ số nào (0-9). Khi cần số liệu, "
        "chỉ được dùng placeholder dạng {khoa} lấy từ danh sách được cung cấp. Không bịa thông tin "
        "ngoài danh sách, không đưa lời khuyên pháp lý chắc chắn."
    )
    # Giá trị không có chữ số (tên nước, "cao hơn"…) được cho model xem để viết mạch lạc; giá trị có
    # chữ số chỉ có mô tả, model buộc dùng placeholder.
    available = {
        key: {"mo_ta": METRIC_DESCRIPTIONS.get(key, key)}
        | ({} if DIGIT.search(value) else {"gia_tri": value})
        for key, value in metrics.items()
    }
    user = json.dumps({"placeholders": available}, ensure_ascii=False)
    return system.replace("{khoa}", "{khoá}"), user


def validate_narrative(raw: str, metrics: Mapping[str, str]) -> dict[str, str] | None:
    """Lời văn của model hợp lệ khi: JSON đúng các phần, không có chữ số, chỉ dùng khoá có thật."""
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return None
    if not isinstance(data, dict) or set(data) != set(SECTIONS):
        return None
    out: dict[str, str] = {}
    for section in SECTIONS:
        text = data[section]
        if not isinstance(text, str) or not text.strip() or len(text) > MAX_SECTION_CHARS:
            return None
        if DIGIT.search(PLACEHOLDER.sub("", text)):  # khoá như {top1_country} được phép có số
            return None
        if not set(PLACEHOLDER.findall(text)) <= set(metrics):
            return None
        out[section] = fill(text.strip(), metrics)
    return out
