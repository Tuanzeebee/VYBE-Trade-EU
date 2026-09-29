from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.modules.companies.schemas import Industry

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class HsCodeIn(BaseModel):
    """Một dòng danh mục để nạp vào DB (script seed_hs_codes)."""

    code: Annotated[str, StringConstraints(pattern=r"^[0-9]{6,8}$")]
    name_vi: Name
    name_en: Name
    category: Industry | None = None
    is_calculator_supported: bool = False


class HsCodeOut(BaseModel):
    code: str  # chỉ chữ số, dùng làm khóa
    formatted: str  # 1006.30 — để hiển thị
    name_vi: str
    name_en: str
    chapter: str
    category: str | None
    supported: bool  # thuộc danh mục hỗ trợ máy tính (không có nghĩa đã có dữ liệu thuế)
