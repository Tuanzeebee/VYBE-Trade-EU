"""So khớp nội bộ bằng quy tắc (I8): hàm thuần, không LLM, không đụng DB/HTTP (AGENTS.md §5.3).

Admin trích các trường trên chứng nhận; hàm ở đây so chúng với hồ sơ công ty và kết quả tra sổ
đăng ký rồi trả từng quy tắc match / mismatch / unchecked. Chỉ để gắn cờ — admin quyết định.
"""

import datetime as dt
import re
from collections.abc import Iterable
from dataclasses import dataclass
from difflib import SequenceMatcher

from app.modules.verification.identity import domain_of, fold_name

# Hình thức pháp lý ở ĐẦU (tiếng Việt) hoặc CUỐI (tiếng Anh/EU) tên — chỉ cắt ở hai đầu để không
# cắt nhầm chữ giữa tên (vd "Thành Công"). Cụm dài đứng trước để khớp dài nhất.
_LEGAL_FORMS = sorted(
    (
        tuple(p.split())
        for p in (
            "cong ty co phan",
            "cong ty tnhh mot thanh vien",
            "cong ty tnhh mtv",
            "cong ty tnhh",
            "cong ty",
            "tnhh mot thanh vien",
            "tnhh mtv",
            "tnhh",
            "mtv",
            "co phan",
            "joint stock company",
            "joint stock",
            "company limited",
            "co ltd",
            "limited",
            "ltd",
            "jsc",
            "co",
            "corporation",
            "corp",
            "company",
            "inc",
            "llc",
            "gmbh",
            "bv",
            "sarl",
            "srl",
            "spa",
            "ag",
        )
    ),
    key=len,
    reverse=True,
)

# ponytail: ngưỡng giống nhau là heuristic (difflib); tinh chỉnh theo ca thật ở pilot.
NAME_RATIO = 0.9
ADDRESS_RATIO = 0.8


@dataclass(frozen=True)
class CertificateClaims:
    """Trường admin trích từ chứng nhận."""

    holder_name: str | None
    holder_address: str | None
    scope_categories: frozenset[str] | None  # None = chứng nhận không ghi phạm vi / chưa trích


@dataclass(frozen=True)
class CompanyRecord:
    legal_name: str
    address: str | None
    website: str | None
    contact_email: str | None
    registered_name: str | None  # theo kết quả tra MST / sổ đăng ký (I11)
    registered_address: str | None
    sold_categories: frozenset[str]
    tax_id_shared: bool  # MST dùng chung với doanh nghiệp khác
    certificate_duplicated: bool  # số chứng nhận + tổ chức cấp trùng bằng chứng công ty khác


@dataclass(frozen=True)
class Finding:
    rule: str  # name | address | scope | domain | duplicate_tax_id | duplicate_certificate
    result: str  # match | mismatch | unchecked


def _tokens(value: str) -> list[str]:
    return re.sub(r"[^a-z0-9]+", " ", fold_name(value)).split()


def normalize_company_name(value: str) -> str:
    """Bỏ dấu, dấu câu và hình thức pháp lý ở hai đầu tên."""
    tokens = _tokens(value)
    changed = True
    while changed and tokens:
        changed = False
        for form in _LEGAL_FORMS:
            n = len(form)
            if len(tokens) > n and tuple(tokens[:n]) == form:
                tokens, changed = tokens[n:], True
                break
            if len(tokens) > n and tuple(tokens[-n:]) == form:
                tokens, changed = tokens[:-n], True
                break
    return " ".join(tokens)


def _ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def same_name(a: str, b: str) -> bool:
    return _ratio(normalize_company_name(a), normalize_company_name(b)) >= NAME_RATIO


def same_address(a: str, b: str) -> bool:
    """So địa chỉ sau khi bỏ dấu, dấu câu và khoảng trắng ("P.22" = "P22")."""
    compact_a, compact_b = "".join(_tokens(a)), "".join(_tokens(b))
    return bool(compact_a and compact_b) and _ratio(compact_a, compact_b) >= ADDRESS_RATIO


