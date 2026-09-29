"""scripts/import_compliance_data: CSV luật TM → dòng thuế / quy tắc CHƯA DUYỆT."""

import datetime as dt
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.compliance.models import ProductSpecificRule, TariffLine
from app.modules.compliance.service import find_lines, find_rules
from scripts.import_compliance_data import import_psr, import_tariff, parse_psr, parse_tariff

pytestmark = pytest.mark.usefixtures("hs_seeded")

ADMIN = "luat-tm@evfta.eu"
TODAY = dt.datetime.now(dt.UTC).date()
FROM = (TODAY - dt.timedelta(days=30)).isoformat()

TARIFF_HEADER = (
    "hs_code,name_en,destination,duty_type,mfn_rate,mfn_specific,evfta_rate_current,staging_category,"
    "zero_from,quota_required,quota_note,condition_note,source_url,valid_from,valid_until,"
    "expected_status,reviewed_by,reviewed_at"
)
PSR_HEADER = (
    "hs_code,name_en,rule_type,threshold_pct,requires_expert,rule_text,source,valid_from,valid_until,"
    "reviewed_by,reviewed_at"
)


def write(tmp_path: Path, header: str, *lines: str) -> Path:
    path = tmp_path / "data.csv"
    path.write_text(
        "# ghi chú đầu file\n" + header + "\n" + "\n".join(lines) + "\n", encoding="utf-8"
    )
    return path


def tariff_line(**over: str) -> str:
    v = {
        "hs_code": "090121",
        "name_en": "Coffee",
        "destination": "EU",
        "duty_type": "ad_valorem",
        "mfn_rate": "7.5",
        "mfn_specific": "",
        "evfta_rate_current": "0",
        "staging_category": "A",
        "zero_from": "2020-08-01",
        "quota_required": "false",
        "quota_note": "",
        "condition_note": "cần EUR.1",
        "source_url": "https://example.test",
        "valid_from": FROM,
        "valid_until": "",
        "expected_status": "ok",
        "reviewed_by": "",
        "reviewed_at": "",
    }
    v.update(over)
    return ",".join(f'"{x}"' if "," in x else x for x in v.values())


async def count(session: AsyncSession, model: type) -> int:
    return int(await session.scalar(select(func.count()).select_from(model)) or 0)


async def test_tariff_rows_are_imported_unreviewed(
    db_session: AsyncSession, reviewer_id: object, tmp_path: Path
) -> None:
    path = write(
        tmp_path, TARIFF_HEADER, tariff_line(), tariff_line(hs_code="090111", mfn_rate="0")
    )
    added, skipped = await import_tariff(db_session, ADMIN, parse_tariff(path), dry_run=False)
    assert (added, skipped) == (2, 0)
    rows = (await db_session.scalars(select(TariffLine))).all()
    assert all(r.reviewed_by is None and r.reviewed_at is None for r in rows)
    assert (
        await find_lines(db_session, "090121", "EU", TODAY) == []
    )  # chưa duyệt → chưa ra công khai


async def test_reviewed_columns_in_csv_are_ignored(
    db_session: AsyncSession, reviewer_id: object, tmp_path: Path
) -> None:
    line = tariff_line(reviewed_by="ai-do@example.test", reviewed_at="2026-09-30T00:00:00Z")
    await import_tariff(
        db_session, ADMIN, parse_tariff(write(tmp_path, TARIFF_HEADER, line)), False
    )
    row = (await db_session.scalars(select(TariffLine))).one()
    assert (row.reviewed_by, row.reviewed_at) == (None, None)


async def test_import_writes_audit_with_the_actor(
    db_session: AsyncSession, reviewer_id: object, tmp_path: Path
) -> None:
    await import_tariff(
        db_session, ADMIN, parse_tariff(write(tmp_path, TARIFF_HEADER, tariff_line())), False
    )
    audit = (
        (
            await db_session.execute(
                select(AuditLog).where(AuditLog.action_type == "tariff_line.create")
            )
        )
        .scalars()
        .one()
    )
    assert audit.actor_id == reviewer_id


