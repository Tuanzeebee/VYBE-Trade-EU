"""Điều phối màn hình quản trị (I4, I5): chỉ gọi service của module khác, không đụng bảng của họ."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin.schemas import StatsOut
from app.modules.companies import service as companies


async def stats(session: AsyncSession) -> StatsOut:
    counts = await companies.count_by_verification_status(session)
    return StatsOut(
        verified_count=counts.get("verified", 0), pending_count=counts.get("pending", 0)
    )
