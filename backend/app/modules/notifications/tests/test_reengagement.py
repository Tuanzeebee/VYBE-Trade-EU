"""J4: thông báo kéo quay lại — người vắng 7–30 ngày có việc đang chờ nhận đúng một thông báo tổng hợp."""

import datetime as dt
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs.app import app
from app.jobs.reengagement import reengagement  # noqa: F401 — đăng ký task vào app
from app.modules.messaging.tests.conftest import make_buyer, make_exporter
from app.modules.notifications.models import NotificationType
from app.modules.notifications.reengagement import (
    COOLDOWN_DAYS,
    is_dormant,
    pending_counts,
    run_reengagement,
)

# Dùng giờ thật: created_at của thông báo do DB đặt (clock_timestamp), cooldown so với giờ đó.
NOW = dt.datetime.now(dt.UTC)


def ago(days: float) -> dt.datetime:
    return NOW - dt.timedelta(days=days)


async def user_id(session: AsyncSession, email: str) -> uuid.UUID:
    found = await session.scalar(text("SELECT id FROM users WHERE email = :e"), {"e": email})
    assert found is not None
    return uuid.UUID(str(found))


async def set_login(session: AsyncSession, email: str, when: dt.datetime | None) -> uuid.UUID:
    await session.execute(
        text("UPDATE users SET last_login_at = :t WHERE email = :e"), {"t": when, "e": email}
    )
    return await user_id(session, email)


async def add_notification(
    session: AsyncSession,
    uid: uuid.UUID,
    kind: str = "message",
    *,
    created: dt.datetime,
    read: bool = False,
    payload: str = "{}",
) -> None:
    await session.execute(
        text(
            "INSERT INTO notifications (user_id, type, payload, link, is_read, created_at) "
            "VALUES (:u, CAST(:k AS notification_type), CAST(:p AS jsonb), '/x', :r, :c)"
        ),
        {"u": uid, "k": kind, "p": payload, "r": read, "c": created},
    )


async def add_dashboard_open(session: AsyncSession, uid: uuid.UUID, when: dt.datetime) -> None:
    await session.execute(
        text(
            "INSERT INTO dashboard_events (user_id, role, opened_at, is_return_visit, had_new_info, "
            "tile_hashes) VALUES (:u, 'buyer', :t, false, false, '{}'::jsonb)"
        ),
        {"u": uid, "t": when},
    )


async def digests(session: AsyncSession, email: str) -> list[dict[str, Any]]:
    rows = await session.execute(
        text(
            "SELECT n.payload, n.link FROM notifications n JOIN users u ON u.id = n.user_id "
            "WHERE u.email = :e AND n.type = 'reengagement' ORDER BY n.created_at"
        ),
        {"e": email},
    )
    return [{"payload": r.payload, "link": r.link} for r in rows]


@pytest.fixture
async def buyer(api_client: AsyncClient, db_session: AsyncSession) -> uuid.UUID:
    await make_buyer(api_client)
    return await user_id(db_session, "buyer@x.de")


# --- hàm thuần ---


def test_pending_counts_only_unread_after_last_activity_by_type() -> None:
    unread = [
        (NotificationType.message, ago(3)),
        (NotificationType.message, ago(2)),
        (NotificationType.rfq, ago(1)),
        (NotificationType.rfq, ago(12)),  # trước lần hoạt động cuối
        (NotificationType.reengagement, ago(1)),  # chính thông báo này không tự đếm
    ]
    assert pending_counts(unread, ago(10)) == {"message": 2, "rfq": 1}
    assert pending_counts([], ago(10)) == {}


@pytest.mark.parametrize(
    ("days", "expected"),
    [(6.9, False), (7, True), (15, True), (30, True), (30.1, False)],
)
def test_dormant_window(days: float, expected: bool) -> None:
    assert is_dormant(ago(days), NOW) is expected


# --- job ---


async def test_dormant_user_with_pending_items_gets_one_digest(
    db_session: AsyncSession, buyer: uuid.UUID
) -> None:
    await set_login(db_session, "buyer@x.de", ago(10))
    await add_notification(db_session, buyer, "message", created=ago(5))
    await add_notification(db_session, buyer, "message", created=ago(4))
    await add_notification(db_session, buyer, "rfq", created=ago(3))
    assert await run_reengagement(db_session, NOW) == 1
    [found] = await digests(db_session, "buyer@x.de")
    assert found["payload"] == {"kind": "digest", "counts": {"message": 2, "rfq": 1}, "total": 3}
    assert found["link"] == "/buyer"


