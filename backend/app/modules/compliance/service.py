"""Logic tuân thủ. Mọi truy vấn dòng thuế công khai đi qua _reviewed_lines."""

import datetime as dt

from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compliance.models import TariffLine


def _reviewed_lines(hs_code: str, destination: str, on_date: dt.date) -> Select[TariffLine]:
    """Dòng thuế ĐÃ DUYỆT và đang hiệu lực vào `on_date` (valid_until là ngày đã hết hiệu lực)."""
    return select(TariffLine).where(
        TariffLine.reviewed_by.is_not(None),
        TariffLine.hs_code == hs_code,
        TariffLine.destination == destination,
        TariffLine.valid_from <= on_date,
        or_(TariffLine.valid_until.is_(None), TariffLine.valid_until > on_date),
    )


async def find_lines(
    session: AsyncSession, hs_code: str, destination: str, on_date: dt.date
) -> list[TariffLine]:
    """Dòng đã duyệt khớp mã HS + nước đến vào ngày `on_date` (C2 đếm để phát hiện mơ hồ)."""
    result = await session.scalars(_reviewed_lines(hs_code, destination, on_date))
    return list(result)