async def test_dry_run_writes_nothing(
    db_session: AsyncSession, reviewer_id: object, tmp_path: Path
) -> None:
    path = write(tmp_path, TARIFF_HEADER, tariff_line())
    added, _ = await import_tariff(db_session, ADMIN, parse_tariff(path), dry_run=True)
    assert added == 1
    assert await count(db_session, TariffLine) == 0


async def test_rerun_skips_existing_rows(
    db_session: AsyncSession, reviewer_id: object, tmp_path: Path
) -> None:
    path = write(tmp_path, TARIFF_HEADER, tariff_line())
    assert await import_tariff(db_session, ADMIN, parse_tariff(path), False) == (1, 0)
    assert await import_tariff(db_session, ADMIN, parse_tariff(path), False) == (0, 1)
    assert await count(db_session, TariffLine) == 1


async def test_unknown_hs_reports_line_and_writes_nothing(
    db_session: AsyncSession, reviewer_id: object, tmp_path: Path
) -> None:
    path = write(tmp_path, TARIFF_HEADER, tariff_line(), tariff_line(hs_code="999999"))
    with pytest.raises(ValueError, match="dòng 4"):
        await import_tariff(db_session, ADMIN, parse_tariff(path), False)
    assert await count(db_session, TariffLine) == 0


@pytest.mark.parametrize(
    ("over", "line_hint"),
    [
        ({"mfn_rate": "abc"}, "mfn_rate"),
        ({"mfn_rate": "101"}, "mfn_rate"),
        ({"duty_type": "other"}, "duty_type"),
        ({"quota_required": "maybe"}, "quota_required"),
        ({"valid_from": "không-phải-ngày"}, ""),
        ({"destination": "US"}, "destination"),
    ],
)
def test_bad_values_are_reported_with_line_number(
    tmp_path: Path, over: dict[str, str], line_hint: str
) -> None:
    path = write(tmp_path, TARIFF_HEADER, tariff_line(), tariff_line(**over))
    with pytest.raises(ValueError, match="dòng 4") as exc:
        parse_tariff(path)
    assert line_hint in str(exc.value)


async def test_unknown_actor_is_rejected(db_session: AsyncSession, tmp_path: Path) -> None:
    path = write(tmp_path, TARIFF_HEADER, tariff_line())
    with pytest.raises(ValueError, match="admin"):
        await import_tariff(db_session, "khong-co@evfta.eu", parse_tariff(path), False)


# ── PSR ─────────────────────────────────────────────────────────────────────
def psr_line(**over: str) -> str:
    v = {
        "hs_code": "090121",
        "name_en": "Coffee",
        "rule_type": "MaxNOM",
        "threshold_pct": "70",
        "requires_expert": "false",
        "rule_text": "synthetic",
        "source": "synthetic",
        "valid_from": FROM,
        "valid_until": "",
        "reviewed_by": "",
        "reviewed_at": "",
    }
    v.update(over)
    return ",".join(v.values())


async def test_psr_rows_are_imported_unreviewed_and_not_used(
    db_session: AsyncSession, reviewer_id: object, tmp_path: Path
) -> None:
    path = write(
        tmp_path,
        PSR_HEADER,
        psr_line(),
        psr_line(hs_code="030617", rule_type="WO", threshold_pct=""),
    )
    assert await import_psr(db_session, ADMIN, parse_psr(path), False) == (2, 0)
    rows = (await db_session.scalars(select(ProductSpecificRule))).all()
    assert all(r.reviewed_by is None for r in rows)
    assert await find_rules(db_session, "090121", TODAY) == []


async def test_psr_threshold_must_match_rule_type(
    db_session: AsyncSession, reviewer_id: object, tmp_path: Path
) -> None:
    path = write(tmp_path, PSR_HEADER, psr_line(rule_type="WO"))  # WO không được có ngưỡng
    with pytest.raises(ValueError, match="dòng 3"):
        await import_psr(db_session, ADMIN, parse_psr(path), False)
    assert await count(db_session, ProductSpecificRule) == 0
