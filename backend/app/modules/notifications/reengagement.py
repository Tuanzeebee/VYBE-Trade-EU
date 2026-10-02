"""Thông báo kéo người dùng quay lại (J4, demo 30/9) — chỉ trong ứng dụng, không gửi email.

Email "quay lại" mang tính tiếp thị, repo chưa có opt-out / hủy đăng ký, nên chưa gửi.
Quy tắc: người đã vắng 7–30 ngày và có thông báo chưa đọc phát sinh trong lúc vắng thì nhận đúng một
thông báo tổng hợp, tối đa một lần mỗi 14 ngày. Không có gì đang chờ thì không gửi.
Payload chỉ chứa số đếm theo loại, không có dữ liệu cá nhân.
"""

import datetime as dt
import uuid
from collections import Counter
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth import service as auth
from app.modules.dashboard import service as dashboard
from app.modules.notifications import center
from app.modules.notifications.models import Notification, NotificationType

MIN_INACTIVE_DAYS = 7  # vắng ít nhất ngần này ngày mới nhắc
MAX_INACTIVE_DAYS = 30  # vắng quá lâu thì thôi, không nhắc mãi
COOLDOWN_DAYS = 14  # tối đa một thông báo tổng hợp mỗi khoảng này
DIGEST_KEY = "kind"
DIGEST_VALUE = "digest"


def pending_counts(
    unread: Iterable[tuple[NotificationType, dt.datetime]], last_active: dt.datetime
) -> dict[str, int]:
    """Đếm thông báo chưa đọc phát sinh sau lần hoạt động cuối, theo loại (hàm thuần)."""
    counts = Counter(
        kind.value
        for kind, created in unread
        if created > last_active and kind is not NotificationType.reengagement
    )
    return dict(counts)


def is_dormant(last_active: dt.datetime, now: dt.datetime) -> bool:
    away = now - last_active
    return dt.timedelta(days=MIN_INACTIVE_DAYS) <= away <= dt.timedelta(days=MAX_INACTIVE_DAYS)


async def run_reengagement(session: AsyncSession, now: dt.datetime) -> int:
    """Tạo thông báo tổng hợp cho người đủ điều kiện. Trả số thông báo đã tạo."""
    candidates = await auth.list_logins_before(session, now - dt.timedelta(days=MIN_INACTIVE_DAYS))
    if not candidates:
        return 0
    opened = await dashboard.last_opened_at(session, [c.user_id for c in candidates])
    last_active: dict[uuid.UUID, dt.datetime] = {
        c.user_id: max(c.last_login_at, opened.get(c.user_id, c.last_login_at)) for c in candidates
    }
    dormant = [c for c in candidates if is_dormant(last_active[c.user_id], now)]
    if not dormant:
        return 0

    rows = await session.execute(
        select(Notification.user_id, Notification.type, Notification.created_at).where(
            Notification.user_id.in_([c.user_id for c in dormant]),
            Notification.is_read.is_(False),
        )
    )
    unread: dict[uuid.UUID, list[tuple[NotificationType, dt.datetime]]] = {}
    for user_id, kind, created in rows.all():
        unread.setdefault(user_id, []).append((kind, created))

    created_count = 0
    for candidate in dormant:
        counts = pending_counts(unread.get(candidate.user_id, []), last_active[candidate.user_id])
        if not counts:
            continue
        if await center.has_recent(
            session,
            candidate.user_id,
            NotificationType.reengagement,
            DIGEST_KEY,
            DIGEST_VALUE,
            now - dt.timedelta(days=COOLDOWN_DAYS),
        ):
            continue
        await center.create_notification(
            session,
            candidate.user_id,
            NotificationType.reengagement,
            {DIGEST_KEY: DIGEST_VALUE, "counts": counts, "total": sum(counts.values())},
            role=candidate.role,
            commit=False,
        )
        created_count += 1
    await session.commit()
    return created_count
