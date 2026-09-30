"""Tra danh sách chặn (I11). Tách riêng để evidence_service và identity_service cùng dùng."""

from collections.abc import Mapping

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.verification.identity import normalize
from app.modules.verification.models import BlocklistIdentifier, IdentifierType

# Tên trường đầu vào → loại định danh trong danh sách chặn.
_KIND = {
    "email": IdentifierType.domain,
    "website": IdentifierType.domain,
    "phone": IdentifierType.phone,
    "tax_id": IdentifierType.tax_id,
    "file_sha256": IdentifierType.file_sha256,
}


async def is_blocked(session: AsyncSession, values: Mapping[str, str | None]) -> bool:
    """Có giá trị nào (sau chuẩn hoá) nằm trong danh sách chặn không."""
    pairs = {
        (_KIND[key], value)
        for key, raw in values.items()
        if (value := normalize(_KIND[key].value, raw)) is not None
    }
    if not pairs:
        return False
    match = or_(
        *(
            and_(BlocklistIdentifier.identifier_type == kind, BlocklistIdentifier.value == value)
            for kind, value in pairs
        )
    )
    return await session.scalar(select(BlocklistIdentifier.id).where(match).limit(1)) is not None
