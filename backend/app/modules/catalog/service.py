"""API công khai của module catalog: tìm và tra cứu mã HS.

B5 (sản phẩm) và C2 (máy tính) dùng lại các hàm ở đây.
"""

import re
from collections.abc import Sequence

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.models import HsCode
from app.modules.catalog.schemas import HsCodeIn, HsCodeOut

MAX_RESULTS = 20
_SEPARATORS = re.compile(r"[\s.]")
_DIGITS = re.compile(r"[0-9]+")
_CODE = re.compile(r"[0-9]{6,8}")


def normalize_code(raw: str) -> str | None:
    """'1006.30' / ' 1006 30 ' → '100630'. Không phải mã 6–8 chữ số → None."""
    digits = _SEPARATORS.sub("", raw)
    return digits if _CODE.fullmatch(digits) else None


def format_code(code: str) -> str:
    """'100630' → '1006.30'; '10063000' → '1006.30.00'."""
    parts = [code[:4], code[4:6], code[6:]]
    return ".".join(p for p in parts if p)


def _to_out(hs: HsCode) -> HsCodeOut:
    return HsCodeOut(
        code=hs.code,
        formatted=format_code(hs.code),
        name_vi=hs.name_vi,
        name_en=hs.name_en,
        chapter=hs.chapter,
        category=hs.category,
        supported=hs.is_calculator_supported,
    )


def _escape_like(token: str) -> str:
    return token.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def search_hs_codes(
    session: AsyncSession, q: str, limit: int = MAX_RESULTS
) -> list[HsCodeOut]:
    """Gõ mã (có hoặc không dấu chấm) → khớp tiền tố. Gõ chữ → mọi từ phải khớp tên tiếng Việt
    (không phân biệt dấu, hoa/thường) hoặc tên tiếng Anh, không phụ thuộc thứ tự từ."""
    q = q.strip()
    if not q:
        return []
    limit = min(limit, MAX_RESULTS)
    digits = _SEPARATORS.sub("", q)
    if _DIGITS.fullmatch(digits):
        query = select(HsCode).where(HsCode.code.like(f"{digits}%")).order_by(HsCode.code)
    else:
        conditions = []
        for token in q.split():
            pattern = f"%{_escape_like(token)}%"
            conditions.append(
                or_(
                    func.immutable_unaccent(func.lower(HsCode.name_vi)).like(
                        func.immutable_unaccent(func.lower(pattern)), escape="\\"
                    ),
                    func.lower(HsCode.name_en).like(func.lower(pattern), escape="\\"),
                )
            )
        query = (
            select(HsCode)
            .where(and_(*conditions))
            .order_by(HsCode.is_calculator_supported.desc(), HsCode.code)
        )
    rows = (await session.scalars(query.limit(limit))).all()
    return [_to_out(hs) for hs in rows]


async def get_hs_code(session: AsyncSession, raw_code: str) -> HsCodeOut | None:
    code = normalize_code(raw_code)
    if code is None:
        return None
    hs = await session.get(HsCode, code)
    return _to_out(hs) if hs else None


async def upsert_hs_codes(session: AsyncSession, rows: Sequence[HsCodeIn]) -> int:
    """Nạp/cập nhật danh mục (chạy lại nhiều lần không trùng). Trả số dòng đã xử lý."""
    for row in rows:
        await session.merge(
            HsCode(
                code=row.code,
                name_vi=row.name_vi,
                name_en=row.name_en,
                chapter=row.code[:2],
                category=row.category,
                is_calculator_supported=row.is_calculator_supported,
            )
        )
    await session.commit()
    return len(rows)


async def list_categories(session: AsyncSession) -> set[str]:
    """Các nhóm hàng đang có trong danh mục HS (dùng để kiểm tra luật theo nhóm hàng)."""
    rows = await session.scalars(
        select(HsCode.category).where(HsCode.category.is_not(None)).distinct()
    )
    return {c for c in rows if c}
