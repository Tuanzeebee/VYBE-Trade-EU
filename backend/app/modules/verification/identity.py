"""Hàm thuần chống mạo danh (I11): không đụng DB/HTTP (AGENTS.md §5.3).

Tín hiệu chỉ để xếp ưu tiên hàng đợi cho admin — không hàm nào ở đây quyết định xác minh
(AGENTS.md §6.9). Số điện thoại/IP nước ngoài không bao giờ là tín hiệu (framework §8.2a).
"""

import datetime as dt
import hashlib
import re
import unicodedata
import uuid
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from urllib.parse import urlsplit

# Domain email miễn phí: không chứng minh gì về công ty, không dùng để gom cụm.
FREE_EMAIL_DOMAINS = frozenset(
    {
        "gmail.com",
        "googlemail.com",
        "yahoo.com",
        "yahoo.com.vn",
        "outlook.com",
        "hotmail.com",
        "live.com",
        "msn.com",
        "icloud.com",
        "me.com",
        "aol.com",
        "proton.me",
        "protonmail.com",
        "yandex.com",
        "mail.ru",
        "gmx.de",
        "gmx.net",
        "web.de",
        "zoho.com",
        "qq.com",
        "163.com",
    }
)

SEVERITY_RANK = {"high": 3, "medium": 2, "low": 1}

# Loại định danh dùng chung → mã tín hiệu và mức độ.
_SHARED = {
    "tax_id": ("shared_tax_id", "high"),
    "file_sha256": ("shared_file", "high"),
    "phone": ("shared_phone", "medium"),
    "domain": ("shared_domain", "medium"),
    "representative": ("shared_representative", "medium"),
}


@dataclass(frozen=True)
class Identifier:
    type: str  # tax_id | domain | phone | file_sha256 | representative
    value: str


@dataclass(frozen=True)
class CompanyIdentity:
    company_id: uuid.UUID
    tax_id: str | None
    website: str | None
    contact_email: str | None
    login_email: str | None
    phone: str | None
    founded_year: int | None
    file_hashes: tuple[str, ...]
    representative_hash: str | None


@dataclass(frozen=True)
class RegistryFacts:
    """Dữ kiện admin đọc từ sổ đăng ký chính thức (check registry_lookup)."""

    founded_year: int | None
    tax_status: str  # active | inactive | unknown
    name_changed_recently: bool
    representative_changed_recently: bool
    legal_representative_hash: str | None


@dataclass(frozen=True)
class Signal:
    code: str
    severity: str  # high | medium | low


@dataclass(frozen=True)
class Cluster:
    identifier: Identifier
    company_ids: frozenset[uuid.UUID]


@dataclass(frozen=True)
class CheckFact:
    check_type: str
    result: str
    checked_at: dt.datetime


# ── Chuẩn hoá ─────────────────────────────────────────────────────────────────────────────
def normalize_tax_id(value: str | None) -> str | None:
    digits = re.sub(r"\D", "", value or "")
    return digits or None


def normalize_phone(value: str | None) -> str | None:
    """Chỉ giữ chữ số, về dạng có mã quốc gia để 0912… và +84 912… trùng nhau."""
    digits = re.sub(r"\D", "", value or "")
    if digits.startswith("00"):
        digits = digits[2:]
    elif digits.startswith("0"):
        # ponytail: số bắt đầu bằng 0 coi là số VN; số nội địa nước khác cần tiền tố +, thêm
        # quy tắc theo quốc gia của công ty khi có seller ngoài VN (B6).
        digits = "84" + digits[1:]
    return digits if len(digits) >= 8 else None


def domain_of(value: str | None) -> str | None:
    """Domain từ URL website hoặc địa chỉ email; bỏ www., hạ chữ thường."""
    text = (value or "").strip().lower()
    if not text:
        return None
    if "@" in text:
        host = text.rsplit("@", 1)[1]
    else:
        host = urlsplit(text if "://" in text else f"//{text}").hostname or ""
    host = host.removeprefix("www.").rstrip(".")
    return host if "." in host else None


def fold_name(value: str) -> str:
    """Bỏ dấu, hạ chữ thường, gộp khoảng trắng — để so tên người/công ty."""
    text = unicodedata.normalize("NFKD", value.replace("đ", "d").replace("Đ", "D"))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(text.lower().split())


