"""API công khai của module catalog: tìm và tra cứu mã HS.

B5 (sản phẩm) và C2 (máy tính) dùng lại các hàm ở đây.
"""

import re
from collections.abc import Sequence

from sqlalchemy import Select, and_, func, or_, select, update
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


def _code_prefixes(digits: str) -> list[str]:
    """Tiền tố mã để tìm. Bảng tính hay làm mất số 0 đầu (03061792 → 3061792, 030617 → 30617):
    mã đủ 5 hoặc 7 số không bắt đầu bằng 0 được thử thêm với số 0 đứng trước."""
    if len(digits) in (5, 7) and not digits.startswith("0"):
        return [digits, f"0{digits}"]
    return [digits]


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
        prefixes = or_(*(HsCode.code.like(f"{p}%") for p in _code_prefixes(digits)))
        query = select(HsCode).where(prefixes).order_by(HsCode.code)
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
        # Danh mục đủ HS 2022 (U3) có hàng nghìn mã: xếp mã giống cụm từ đã gõ nhất lên đầu
        # (pg_trgm), sau cờ hỗ trợ máy tính.
        relevance = func.greatest(
            func.similarity(
                func.immutable_unaccent(func.lower(HsCode.name_vi)),
                func.immutable_unaccent(func.lower(q)),
            ),
            func.similarity(func.lower(HsCode.name_en), func.lower(q)),
        )
        query = (
            select(HsCode)
            .where(and_(*conditions))
            .order_by(HsCode.is_calculator_supported.desc(), relevance.desc(), HsCode.code)
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


async def ensure_hs_codes(session: AsyncSession, rows: Sequence[HsCodeIn]) -> int:
    """Thêm mã còn thiếu, KHÔNG sửa mã đã có và KHÔNG commit (người gọi giữ transaction).
    Trả số mã mới thêm."""
    existing = set(
        await session.scalars(select(HsCode.code).where(HsCode.code.in_([r.code for r in rows])))
    )
    added = 0
    for row in rows:
        if row.code in existing:
            continue
        session.add(
            HsCode(
                code=row.code,
                name_vi=row.name_vi,
                name_en=row.name_en,
                chapter=row.code[:2],
                category=row.category,
                is_calculator_supported=row.is_calculator_supported,
            )
        )
        added += 1
    await session.flush()
    return added


async def set_calculator_supported(session: AsyncSession, codes: Sequence[str]) -> None:
    """Đặt is_calculator_supported theo danh sách mã (true cho mã trong danh sách). Không commit."""
    await session.execute(
        update(HsCode).where(HsCode.code.in_(list(codes))).values(is_calculator_supported=True)
    )


async def merge_nomenclature(
    session: AsyncSession, rows: Sequence[HsCodeIn], curated_vi: set[str]
) -> tuple[int, int]:
    """Nạp danh mục HS đầy đủ (U3) mà không đụng mã đã có.

    Mã chưa có → thêm (is_calculator_supported luôn false). Mã đã có giữ nguyên tên, nhóm hàng và
    cờ hỗ trợ; ngoại lệ duy nhất: mã đang dùng tên tiếng Anh làm tên tiếng Việt (nạp đợt trước) mà
    nay có tên tiếng Việt thông dụng → chỉ đổi name_vi. Trả (số mã thêm, số mã đổi tên)."""
    existing = {
        hs.code: hs
        for hs in await session.scalars(
            select(HsCode).where(HsCode.code.in_([r.code for r in rows]))
        )
    }
    inserted = renamed = 0
    for row in rows:
        current = existing.get(row.code)
        if current is None:
            session.add(
                HsCode(
                    code=row.code,
                    name_vi=row.name_vi,
                    name_en=row.name_en,
                    chapter=row.code[:2],
                    category=row.category,
                    is_calculator_supported=False,
                )
            )
            inserted += 1
        elif (
            row.code in curated_vi
            and current.name_vi == current.name_en
            and current.name_vi != row.name_vi
        ):
            current.name_vi = row.name_vi
            renamed += 1
    await session.commit()
    return inserted, renamed


async def list_categories(session: AsyncSession) -> set[str]:
    """Các nhóm hàng đang có trong danh mục HS (dùng để kiểm tra luật theo nhóm hàng)."""
    rows = await session.scalars(
        select(HsCode.category).where(HsCode.category.is_not(None)).distinct()
    )
    return {c for c in rows if c}


def hs_codes_matching(token: str) -> Select[str]:
    """Truy vấn con: mã HS khớp MỘT từ khóa. Số → tiền tố mã; chữ → tên vi (không dấu) hoặc en.
    Cho module khác ghép vào truy vấn của mình mà không đụng bảng hs_codes."""
    token = token.strip()
    digits = _SEPARATORS.sub("", token)
    if _DIGITS.fullmatch(digits):
        return select(HsCode.code).where(
            or_(*(HsCode.code.like(f"{p}%") for p in _code_prefixes(digits)))
        )
    pattern = f"%{_escape_like(token)}%"
    return select(HsCode.code).where(
        or_(
            func.immutable_unaccent(func.lower(HsCode.name_vi)).like(
                func.immutable_unaccent(func.lower(pattern)), escape="\\"
            ),
            func.lower(HsCode.name_en).like(func.lower(pattern), escape="\\"),
        )
    )


def hs_codes_in_category(category: str) -> Select[str]:
    return select(HsCode.code).where(HsCode.category == category)


async def categories_for_codes(
    session: AsyncSession, codes: Sequence[str]
) -> dict[str, str | None]:
    if not codes:
        return {}
    rows = await session.execute(select(HsCode.code, HsCode.category).where(HsCode.code.in_(codes)))
    return {code: category for code, category in rows.all()}
