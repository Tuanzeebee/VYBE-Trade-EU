"""SPEC_compliance_data_20_codes §6.1 / §9: bộ nạp seed 20 mã đợt 1.

- Nạp seed 2026-10-r1 báo đúng 20 mã, 20 dòng thuế, 20 quy tắc, 16 loại bằng chứng, 199 dòng yêu cầu.
- Idempotent; không ghi đè dòng đã duyệt; seed sai schema thì không ghi gì.
"""

import datetime as dt
import json
import shutil
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.auth.service import create_admin
from app.modules.catalog.service import get_hs_code
from app.modules.compliance.models import (
    ComplianceEvidenceRequirement,
    ComplianceEvidenceType,
    ProductSpecificRule,
    RooQuestion,
    StagingCategory,
    TariffLine,
)
from app.modules.compliance.rule_params import validate_params
from app.modules.compliance.seed import SeedError, load_seed, read_seed

SEED_DIR = Path(__file__).resolve().parents[5] / "docs" / "seed" / "evfta_seed"
VERSION = "2026-10-r1"


async def _count(session: AsyncSession, model: type) -> int:
    return int(await session.scalar(select(func.count()).select_from(model)) or 0)


async def test_load_reports_expected_counts(db_session: AsyncSession) -> None:
    report = await load_seed(db_session, SEED_DIR, VERSION)
    t = report.tables
    assert t["hs_code_compliance"].added == 20
    assert t["tariff_lines"].added == 20
    assert t["product_specific_rules"].added == 20
    assert t["compliance_evidence_types"].added == 16
    assert t["compliance_evidence_requirements"].added == 199
    assert t["staging_categories"].added == 4
    # toàn bộ seed chưa duyệt
    assert t["tariff_lines"].unreviewed == 20
    assert t["compliance_evidence_requirements"].unreviewed == 199
    assert report.calculator_supported == 20


