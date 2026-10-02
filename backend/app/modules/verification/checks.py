"""Đánh giá kết quả kiểm tự động (U21) — hàm thuần, không DB/HTTP.

Kết quả là tín hiệu cho admin (pass / warning / fail / unknown), không bao giờ là quyết định.
"""

import datetime as dt
import re
import unicodedata
from urllib.parse import urlsplit

from app.modules.verification.consistency import ADDRESS_MIN_OVERLAP, address_overlap

DOMAIN_MIN_AGE_DAYS = 365
# Hậu tố pháp lý bỏ khi so tên công ty với website / VIES.
LEGAL_WORDS = frozenset(
    "cong ty tnhh co phan mtv hop danh tu nhan doanh nghiep tap doan chi nhanh jsc ltd co "
    "company limited corp corporation inc llc plc group gmbh ag kg bv nv srl sarl sas sa spa "
    "sp zoo oy ab as aps the and of vietnam viet nam".split()
)
AUTO_CHECKS = (
    "email_free_mail",
    "email_mx",
    "domain_age",
    "website_live",
    "website_name_match",
    "website_email_domain",
    "vies_vat",
    "vies_name_match",
    "vies_address_match",
    "gleif_lei",
    "gleif_registration_match",
    "gleif_address_match",
    "geocode",
    "traces_facility",
)
MANUAL_CHECKS = (
    "national_registry",
    "company_registry",
    "certificate_issuer",
    "factory_video",
    "other",
)


def fold(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text.lower().replace("đ", "d"))
    plain = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", plain).split())


def name_tokens(name: str) -> set[str]:
    return {t for t in fold(name).split() if len(t) >= 3 and t not in LEGAL_WORDS}


def name_matches(company_name: str, text: str) -> bool:
    """Ít nhất một nửa từ đặc trưng của tên công ty (tối thiểu một) xuất hiện trong văn bản."""
    tokens = name_tokens(company_name)
    if not tokens:
        return False
    haystack = set(fold(text).split())
    return len(tokens & haystack) * 2 >= len(tokens)


def registry_address(raw: object) -> str | None:
    """Địa chỉ trả về từ sổ đăng ký; VIES trả "---" khi nước đó không công bố."""
    if not isinstance(raw, str):
        return None
    text = " ".join(raw.split())
    return None if not text or set(text) <= {"-"} else text


def registration_numbers_match(declared: str, registered: str) -> bool:
    """Số đăng ký khai báo trùng số đăng ký quốc gia trong GLEIF (bỏ khoảng trắng, dấu; không phân
    biệt hoa thường). Chấp nhận khi một bên là phần đuôi của bên kia: "HRB 12345" với "12345"."""
    left = re.sub(r"[^A-Z0-9]", "", declared.upper())
    right = re.sub(r"[^A-Z0-9]", "", registered.upper())
    if not left or not right:
        return False
    return left == right or left.endswith(right) or right.endswith(left)


def address_matches(declared: str, registered: str) -> bool:
    """Địa chỉ khai báo trùng đủ nhiều từ với địa chỉ trong sổ đăng ký (cùng ngưỡng với đối chiếu
    địa chỉ chứng nhận). Chỉ là tín hiệu cho admin."""
    return address_overlap(declared, registered) >= ADDRESS_MIN_OVERLAP


def domain_age_status(registered_on: dt.date | None, today: dt.date) -> str:
    if registered_on is None:
        return "unknown"
    return "pass" if (today - registered_on).days >= DOMAIN_MIN_AGE_DAYS else "warning"


def host_of(website: str) -> str:
    text = website.strip()
    if "://" not in text:
        text = f"https://{text}"
    host = (urlsplit(text).hostname or "").lower().rstrip(".")
    return host[4:] if host.startswith("www.") else host


def same_organisation_domain(website: str, email_domain: str) -> bool:
    host, domain = host_of(website), email_domain.lower()
    return bool(host and domain) and (
        host == domain or host.endswith(f".{domain}") or domain.endswith(f".{host}")
    )
