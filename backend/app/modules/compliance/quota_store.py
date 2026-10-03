"""Truy vấn dùng chung cho số dư hạn ngạch (C2-C).

Nhiều dòng hạn ngạch có thể dùng CHUNG một khối lượng (cùng số hiệu, nhiều mã HS). Số dư vì vậy
được gộp theo (hiệp định, nơi đến, số hiệu hạn ngạch, chu kỳ), không theo từng dòng: nhập số dư ở
dòng nào thì mọi dòng cùng nhóm đều thấy. Hạn ngạch không có số hiệu thì chỉ dùng số dư của nó.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compliance.models import TariffQuota, TariffQuotaBalance


async def quota_group_ids(session: AsyncSession, quota: TariffQuota) -> list[uuid.UUID]:
    """Các dòng hạn ngạch dùng chung khối lượng với `quota` (gồm chính nó)."""
    if not quota.quota_code:
        return [quota.id]
    rows = await session.scalars(
        select(TariffQuota).where(
            TariffQuota.agreement_code == quota.agreement_code,
            TariffQuota.destination == quota.destination,
            TariffQuota.quota_code == quota.quota_code,
        )
    )
    key = (quota.period_start, quota.period_end, quota.quota_year)
    ids = [r.id for r in rows if (r.period_start, r.period_end, r.quota_year) == key]
    return ids or [quota.id]


async def group_balances(session: AsyncSession, quota: TariffQuota) -> list[TariffQuotaBalance]:
    """Số dư của cả nhóm, mới nhất trước (cùng ngày thì bản nhập sau thắng)."""
    ids = await quota_group_ids(session, quota)
    rows = await session.scalars(
        select(TariffQuotaBalance)
        .where(TariffQuotaBalance.quota_id.in_(ids))
        .order_by(TariffQuotaBalance.as_of.desc(), TariffQuotaBalance.created_at.desc())
    )
    return list(rows)


async def latest_balance(session: AsyncSession, quota: TariffQuota) -> TariffQuotaBalance | None:
    balances = await group_balances(session, quota)
    return balances[0] if balances else None
