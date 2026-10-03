"""Hàm thuần về bằng chứng (C6): không đụng DB/HTTP (AGENTS.md §5.3).

Ngày hết hạn (expires_at) là ngày ĐÃ hết hiệu lực (loại trừ), giống valid_until của dòng thuế.
"""

import calendar
import datetime as dt
from collections.abc import Iterable
from dataclasses import dataclass


@dataclass(frozen=True)
class EvidenceFact:
    type_code: str
    approval_status: str  # pending | approved | rejected
    expires_at: dt.date | None


def add_months(start: dt.date, months: int) -> dt.date:
    """Cộng tháng theo lịch; ngày vượt độ dài tháng đích thì lùi về cuối tháng (31/1 + 1 = 28/2)."""
    index = start.year * 12 + (start.month - 1) + months
    year, month = divmod(index, 12)
    month += 1
    return dt.date(year, month, min(start.day, calendar.monthrange(year, month)[1]))


def evidence_expiry(
    issued_at: dt.date | None, validity_months: int | None, supplied: dt.date | None
) -> dt.date | None:
    """Loại bằng chứng có validity_months (vd xuất xứ: 12) thì hạn do hệ thống tính từ ngày cấp,
    không tin ngày client gửi; loại khác dùng ngày do người dùng khai (có thể không có hạn).

    U4: chưa có ngày cấp thì loại có validity_months chưa tính được hạn (None); admin nhập ngày
    cấp mới duyệt được (admin_service.review_evidence)."""
    if validity_months is not None:
        return add_months(issued_at, validity_months) if issued_at is not None else None
    return supplied


def is_valid(evidence: EvidenceFact, today: dt.date) -> bool:
    """Đã được duyệt và chưa hết hạn."""
    return evidence.approval_status == "approved" and (
        evidence.expires_at is None or today < evidence.expires_at
    )


def is_evfta_verified(
    status: str, evidence: Iterable[EvidenceFact], required: set[str], today: dt.date
) -> bool:
    """EVFTA-verified = công ty verified VÀ có bằng chứng còn hạn cho MỌI loại bắt buộc.

    Không có loại bắt buộc nào (thiếu dữ liệu luật TM) → False: không tự nâng mức khi thiếu căn cứ.
    """
    if status != "verified" or not required:
        return False
    valid_types = {e.type_code for e in evidence if is_valid(e, today)}
    return required <= valid_types


def checklist_state(type_code: str, evidence: Iterable[EvidenceFact], today: dt.date) -> str:
    """Trạng thái của một loại bằng chứng trong danh sách kiểm:
    approved (còn hạn) > pending > expired > rejected > missing."""
    mine = [e for e in evidence if e.type_code == type_code]
    if any(is_valid(e, today) for e in mine):
        return "approved"
    if any(e.approval_status == "pending" for e in mine):
        return "pending"
    if any(e.approval_status == "approved" for e in mine):
        return "expired"
    if any(e.approval_status == "rejected" for e in mine):
        return "rejected"
    return "missing"
