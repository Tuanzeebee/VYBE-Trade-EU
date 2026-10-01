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
    cross_checked: bool = False  # I8: lần kiểm chéo nguồn ngoài mới nhất cho kết quả match


def add_months(start: dt.date, months: int) -> dt.date:
    """Cộng tháng theo lịch; ngày vượt độ dài tháng đích thì lùi về cuối tháng (31/1 + 1 = 28/2)."""
    index = start.year * 12 + (start.month - 1) + months
    year, month = divmod(index, 12)
    month += 1
    return dt.date(year, month, min(start.day, calendar.monthrange(year, month)[1]))


def evidence_expiry(
    issued_at: dt.date, validity_months: int | None, supplied: dt.date | None
) -> dt.date | None:
    """Loại bằng chứng có validity_months (vd xuất xứ: 12) thì hạn do hệ thống tính từ ngày cấp,
    không tin ngày client gửi; loại khác dùng ngày do người dùng khai (có thể không có hạn)."""
    if validity_months is not None:
        return add_months(issued_at, validity_months)
    return supplied


def is_valid(evidence: EvidenceFact, today: dt.date) -> bool:
    """Đã được duyệt và chưa hết hạn."""
    return evidence.approval_status == "approved" and (
        evidence.expires_at is None or today < evidence.expires_at
    )


def is_evfta_verified(
    status: str,
    evidence: Iterable[EvidenceFact],
    required: set[str],
    today: dt.date,
    *,
    ownership_proven: bool,
) -> bool:
    """EVFTA-verified = công ty verified VÀ đã chứng minh quyền sở hữu (I11) VÀ MỌI loại bắt buộc có
    bằng chứng còn hạn đã kiểm chéo với nguồn cấp cho kết quả match (I8).

    Không có loại bắt buộc nào (thiếu dữ liệu luật TM) → False: không tự nâng mức khi thiếu căn cứ.
    """
    if status != "verified" or not required or not ownership_proven:
        return False
    valid_types = {e.type_code for e in evidence if is_valid(e, today) and e.cross_checked}
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
