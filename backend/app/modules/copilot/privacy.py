"""Che thông tin cá nhân trong câu hỏi trước khi gửi LLM hoặc lưu log (GDPR: tối thiểu hóa dữ liệu).

Hàm thuần. Che email và số điện thoại (chuỗi từ 8 chữ số, cho phép dấu cách, chấm, gạch, ngoặc, +).
Không che được mọi PII viết tự do; đây là lớp phòng thủ bổ sung, không phải cam kết tuyệt đối.
"""

import re

_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_PHONE = re.compile(r"(?<![\w.])\+?\d[\d\s().-]{6,}\d(?![\w])")


def redact_pii(text: str) -> str:
    text = _EMAIL.sub("[email]", text)

    def _phone(match: re.Match[str]) -> str:
        digits = re.sub(r"\D", "", match.group(0))
        return "[phone]" if len(digits) >= 8 else match.group(0)

    return _PHONE.sub(_phone, text)