def hash_name(value: str) -> str:
    """Tên người đại diện chỉ lưu dạng băm (bảng kiểm append-only, không ẩn danh hoá được)."""
    return hashlib.sha256(fold_name(value).encode()).hexdigest()


def normalize(identifier_type: str, value: str | None) -> str | None:
    """Chuẩn hoá theo loại định danh của danh sách chặn."""
    if identifier_type == "tax_id":
        return normalize_tax_id(value)
    if identifier_type == "domain":
        return domain_of(value)
    if identifier_type == "phone":
        return normalize_phone(value)
    if identifier_type == "file_sha256":
        return (value or "").strip().lower() or None
    raise ValueError(f"unknown identifier type: {identifier_type}")


# ── Gom cụm ───────────────────────────────────────────────────────────────────────────────
def _company_domain(value: str | None) -> str | None:
    domain = domain_of(value)
    return None if domain in FREE_EMAIL_DOMAINS else domain


def identifiers(company: CompanyIdentity) -> set[Identifier]:
    found: set[Identifier] = set()
    if tax_id := normalize_tax_id(company.tax_id):
        found.add(Identifier("tax_id", tax_id))
    for source in (company.website, company.contact_email, company.login_email):
        if domain := _company_domain(source):
            found.add(Identifier("domain", domain))
    if phone := normalize_phone(company.phone):
        found.add(Identifier("phone", phone))
    found.update(Identifier("file_sha256", h) for h in company.file_hashes)
    if company.representative_hash:
        found.add(Identifier("representative", company.representative_hash))
    return found


def clusters(companies: Iterable[CompanyIdentity]) -> list[Cluster]:
    """Định danh xuất hiện ở ≥ 2 công ty khác nhau. Sắp theo loại rồi giá trị (ổn định)."""
    owners: defaultdict[Identifier, set[uuid.UUID]] = defaultdict(set)
    for company in companies:
        for identifier in identifiers(company):
            owners[identifier].add(company.company_id)
    return [
        Cluster(identifier, frozenset(ids))
        for identifier, ids in sorted(owners.items(), key=lambda kv: (kv[0].type, kv[0].value))
        if len(ids) >= 2
    ]


# ── Tín hiệu ──────────────────────────────────────────────────────────────────────────────
def _related(a: str, b: str) -> bool:
    return a == b or a.endswith("." + b) or b.endswith("." + a)


def signals(
    *,
    company: CompanyIdentity,
    registry: RegistryFacts | None,
    shared: Iterable[Identifier],
    blocked: bool,
) -> list[Signal]:
    """Tín hiệu rủi ro danh tính, mức cao trước. Chỉ xếp ưu tiên — admin quyết định."""
    found: dict[str, str] = {}
    if blocked:
        found["blocklisted"] = "high"
    for identifier in shared:
        code, severity = _SHARED[identifier.type]
        found[code] = severity
    email_domain = domain_of(company.contact_email)
    web_domain = domain_of(company.website)
    if email_domain in FREE_EMAIL_DOMAINS:
        found["free_email"] = "low"
    elif email_domain and web_domain and not _related(email_domain, web_domain):
        found["email_domain_mismatch"] = "low"
    if registry is not None:
        if registry.tax_status == "inactive":
            found["tax_inactive"] = "high"
        if (
            registry.founded_year is not None
            and company.founded_year is not None
            and company.founded_year < registry.founded_year
        ):
            found["founded_mismatch"] = "medium"  # tự khai lâu năm hơn sổ đăng ký
        if registry.name_changed_recently:
            found["name_changed_recently"] = "medium"
        if registry.representative_changed_recently:
            found["representative_changed_recently"] = "medium"
    order = list(found)
    return sorted(
        (Signal(code, severity) for code, severity in found.items()),
        key=lambda s: (-SEVERITY_RANK[s.severity], order.index(s.code)),
    )


def max_severity(items: Iterable[Signal]) -> int:
    return max((SEVERITY_RANK[s.severity] for s in items), default=0)


# ── Quyền sở hữu ──────────────────────────────────────────────────────────────────────────
def ownership_proven(checks: Iterable[CheckFact]) -> bool:
    """Đã chứng minh quyền sở hữu = lần gọi lại số chính thức MỚI NHẤT khớp (lần sau đè trước)."""
    callbacks = [c for c in checks if c.check_type == "phone_callback"]
    return bool(callbacks) and max(callbacks, key=lambda c: c.checked_at).result == "match"
