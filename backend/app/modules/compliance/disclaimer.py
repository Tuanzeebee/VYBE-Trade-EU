"""Dòng lưu ý khi kết quả dựa trên dữ liệu chưa được luật sư thương mại xác nhận
(SPEC_compliance_data_20_codes §2a, khoá i18n compliance.disclaimer.unreviewed).

Hiển thị ở mọi môi trường, kể cả prod; không có cờ nào tắt được. Chỉ trả None khi REVIEWED.
"""

UNREVIEWED = "UNREVIEWED"
REVIEWED = "REVIEWED"

_VI = (
    "Lưu ý: Thông tin này chưa được luật sư thương mại xác nhận. Vui lòng đối chiếu với cơ quan "
    "cấp C/O hoặc chuyên gia tư vấn trước khi sử dụng."
)
_EN = (
    "Note: This information has not yet been confirmed by a trade lawyer. Please check with the "
    "issuing authority or a trade compliance advisor before relying on it."
)


def pick_language(accept_language: str | None) -> str:
    """'en' khi header ưu tiên tiếng Anh; mặc định 'vi' (ngôn ngữ chính của sản phẩm)."""
    first = (accept_language or "").split(",")[0].strip().lower()
    return "en" if first.startswith("en") else "vi"


def disclaimer_for(review_state: str, accept_language: str | None) -> str | None:
    if review_state != UNREVIEWED:
        return None
    return _EN if pick_language(accept_language) == "en" else _VI