async def test_all_20_codes_calculator_supported_regardless_of_review(
    db_session: AsyncSession,
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    for item in read_seed(SEED_DIR).hs:
        hs = await get_hs_code(db_session, item.cn_code_2012)
        assert hs is not None and hs.supported, item.cn_code_2012


async def test_rates_stored_as_percent_decimal(db_session: AsyncSession) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    line = await db_session.scalar(select(TariffLine).where(TariffLine.hs_code == "03046200"))
    assert line is not None
    assert line.base_rate == Decimal("5.5000") and line.mfn_rate == Decimal("5.5000")
    assert line.staging_category == "B3" and line.mfn_verified_taric is False
    assert line.reviewed_by is None


async def test_reload_same_version_is_idempotent(db_session: AsyncSession) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    before = {
        m: await _count(db_session, m)
        for m in (
            TariffLine,
            ProductSpecificRule,
            RooQuestion,
            ComplianceEvidenceType,
            ComplianceEvidenceRequirement,
            StagingCategory,
        )
    }
    again = await load_seed(db_session, SEED_DIR, VERSION)
    assert all(t.added == 0 and t.changed == 0 for t in again.tables.values())
    for model, n in before.items():
        assert await _count(db_session, model) == n


async def test_reload_never_overwrites_reviewed_rows(db_session: AsyncSession) -> None:
    """SPEC §6.1: dòng đã duyệt không bị ghi đè; seed khác nội dung → phiên bản mới (chưa duyệt), dòng
    cũ đặt valid_until; seed trùng nội dung → bỏ qua."""
    await load_seed(db_session, SEED_DIR, VERSION)
    reviewer = await create_admin(db_session, "luat-tm@evfta.eu", "correct-horse-battery")
    line = await db_session.scalar(select(TariffLine).where(TariffLine.hs_code == "03061792"))
    other = await db_session.scalar(select(TariffLine).where(TariffLine.hs_code == "03046200"))
    req = await db_session.scalar(select(ComplianceEvidenceRequirement).limit(1))
    assert line is not None and other is not None and req is not None
    now = dt.datetime.now(dt.UTC)
    line.reviewed_by, line.reviewed_at, line.mfn_rate = reviewer, now, Decimal("9.0000")
    other.reviewed_by, other.reviewed_at = reviewer, now  # nội dung trùng seed
    req.reviewed_by, req.reviewed_at = reviewer, now
    await db_session.flush()

    report = await load_seed(db_session, SEED_DIR, "2026-10-r2")
    await db_session.refresh(line)
    await db_session.refresh(other)
    # dòng đã duyệt còn nguyên nội dung, chỉ bị đặt hết hiệu lực
    assert line.mfn_rate == Decimal("9.0000") and line.reviewed_by == reviewer
    assert line.valid_until is not None and line.valid_until > line.valid_from
    versions = list(
        await db_session.scalars(select(TariffLine).where(TariffLine.hs_code == "03061792"))
    )
    new = next(v for v in versions if v.id != line.id)
    assert new.reviewed_by is None and new.mfn_rate == Decimal("12.0000")
    assert new.valid_from == dt.datetime.now(dt.UTC).date() and new.valid_until is None
    # nội dung trùng seed thì giữ nguyên, không tạo phiên bản
    assert other.valid_until is None
    assert report.tables["tariff_lines"].superseded == 1
    assert report.tables["tariff_lines"].skipped_reviewed == 1
    assert report.tables["compliance_evidence_requirements"].skipped_reviewed == 1
    audit = await db_session.scalar(
        select(AuditLog).where(AuditLog.action_type == "tariff_line.superseded_by_seed")
    )
    assert audit is not None and audit.entity_id == str(line.id)
    # nạp lại lần nữa: không thêm phiên bản nào nữa
    again = await load_seed(db_session, SEED_DIR, "2026-10-r2")
    assert again.tables["tariff_lines"].superseded == 0 and again.tables["tariff_lines"].added == 0


async def test_unreviewed_row_updated_by_new_version(db_session: AsyncSession) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    line = await db_session.scalar(select(TariffLine).where(TariffLine.hs_code == "03061792"))
    assert line is not None
    line.mfn_rate = Decimal("1.0000")
    await db_session.flush()
    report = await load_seed(db_session, SEED_DIR, "2026-10-r2")
    await db_session.refresh(line)
    assert line.mfn_rate == Decimal("12.0000") and line.data_version == "2026-10-r2"
    assert (
        report.tables["tariff_lines"].changed == 20
    )  # data_version mới gắn cho mọi dòng chưa duyệt


def _copy_seed(tmp_path: Path) -> Path:
    dest = tmp_path / "seed"
    shutil.copytree(SEED_DIR, dest, ignore=shutil.ignore_patterns("*.xlsx", "*.md"))
    return dest


async def test_bad_params_aborts_without_partial_load(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    seed = _copy_seed(tmp_path)
    path = seed / "product_specific_rules.json"
    rules = json.loads(path.read_text(encoding="utf-8"))
    rules[0]["params"] = {"unexpected": 1}
    path.write_text(json.dumps(rules), encoding="utf-8")
    with pytest.raises(SeedError) as exc:
        await load_seed(db_session, seed, VERSION)
    assert "params sai schema" in str(exc.value)
    assert await _count(db_session, TariffLine) == 0
    assert await _count(db_session, ComplianceEvidenceType) == 0


async def test_unknown_reference_and_condition_reported_together(
    db_session: AsyncSession, tmp_path: Path
) -> None:
    seed = _copy_seed(tmp_path)
    path = seed / "evidence_requirements.json"
    reqs = json.loads(path.read_text(encoding="utf-8"))
    reqs[0]["cn_code"] = "99999999"
    reqs[1]["condition"] = "TUY_Y"
    path.write_text(json.dumps(reqs), encoding="utf-8")
    with pytest.raises(SeedError) as exc:
        await load_seed(db_session, seed, VERSION)
    assert len(exc.value.errors) >= 2


def test_params_schema_per_rule_type() -> None:
    assert validate_params("WO_PRODUCT", {}) == {}
    assert validate_params("WO_PRODUCT_VESSEL", {"vessel_min_ownership_pct": "50"}) == {
        "vessel_min_ownership_pct": "50"
    }
    with pytest.raises(ValueError):
        validate_params("WO_PRODUCT", {"x": 1})
    with pytest.raises(ValueError):
        validate_params("WO_MATERIALS_SUGAR_CAP", {"tolerance_pct": "10"})
    with pytest.raises(ValueError):
        validate_params("NO_SUCH_TYPE", {})