async def test_exporter_digest_links_to_exporter_home(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_exporter(api_client, db_session)
    uid = await set_login(db_session, "exp@x.vn", ago(8))
    await add_notification(db_session, uid, "profile_viewed", created=ago(2))
    assert await run_reengagement(db_session, NOW) == 1
    [found] = await digests(db_session, "exp@x.vn")
    assert found["link"] == "/exporter"


async def test_nothing_waiting_means_no_digest(db_session: AsyncSession, buyer: uuid.UUID) -> None:
    await set_login(db_session, "buyer@x.de", ago(10))
    assert await run_reengagement(db_session, NOW) == 0
    assert await digests(db_session, "buyer@x.de") == []


async def test_read_or_older_than_last_activity_items_do_not_count(
    db_session: AsyncSession, buyer: uuid.UUID
) -> None:
    await set_login(db_session, "buyer@x.de", ago(10))
    await add_notification(db_session, buyer, "message", created=ago(3), read=True)
    await add_notification(db_session, buyer, "rfq", created=ago(12))
    assert await run_reengagement(db_session, NOW) == 0


async def test_cooldown_blocks_a_second_digest_but_not_after_it_expires(
    db_session: AsyncSession, buyer: uuid.UUID
) -> None:
    await set_login(db_session, "buyer@x.de", ago(10))
    await add_notification(db_session, buyer, "message", created=ago(5))
    assert await run_reengagement(db_session, NOW) == 1
    assert await run_reengagement(db_session, NOW) == 0
    assert len(await digests(db_session, "buyer@x.de")) == 1
    # Vẫn vắng và còn việc chờ sau hết thời gian chờ → được nhắc lại (đẩy thời điểm bản cũ về trước).
    await db_session.execute(
        text(
            "UPDATE notifications SET created_at = :t "
            "WHERE user_id = :u AND type = CAST('reengagement' AS notification_type)"
        ),
        {"t": NOW - dt.timedelta(days=COOLDOWN_DAYS + 1), "u": buyer},
    )
    await set_login(db_session, "buyer@x.de", NOW - dt.timedelta(days=20))
    await add_notification(db_session, buyer, "rfq", created=ago(1))
    assert await run_reengagement(db_session, NOW) == 1


@pytest.mark.parametrize("days", [2, 6, 31, 90])
async def test_only_users_away_between_7_and_30_days_are_nudged(
    db_session: AsyncSession, buyer: uuid.UUID, days: int
) -> None:
    await set_login(db_session, "buyer@x.de", ago(days))
    await add_notification(db_session, buyer, "message", created=ago(1))
    assert await run_reengagement(db_session, NOW) == 0


async def test_recent_dashboard_visit_counts_as_activity(
    db_session: AsyncSession, buyer: uuid.UUID
) -> None:
    """Phiên đăng nhập kéo dài: đăng nhập cuối 20 ngày trước nhưng vừa mở dashboard hôm kia."""
    await set_login(db_session, "buyer@x.de", ago(20))
    await add_dashboard_open(db_session, buyer, ago(2))
    await add_notification(db_session, buyer, "message", created=ago(1))
    assert await run_reengagement(db_session, NOW) == 0


async def test_deleted_or_never_logged_in_users_are_skipped(
    db_session: AsyncSession, buyer: uuid.UUID
) -> None:
    await add_notification(db_session, buyer, "message", created=ago(1))
    await set_login(db_session, "buyer@x.de", None)
    assert await run_reengagement(db_session, NOW) == 0
    await set_login(db_session, "buyer@x.de", ago(10))
    await db_session.execute(
        text("UPDATE users SET deleted_at = now() WHERE id = :u"), {"u": buyer}
    )
    assert await run_reengagement(db_session, NOW) == 0


def test_job_is_registered_as_daily_periodic_task() -> None:
    assert "reengagement" in {task.name for task in app.tasks.values()}
    crons = [p.cron for p in app.periodic_registry.periodic_tasks.values()]
    assert "30 8 * * *" in crons
