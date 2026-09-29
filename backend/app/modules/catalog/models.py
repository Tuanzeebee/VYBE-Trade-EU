from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class HsCode(Base):
    """Danh mục mã HS. Chỉ là danh mục để chọn/tìm — không chứa thuế hay quy tắc xuất xứ
    (những dữ liệu đó nằm ở tariff_lines / product_specific_rules và phải có reviewed_by).

    Hàm immutable_unaccent() và các chỉ mục tìm kiếm được tạo bằng tay trong migration 0006.
    """

    __tablename__ = "hs_codes"
    __table_args__ = (
        CheckConstraint("code ~ '^[0-9]{6,8}$'", name="code_format"),
        CheckConstraint("chapter = left(code, 2)", name="chapter_matches_code"),
        # Tìm theo tiền tố mã (LIKE '1006%') — khớp với migration 0006.
        Index("ix_hs_codes_code_prefix", "code", postgresql_ops={"code": "text_pattern_ops"}),
        # Tìm theo tên — biểu thức phải khớp đúng catalog/service.py và migration 0006.
        Index(
            "ix_hs_codes_name_vi_trgm",
            text("immutable_unaccent(lower(name_vi)) gin_trgm_ops"),
            postgresql_using="gin",
        ),
        Index(
            "ix_hs_codes_name_en_trgm",
            text("lower(name_en) gin_trgm_ops"),
            postgresql_using="gin",
        ),
    )

    code: Mapped[str] = mapped_column(String(8), primary_key=True)  # chỉ chữ số, không dấu chấm
    name_vi: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    chapter: Mapped[str] = mapped_column(String(2))
    category: Mapped[str | None] = mapped_column(String(32), index=True)
    is_calculator_supported: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
