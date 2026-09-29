import datetime as dt
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.verification.models import EvidenceType
from scripts.seed_evidence_types import DEFAULT_CSV, load_csv, seed_types


def test_draft_csv_is_valid_and_has_the_backlog_types() -> None:
    codes = {r.code for r in load_csv(DEFAULT_CSV)}
    assert {"eur1_issued", "origin_self_declaration", "aromatic_rice_nd103", "eudr_file"} <= codes
    assert {"iso_9001", "haccp", "bsci", "ce_marking", "lab_test_report"} <= codes
    assert len(codes) == len(load_csv(DEFAULT_CSV))  # không trùng mã


def test_only_origin_types_have_validity_months() -> None:
    rows = {r.code: r for r in load_csv(DEFAULT_CSV)}
    assert rows["eur1_issued"].validity_months == 12
    assert rows["origin_self_declaration"].validity_months == 12
    assert all(r.validity_months is None for c, r in rows.items() if r.group != "origin")


async def test_seeded_types_are_unreviewed(db_session: AsyncSession) -> None:
    added = await seed_types(db_session, load_csv(DEFAULT_CSV))
    assert added == len(load_csv(DEFAULT_CSV))
    rows = (await db_session.scalars(select(EvidenceType))).all()
    assert rows and all(r.reviewed_by is None and r.reviewed_at is None for r in rows)


async def test_seed_is_idempotent_and_never_overwrites_reviewed_rows(
    db_session: AsyncSession, reviewer_id: object
) -> None:
    await seed_types(db_session, load_csv(DEFAULT_CSV))
    row = await db_session.get(EvidenceType, "iso_9001")
    assert row is not None
    row.reviewed_by = reviewer_id  # type: ignore[assignment]
    row.reviewed_at = dt.datetime.now(dt.UTC)
    row.name_vi = "Tên do luật TM sửa"
    await db_session.flush()
    assert await seed_types(db_session, load_csv(DEFAULT_CSV)) == 0
    again = await db_session.get(EvidenceType, "iso_9001")
    assert again is not None and (again.reviewed_by, again.name_vi) == (
        reviewer_id,
        "Tên do luật TM sửa",
    )


def test_bad_line_reports_line_number(tmp_path: Path) -> None:
    bad = tmp_path / "bad.csv"
    bad.write_text(
        "# ghi chú\ncode,name_vi,name_en,group,validity_months,source\nBAD CODE,a,b,c,,\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="dòng 3"):
        load_csv(bad)
