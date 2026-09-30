import datetime as dt
import pathlib
import re
import uuid
from decimal import Decimal

import pytest
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compliance.models import DutyType, TariffLine
from app.modules.compliance.service import find_lines

pytestmark = pytest.mark.usefixtures("hs_seeded")

RICE = "100630"
TODAY = dt.date(2026, 10, 15)


def _line(**over: object) -> TariffLine:
    fields: dict[str, object] = {
        "hs_code": RICE,
        "destination": "DE",
        "duty_type": DutyType.ad_valorem,
        "mfn_rate": Decimal("12.0000"),
        "evfta_rate_current": Decimal("6.0000"),
        "valid_from": dt.date(2026, 1, 1),
        "source_url": "https://example.test/tariff",
    }
    fields.update(over)
    return TariffLine(**fields)


async def _reviewed(session: AsyncSession, reviewer: uuid.UUID, **over: object) -> TariffLine:
    line = _line(reviewed_by=reviewer, reviewed_at=dt.datetime(2026, 9, 30, tzinfo=dt.UTC), **over)
    session.add(line)
    await session.flush()
    return line


async def test_unreviewed_line_never_public(
    db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    """Quy tắc cứng §6.2: dòng thiếu reviewed_by không bao giờ ra khỏi service công khai."""
    unreviewed = _line(destination="FR")
    db_session.add(unreviewed)
    ok = await _reviewed(db_session, reviewer_id, destination="DE")

    assert [x.id for x in await find_lines(db_session, RICE, "DE", TODAY)] == [ok.id]
    assert await find_lines(db_session, RICE, "FR", TODAY) == []


async def test_line_with_reviewer_but_no_review_time_is_rejected(
    db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    db_session.add(_line(reviewed_by=reviewer_id))
    with pytest.raises(IntegrityError):
        await db_session.flush()


async def test_line_with_review_time_but_no_reviewer_is_rejected(db_session: AsyncSession) -> None:
    db_session.add(_line(reviewed_at=dt.datetime(2026, 9, 30, tzinfo=dt.UTC)))
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.parametrize(
    ("valid_from", "valid_until", "on_date", "expected"),
    [
        (dt.date(2026, 1, 1), None, dt.date(2026, 10, 15), True),  # không hết hạn
        (dt.date(2026, 10, 15), None, dt.date(2026, 10, 15), True),  # có hiệu lực từ đúng ngày
        (dt.date(2026, 10, 16), None, dt.date(2026, 10, 15), False),  # chưa có hiệu lực
        (dt.date(2026, 1, 1), dt.date(2026, 10, 16), dt.date(2026, 10, 15), True),
        (
            dt.date(2026, 1, 1),
            dt.date(2026, 10, 15),
            dt.date(2026, 10, 15),
            False,
        ),  # hết hạn loại trừ
        (dt.date(2025, 1, 1), dt.date(2026, 1, 1), dt.date(2026, 10, 15), False),
    ],
)
async def test_tariff_line_validity_window(
    db_session: AsyncSession,
    reviewer_id: uuid.UUID,
    valid_from: dt.date,
    valid_until: dt.date | None,
    on_date: dt.date,
    expected: bool,
) -> None:
    await _reviewed(db_session, reviewer_id, valid_from=valid_from, valid_until=valid_until)
    assert bool(await find_lines(db_session, RICE, "DE", on_date)) is expected


async def test_find_lines_matches_exact_hs_and_destination(
    db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await _reviewed(db_session, reviewer_id)
    assert await find_lines(db_session, "100640", "DE", TODAY) == []
    assert await find_lines(db_session, RICE, "FR", TODAY) == []


@pytest.mark.parametrize(
    "over",
    [
        {"valid_until": dt.date(2026, 1, 1)},  # bằng valid_from
        {"valid_until": dt.date(2025, 12, 31)},  # trước valid_from
        {"mfn_rate": Decimal("100.0001")},
        {"mfn_rate": Decimal("-0.0001")},
        {"evfta_rate_current": Decimal("100.0001")},
        {"destination": "de"},
        {"destination": "DEU"},
        {"hs_code": "999999"},  # không có trong hs_codes
    ],
)
async def test_bad_rows_are_rejected_by_database(
    db_session: AsyncSession, over: dict[str, object]
) -> None:
    db_session.add(_line(**over))
    with pytest.raises(DBAPIError):  # IntegrityError, hoặc DataError khi quá độ dài cột
        await db_session.flush()


async def test_rates_are_exact_decimals(db_session: AsyncSession, reviewer_id: uuid.UUID) -> None:
    line = await _reviewed(
        db_session, reviewer_id, mfn_rate=Decimal("7.3333"), evfta_rate_current=Decimal("0")
    )
    await db_session.refresh(line)
    assert line.mfn_rate == Decimal("7.3333")
    assert line.evfta_rate_current == Decimal("0.0000")


def test_only_compliance_service_queries_tariff_lines() -> None:
    """Mọi truy vấn dòng thuế đi qua _reviewed_lines; không nơi nào khác select TariffLine."""
    app_dir = pathlib.Path(__file__).resolve().parents[3]
    offenders = [
        str(path.relative_to(app_dir))
        for path in app_dir.rglob("*.py")
        if "tests" not in path.parts
        and path.name != "models.py"
        and re.search(r"TariffLine", path.read_text(encoding="utf-8"))
        and path.relative_to(app_dir).as_posix() != "modules/compliance/service.py"
    ]
    assert offenders == []
