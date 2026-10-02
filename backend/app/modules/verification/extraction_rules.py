"""Đọc chứng nhận theo quy tắc (không dùng AI) — hàm thuần, không DB/HTTP (AGENTS.md §5.3).

Dùng khi xem trước file bằng chứng: PDF có chữ → tìm ngày cấp / hết hạn, số chứng nhận, tổ chức cấp
theo NHÃN in trên giấy, và loại giấy tờ chỉ khi đúng một loại trong danh mục ĐÃ DUYỆT khớp từ khoá.
Không đoán: mơ hồ thì để trống. Kết quả chỉ là gợi ý để seller kiểm tra, không quyết định xác minh.
"""

import datetime as dt
import re
import unicodedata
from collections.abc import Mapping, Sequence

from app.modules.verification.extraction import FIELDS, LIMITS

_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3, "apr": 4, "april": 4,
    "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9,
    "sept": 9, "september": 9, "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12,
    "december": 12,
}  # fmt: skip
_MONTH_NAMES = "|".join(sorted(_MONTHS, key=len, reverse=True))

# Từng kiểu ngày; mỗi pattern có group đặt tên để dựng ngày.
_DATE_PATTERNS = (
    re.compile(r"(?P<y>\d{4})-(?P<m>\d{1,2})-(?P<d>\d{1,2})"),
    re.compile(r"(?P<d>\d{1,2})\s*[/.\-]\s*(?P<m>\d{1,2})\s*[/.\-]\s*(?P<y>\d{4})"),
    re.compile(
        rf"(?P<d>\d{{1,2}})(?:st|nd|rd|th)?\s+(?P<mon>{_MONTH_NAMES})\.?,?\s+(?P<y>\d{{4}})",
        re.IGNORECASE,
    ),
    re.compile(
        rf"(?P<mon>{_MONTH_NAMES})\.?\s+(?P<d>\d{{1,2}})(?:st|nd|rd|th)?,?\s+(?P<y>\d{{4}})",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?P<d>\d{1,2})\s+th[áa]ng\s+(?P<m>\d{1,2})\s+n[ăa]m\s+(?P<y>\d{4})",
        re.IGNORECASE,
    ),
)

# Nhãn cạnh ngày. Nhãn nào kết thúc gần ngày nhất thì quyết định ngày đó là cấp hay hết hạn.
_ISSUE_LABELS = (
    "date of issue", "issue date", "issued on", "issued", "valid from", "effective date",
    "effective from", "ngày cấp", "cấp ngày", "có hiệu lực từ", "hiệu lực từ",
)  # fmt: skip
_EXPIRY_LABELS = (
    "date of expiry", "expiry date", "expiration date", "expires on", "expires", "expiry",
    "valid until", "valid to", "valid through", "valid thru", "good until", "hết hạn",
    "có hiệu lực đến", "hiệu lực đến", "đến ngày",
)  # fmt: skip
_WINDOW = 45  # ký tự phía trước ngày để tìm nhãn

_STOP = (
    r"(?:\s+(?:holder|address|date|valid|certificate|cert\b|contact|tel|phone|scope|no\.|number|"
    r"issued|expiry|expires|registration|standard|địa chỉ|ngày|số|đơn vị)\b|[;|]|\s{2,}|$)"
)
_CERT_NUMBER = re.compile(
    r"(?i)\b(?:certificate|cert\.?|licen[cs]e|registration|reg\.?|số(?:\s+giấy)?(?:\s+chứng nhận)?)"
    r"\s*(?:no\.?|number|num\.?|#)?\s*[:：#]?\s*([A-Z0-9][A-Z0-9\-/._]{3,39})"
)
_ISSUER = re.compile(
    r"(?i)(?:issued\s+by|certification\s+body|certifying\s+body|certified\s+by|"
    r"tổ\s+chức\s+cấp|cơ\s+quan\s+cấp)\s*[:：]\s*"
    r"([A-Za-zÀ-ỹ0-9&.,'()\-/ ]{3,120}?)" + _STOP
)


def _fold(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text.lower().replace("đ", "d"))
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def _build(groups: Mapping[str, str | None]) -> dt.date | None:
    try:
        year = int(groups["y"] or 0)
        day = int(groups["d"] or 0)
        month = (
            _MONTHS[(groups.get("mon") or "").lower()]
            if groups.get("mon")
            else int(groups["m"] or 0)
        )
        return dt.date(year, month, day)
    except (ValueError, KeyError):
        return None