def _flag(ok: bool) -> str:
    return "match" if ok else "mismatch"


def _name(cert: CertificateClaims, company: CompanyRecord) -> str:
    if not cert.holder_name:
        return "unchecked"
    names = [company.legal_name, *([company.registered_name] if company.registered_name else [])]
    return _flag(all(same_name(cert.holder_name, n) for n in names))


def _address(cert: CertificateClaims, company: CompanyRecord) -> str:
    known = [a for a in (company.address, company.registered_address) if a]
    if not cert.holder_address or not known:
        return "unchecked"
    return _flag(any(same_address(cert.holder_address, a) for a in known))


def _scope(cert: CertificateClaims, company: CompanyRecord) -> str:
    if cert.scope_categories is None or not company.sold_categories:
        return "unchecked"
    return _flag(company.sold_categories <= cert.scope_categories)


def _domain(company: CompanyRecord) -> str:
    email, web = domain_of(company.contact_email), domain_of(company.website)
    if not email or not web:
        return "unchecked"
    return _flag(email == web or email.endswith("." + web) or web.endswith("." + email))


def consistency_findings(cert: CertificateClaims, company: CompanyRecord) -> list[Finding]:
    return [
        Finding("name", _name(cert, company)),
        Finding("address", _address(cert, company)),
        Finding("scope", _scope(cert, company)),
        Finding("domain", _domain(company)),
        Finding("duplicate_tax_id", _flag(not company.tax_id_shared)),
        Finding("duplicate_certificate", _flag(not company.certificate_duplicated)),
    ]


def overall(findings: Iterable[Finding]) -> str:
    """Có quy tắc lệch → mismatch; mọi quy tắc đều khớp → match; còn lại → unchecked."""
    results = {f.result for f in findings}
    if "mismatch" in results:
        return "mismatch"
    return "match" if results == {"match"} else "unchecked"


# ── Email xác nhận gửi tổ chức cấp ────────────────────────────────────────────────────────
@dataclass(frozen=True)
class IssuerContact:
    name: str
    contact_email: str  # từ bảng certification_bodies đã duyệt — KHÔNG từ file chứng nhận


@dataclass(frozen=True)
class EmailDraft:
    to: str
    subject: str
    body: str


def issuer_email_draft(
    issuer: IssuerContact,
    *,
    certificate_number: str | None,
    issuer_on_file: str | None,
    holder: str,
    issued_at: dt.date,
    expires_at: dt.date | None,
) -> EmailDraft:
    """Thư nhờ tổ chức cấp xác nhận chứng nhận (song ngữ). Người nhận luôn là địa chỉ đã duyệt
    của tổ chức cấp; thông tin ghi trên file chỉ được trích dẫn trong nội dung để đối chiếu."""
    number = certificate_number or "—"
    until = expires_at.isoformat() if expires_at else "—"
    details = (
        f"- Số chứng nhận / Certificate No.: {number}\n"
        f"- Đơn vị được cấp / Certificate holder: {holder}\n"
        f"- Ngày cấp / Issued: {issued_at.isoformat()}\n"
        f"- Hết hạn / Expires: {until}\n"
        f"- Tổ chức cấp ghi trên chứng nhận / Issuer as stated: {issuer_on_file or '—'}\n"
    )
    body = (
        f"Kính gửi {issuer.name},\n\n"
        "evfta.eu đang xác minh một chứng nhận do quý tổ chức cấp. Xin vui lòng xác nhận chứng "
        "nhận dưới đây có do quý tổ chức cấp và còn hiệu lực hay không.\n\n"
        f"{details}\n"
        f"Dear {issuer.name},\n\n"
        "evfta.eu is verifying a certificate that appears to have been issued by your "
        "organisation. Could you please confirm whether the certificate below was issued by you "
        "and is currently valid?\n\n"
        f"{details}\n"
        "Trân trọng / Kind regards,\nevfta.eu verification team\n"
    )
    return EmailDraft(
        to=issuer.contact_email,
        subject=f"Xác nhận chứng nhận / Certificate verification — {number}",
        body=body,
    )