def find_dates(text: str) -> list[tuple[int, int, dt.date]]:
    """Mọi ngày hợp lệ trong văn bản: (vị trí bắt đầu, vị trí kết thúc, ngày). Kiểu dd/mm/yyyy là
    ngày trước (EU, Việt Nam); trùng vị trí giữa các pattern chỉ lấy một."""
    found: list[tuple[int, int, dt.date]] = []
    taken: list[tuple[int, int]] = []
    for pattern in _DATE_PATTERNS:
        for m in pattern.finditer(text):
            span = (m.start(), m.end())
            if any(span[0] < b and a < span[1] for a, b in taken):
                continue
            date = _build(m.groupdict())
            if date is not None and 1990 <= date.year <= 2100:
                found.append((m.start(), m.end(), date))
                taken.append(span)
    return sorted(found)


def _label_kind(window: str) -> str | None:
    """'issue' / 'expiry' theo nhãn kết thúc gần ngày nhất trong cửa sổ; không có nhãn → None."""
    folded = _fold(window)
    best, kind = -1, None
    for labels, name in ((_ISSUE_LABELS, "issue"), (_EXPIRY_LABELS, "expiry")):
        for label in labels:
            at = folded.rfind(_fold(label))
            if at >= 0 and at + len(label) > best:
                best, kind = at + len(label), name
    return kind


def extract_dates(text: str) -> tuple[str | None, str | None]:
    """(ngày cấp, ngày hết hạn) theo nhãn; hết hạn không sau ngày cấp thì bỏ hết hạn."""
    issued: dt.date | None = None
    expires: dt.date | None = None
    for start, _end, date in find_dates(text):
        kind = _label_kind(text[max(0, start - _WINDOW) : start])
        if kind == "issue" and issued is None:
            issued = date
        elif kind == "expiry" and expires is None:
            expires = date
    if issued and expires and expires <= issued:
        expires = None
    return (issued.isoformat() if issued else None, expires.isoformat() if expires else None)


def extract_certificate_number(text: str) -> str | None:
    pos = 0
    while (m := _CERT_NUMBER.search(text, pos)) is not None:
        value = m.group(1).strip(" .,-/")
        # Phải có ít nhất một chữ số: tránh bắt nhầm từ như "Certificate" hay "Holder".
        if any(c.isdigit() for c in value):
            return value[: LIMITS["certificate_number"]]
        pos = (
            m.start() + 1
        )  # thử lại từ vị trí kế tiếp: nhãn thật có thể nằm trong phần vừa bắt nhầm
    return None


def extract_issuer(text: str) -> str | None:
    m = _ISSUER.search(text)
    if not m:
        return None
    value = " ".join(m.group(1).split()).strip(" .,;-")
    return value[: LIMITS["issuer"]] or None


def _keyword_patterns(code: str, labels: Sequence[str]) -> list[re.Pattern[str]]:
    patterns: list[re.Pattern[str]] = []
    if "_" in code:
        parts = [re.escape(p) for p in code.split("_")]
        patterns.append(re.compile(r"\b" + r"[\s_.\-]*".join(parts) + r"\b", re.IGNORECASE))
    else:
        # Viết tắt một từ (HACCP, IFS, WRAP…): phải VIẾT HOA nguyên chữ, tránh bắt nhầm từ thường.
        patterns.append(re.compile(r"\b" + re.escape(code.upper()) + r"\b"))
    for label in labels:
        head = re.split(r"\s*[(\-–—]", label, maxsplit=1)[0].strip()
        if len(head) >= 8 and " " in head:
            patterns.append(re.compile(re.escape(head), re.IGNORECASE))
    return patterns


def detect_type(text: str, type_labels: Mapping[str, Sequence[str]]) -> str | None:
    """Mã loại giấy tờ nếu ĐÚNG MỘT loại (trong danh mục đã duyệt) khớp từ khoá; mơ hồ → None."""
    matched = {
        code
        for code, labels in type_labels.items()
        if code != "other" and any(p.search(text) for p in _keyword_patterns(code, labels))
    }
    return next(iter(matched)) if len(matched) == 1 else None


def rule_extract(text: str, type_labels: Mapping[str, Sequence[str]]) -> dict[str, str | None]:
    """Các trường đọc được theo quy tắc; trường nào không chắc thì None (cùng khoá với model)."""
    issued, expires = extract_dates(text)
    out: dict[str, str | None] = dict.fromkeys(FIELDS)
    out.update(
        {
            "type_code": detect_type(text, type_labels),
            "certificate_number": extract_certificate_number(text),
            "issuer": extract_issuer(text),
            "issued_at": issued,
            "expires_at": expires,
        }
    )
    return out
