"""Bộ nạp seed tuân thủ cho 20 mã đợt 1 (SPEC_compliance_data_20_codes §6.1).

    uv run python -m app.modules.compliance.seed load docs/seed/evfta_seed --data-version 2026-10-r1

- Kiểm TOÀN BỘ file trước; có lỗi thì báo hết và không ghi gì. Ghi trong một transaction.
- Idempotent: chạy lại không tạo dòng mới. Dòng đã có `reviewed_by` không bao giờ bị ghi đè.
- reviewed_by / reviewed_at trong file bị BỎ QUA: người duyệt phải đi qua cổng duyệt (§6.3).
- Thuế trong seed là phân số (0.12); DB lưu phần trăm như tariff_lines hiện có (12.0000).
- Giả định: seed không có ngày hiệu lực cho quy tắc/bằng chứng → dùng valid_from của dòng thuế
  cùng mã (01/08/2020, ngày EVFTA có hiệu lực).
"""

import argparse
import asyncio
import datetime as dt
import json
import sys
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, ValidationError
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.modules.catalog import service as catalog
from app.modules.catalog.schemas import HsCodeIn
from app.modules.compliance.models import (
    ComplianceEvidenceRequirement,
    ComplianceEvidenceType,
    DutyType,
    EvidenceBlocks,
    EvidenceCondition,
    EvidenceLayer,
    EvidenceLegalStatus,
    EvidenceScope,
    EvidenceTypeMapping,
    HsCodeCompliance,
    ProductSpecificRule,
    RooQuestion,
    RuleType,
    StagingCategory,
    TariffLine,
)
from app.modules.compliance.review_import import ReviewImportError, ReviewReport, import_review
from app.modules.compliance.rule_params import validate_params

_FILES = (
    "hs_codes",
    "tariff_lines",
    "staging_categories",
    "product_specific_rules",
    "roo_questions",
    "evidence_types",
    "evidence_requirements",
    "evidence_conditions",
)
_CATEGORY_BY_CHAPTER: dict[str, Any] = {
    "03": "seafood",
    "07": "fruits_vegetables",
    "08": "fruits_vegetables",
}
_HUNDRED = Decimal(100)
DEFAULT_MAPPINGS = (
    Path(__file__).resolve().parents[3] / "data" / "compliance_evidence_mappings_draft.json"
)


class SeedError(Exception):
    def __init__(self, errors: Sequence[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = list(errors)


class _Row(BaseModel):
    model_config = ConfigDict(extra="ignore")


class HsRow(_Row):
    cn_code_2012: str
    cn_code_current: str | None
    cn_mapping_verified: bool
    product_group_vi: str | None
    name_vi: str
    name_en: str | None
    evidence_group: str | None


class TariffRow(_Row):
    cn_code: str
    destination: str
    duty_type: DutyType | str
    base_rate: Decimal
    mfn_rate: Decimal
    mfn_source: str
    mfn_verified_taric: bool
    staging_category: str
    quota_required: bool
    quota_note: str | None
    condition_note: str | None
    source: str | None
    valid_from: dt.date
    valid_until: dt.date | None


class StagingRow(_Row):
    code: str
    stages: int
    zero_from: dt.date


class RuleRow(_Row):
    cn_code: str
    rule_type: RuleType
    rule_text_en: str | None
    rule_text_vi: str | None
    params: dict[str, Any]
    insufficient_operations_vi: str | None
    tolerance_note_vi: str | None
    risk_note_vi: str | None
    requires_expert: bool
    requires_expert_reason: str | None
    source: str | None


class QuestionRow(_Row):
    cn_code: str
    order: int
    text_vi: str


class EvidenceTypeRow(_Row):
    code: str
    layer: EvidenceLayer
    scope: EvidenceScope
    name_vi: str
    issuer_vi: str | None
    validity_months: int | None
    retention_years: int | None
    blocks: EvidenceBlocks
    legal_basis: str | None
    legal_status: EvidenceLegalStatus


class RequirementRow(_Row):
    cn_code: str
    evidence_type: str
    condition: EvidenceCondition
    layer: EvidenceLayer
    scope: EvidenceScope
    blocks: EvidenceBlocks
    legal_status: EvidenceLegalStatus


@dataclass
class SeedData:
    hs: list[HsRow]
    tariffs: list[TariffRow]
    staging: list[StagingRow]
    rules: list[tuple[RuleRow, dict[str, Any]]]
    questions: list[QuestionRow]
    evidence_types: list[EvidenceTypeRow]
    requirements: list[RequirementRow]


@dataclass
class TableReport:
    added: int = 0
    unchanged: int = 0
    changed: int = 0
    skipped_reviewed: int = 0
    superseded: int = 0
    unreviewed: int = 0


@dataclass
class SeedReport:
    data_version: str
    tables: dict[str, TableReport] = field(default_factory=dict)
    hs_codes_added_to_catalog: int = 0
    calculator_supported: int = 0

    def table(self, name: str) -> TableReport:
        return self.tables.setdefault(name, TableReport())


def _read(seed_dir: Path, name: str, errors: list[str]) -> list[dict[str, Any]]:
    path = seed_dir / f"{name}.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        errors.append(f"{path.name}: không đọc được ({exc})")
        return []
    if not isinstance(data, list):
        errors.append(f"{path.name}: phải là danh sách")
        return []
    return data


def _parse[T: BaseModel](
    model: type[T], rows: list[dict[str, Any]], name: str, errors: list[str]
) -> list[T]:
    out: list[T] = []
    for i, raw in enumerate(rows):
        try:
            out.append(model.model_validate(raw))
        except ValidationError as exc:
            errors.append(f"{name}[{i}]: {exc.errors()[0]['msg']} ({exc.errors()[0]['loc']})")
    return out


def read_seed(seed_dir: Path) -> SeedData:
    """Đọc và kiểm toàn bộ seed; mọi lỗi gom lại rồi báo một lần (không nạp một phần)."""
    errors: list[str] = []
    raw = {name: _read(seed_dir, name, errors) for name in _FILES}
    hs = _parse(HsRow, raw["hs_codes"], "hs_codes", errors)
    tariffs = _parse(TariffRow, raw["tariff_lines"], "tariff_lines", errors)
    staging = _parse(StagingRow, raw["staging_categories"], "staging_categories", errors)
    rule_rows = _parse(RuleRow, raw["product_specific_rules"], "product_specific_rules", errors)
    questions = _parse(QuestionRow, raw["roo_questions"], "roo_questions", errors)
    etypes = _parse(EvidenceTypeRow, raw["evidence_types"], "evidence_types", errors)
    reqs = _parse(RequirementRow, raw["evidence_requirements"], "evidence_requirements", errors)
    conditions = {r.get("code") for r in raw["evidence_conditions"]}

    rules: list[tuple[RuleRow, dict[str, Any]]] = []
    for r in rule_rows:
        try:
            rules.append((r, validate_params(r.rule_type.value, r.params)))
        except (ValueError, ValidationError) as exc:
            errors.append(f"product_specific_rules {r.cn_code}: params sai schema ({exc})")

    codes = {h.cn_code_2012 for h in hs}
    stages = {s.code for s in staging}
    type_by_code = {t.code: t for t in etypes}
    for label, items in (
        ("tariff_lines", [t.cn_code for t in tariffs]),
        ("product_specific_rules", [r.cn_code for r in rule_rows]),
        ("roo_questions", [q.cn_code for q in questions]),
        ("evidence_requirements", [q.cn_code for q in reqs]),
    ):
        errors += [f"{label}: mã {c} không có trong hs_codes" for c in sorted(set(items) - codes)]
    errors += [
        f"tariff_lines {t.cn_code}: nhóm lộ trình {t.staging_category} không có"
        for t in tariffs
        if t.staging_category not in stages
    ]
    for label, keys in (
        ("hs_codes", [h.cn_code_2012 for h in hs]),
        ("tariff_lines", [t.cn_code for t in tariffs]),
        ("product_specific_rules", [r.cn_code for r in rule_rows]),
        ("evidence_types", [t.code for t in etypes]),
        ("roo_questions", [(q.cn_code, q.order) for q in questions]),
        ("evidence_requirements", [(q.cn_code, q.evidence_type, q.condition) for q in reqs]),
    ):
        errors += [f"{label}: trùng khoá {k}" for k, n in Counter(keys).items() if n > 1]
    for q in reqs:
        t = type_by_code.get(q.evidence_type)
        if t is None:
            errors.append(f"evidence_requirements {q.cn_code}: loại {q.evidence_type} không có")
        elif (t.layer, t.scope, t.blocks, t.legal_status) != (
            q.layer,
            q.scope,
            q.blocks,
            q.legal_status,
        ):
            errors.append(
                f"evidence_requirements {q.cn_code}/{q.evidence_type}: lệch evidence_types"
            )
        if q.condition.value not in conditions:
            errors.append(f"evidence_requirements: điều kiện {q.condition} ngoài danh sách đóng")
    if errors:
        raise SeedError(errors)
    return SeedData(hs, tariffs, staging, rules, questions, etypes, reqs)


async def _upsert[M](
    session: AsyncSession,
    report: TableReport,
    existing: M | None,
    values: dict[str, Any],
    create: type[M],
) -> M:
    """Thêm mới; có sẵn thì chỉ cập nhật khi CHƯA duyệt và có thay đổi (không ghi đè dòng duyệt)."""
    if existing is None:
        row = create(**values)
        session.add(row)
        report.added += 1
        report.unreviewed += 1
        return row
    if getattr(existing, "reviewed_by", None) is not None:
        report.skipped_reviewed += 1
        return existing
    report.unreviewed += 1
    diff = {k: v for k, v in values.items() if getattr(existing, k) != v}
    if diff:
        for k, v in diff.items():
            setattr(existing, k, v)
        report.changed += 1
    else:
        report.unchanged += 1
    return existing


_VERSION_META = frozenset({"valid_from", "valid_until", "data_version"})


async def _upsert_versioned[M](
    session: AsyncSession,
    report: TableReport,
    model: Any,
    scope: list[Any],
    values: dict[str, Any],
    entity: str,
    today: dt.date,
) -> None:
    """Nạp dòng có hiệu lực (SPEC §6.1): không bao giờ ghi đè dòng ĐÃ duyệt.

    Dòng đã duyệt có nội dung khác seed → tạo phiên bản mới (chưa duyệt, hiệu lực từ hôm nay) và đặt
    valid_until cho dòng cũ; trùng nội dung → bỏ qua. Dòng chưa duyệt đang hiệu lực: sửa tại chỗ."""
    rows: list[Any] = list(
        await session.scalars(
            select(model).where(
                *scope,
                model.valid_from <= today,
                or_(model.valid_until.is_(None), model.valid_until > today),
            )
        )
    )
    compare = {k: v for k, v in values.items() if k not in _VERSION_META}

    def differs(row: Any) -> bool:
        return any(getattr(row, k) != v for k, v in compare.items())

    reviewed = [r for r in rows if r.reviewed_by is not None]
    drafts = [r for r in rows if r.reviewed_by is None]
    superseded = [r for r in reviewed if differs(r)]

    if drafts:
        report.unreviewed += 1
        # valid_from/valid_until của dòng nháp không đổi (tránh đổi hiệu lực mỗi lần nạp)
        diff = {
            k: v
            for k, v in values.items()
            if k not in ("valid_from", "valid_until") and getattr(drafts[0], k) != v
        }
        for k, v in diff.items():
            setattr(drafts[0], k, v)
        report.changed += bool(diff)
        report.unchanged += not diff
    elif reviewed and not superseded:
        report.skipped_reviewed += 1
        return
    else:
        # Thay dòng đã duyệt: hiệu lực từ hôm nay; không có dòng cũ: giữ ngày hiệu lực của seed.
        valid_from = max(values["valid_from"], today) if superseded else values["valid_from"]
        session.add(model(**{**values, "valid_from": valid_from}))
        report.added += 1
        report.unreviewed += 1

    for old in superseded:
        before = {"valid_until": None if old.valid_until is None else old.valid_until.isoformat()}
        old.valid_until = max(today, old.valid_from + dt.timedelta(days=1))
        report.superseded += 1
        await record(
            session,
            actor_id=None,
            action_type=f"{entity}.superseded_by_seed",
            entity_type=entity,
            entity_id=str(old.id),
            before=before,
            after={"valid_until": old.valid_until.isoformat()},
        )


def _pct(value: Decimal) -> Decimal:
    return (value * _HUNDRED).quantize(Decimal("0.0001"))


def _read_mappings(path: Path) -> list[dict[str, Any]]:
    try:
        items = json.loads(path.read_text(encoding="utf-8"))["mappings"]
    except (OSError, ValueError, KeyError) as exc:
        raise SeedError([f"{path.name}: không đọc được ({exc})"]) from exc
    return items  # type: ignore[no-any-return]


async def _load_mappings(
    session: AsyncSession, path: Path, known_types: set[str], data_version: str, report: SeedReport
) -> None:
    """Ánh xạ loại bằng chứng compliance → verification (đề xuất, chưa duyệt)."""
    items = _read_mappings(path)
    unknown = sorted({m["compliance_code"] for m in items} - known_types)
    if unknown:
        raise SeedError([f"{path.name}: loại bằng chứng không có trong seed: {unknown}"])
    for m in items:
        existing = await session.get(EvidenceTypeMapping, m["compliance_code"])
        await _upsert(
            session,
            report.table("evidence_type_mappings"),
            existing,
            {
                "compliance_code": m["compliance_code"],
                "verification_code": m["verification_code"],
                "note": m.get("note"),
                "data_version": data_version,
            },
            EvidenceTypeMapping,
        )


async def load_seed(
    session: AsyncSession,
    seed_dir: Path,
    data_version: str,
    mappings_path: Path | None = DEFAULT_MAPPINGS,
) -> SeedReport:
    """Nạp seed vào `session` (không commit — người gọi quyết định commit/rollback)."""
    data = read_seed(seed_dir)
    report = SeedReport(data_version=data_version)
    valid_from_by_code = {t.cn_code: t.valid_from for t in data.tariffs}

    report.hs_codes_added_to_catalog = await catalog.ensure_hs_codes(
        session,
        [
            HsCodeIn(
                code=h.cn_code_2012,
                name_vi=h.name_vi,
                name_en=h.name_en or h.name_vi,
                category=_CATEGORY_BY_CHAPTER.get(h.cn_code_2012[:2]),
            )
            for h in data.hs
        ],
    )

    for h in data.hs:
        t = report.table("hs_code_compliance")
        row = await session.get(HsCodeCompliance, h.cn_code_2012)
        values: dict[str, Any] = {
            "hs_code": h.cn_code_2012,
            "cn_code_current": h.cn_code_current,
            "cn_mapping_verified": h.cn_mapping_verified,
            "product_group_vi": h.product_group_vi,
            "evidence_group": h.evidence_group,
            "data_version": data_version,
        }
        if row is None:
            session.add(HsCodeCompliance(**values))
            t.added += 1
        else:
            diff = {k: v for k, v in values.items() if getattr(row, k) != v}
            for k, v in diff.items():
                setattr(row, k, v)
            t.changed += bool(diff)
            t.unchanged += not diff
        if not h.cn_mapping_verified:
            t.unreviewed += 1

    for s in data.staging:
        t = report.table("staging_categories")
        stage_row = await session.get(StagingCategory, s.code)
        stage_values: dict[str, Any] = {
            "stages": s.stages,
            "zero_from": s.zero_from,
            "data_version": data_version,
        }
        if stage_row is None:
            session.add(StagingCategory(code=s.code, **stage_values))
            t.added += 1
        else:
            diff = {k: v for k, v in stage_values.items() if getattr(stage_row, k) != v}
            for k, v in diff.items():
                setattr(stage_row, k, v)
            t.changed += bool(diff)
            t.unchanged += not diff

    today = dt.datetime.now(dt.UTC).date()
    for tr in data.tariffs:
        await _upsert_versioned(
            session,
            report.table("tariff_lines"),
            TariffLine,
            [
                TariffLine.hs_code == tr.cn_code,
                TariffLine.destination == tr.destination,
                TariffLine.agreement_code == "EVFTA",
            ],
            {
                "hs_code": tr.cn_code,
                "destination": tr.destination,
                "agreement_code": "EVFTA",
                "duty_type": DutyType(str(tr.duty_type).lower()),
                "base_rate": _pct(tr.base_rate),
                "mfn_rate": _pct(tr.mfn_rate),
                "mfn_source": tr.mfn_source,
                "mfn_verified_taric": tr.mfn_verified_taric,
                "staging_category": tr.staging_category,
                "quota_required": tr.quota_required,
                "quota_note": tr.quota_note,
                "condition_note": tr.condition_note,
                "source_url": tr.source,
                "valid_from": tr.valid_from,
                "valid_until": tr.valid_until,
                "data_version": data_version,
            },
            "tariff_line",
            today,
        )

    for rr, params in data.rules:
        await _upsert_versioned(
            session,
            report.table("product_specific_rules"),
            ProductSpecificRule,
            [ProductSpecificRule.hs_code == rr.cn_code],
            {
                "hs_code": rr.cn_code,
                "rule_type": rr.rule_type,
                "threshold_pct": None,
                "rule_text": rr.rule_text_vi,
                "rule_text_en": rr.rule_text_en,
                "params": params,
                "insufficient_operations_vi": rr.insufficient_operations_vi,
                "tolerance_note_vi": rr.tolerance_note_vi,
                "risk_note_vi": rr.risk_note_vi,
                "requires_expert": rr.requires_expert,
                "requires_expert_reason": rr.requires_expert_reason,
                "source": rr.source,
                "valid_from": valid_from_by_code[rr.cn_code],
                "data_version": data_version,
            },
            "product_specific_rule",
            today,
        )

    for q in data.questions:
        t = report.table("roo_questions")
        row = await session.scalar(
            select(RooQuestion).where(
                RooQuestion.hs_code == q.cn_code, RooQuestion.position == q.order
            )
        )
        if row is None:
            session.add(
                RooQuestion(
                    hs_code=q.cn_code,
                    position=q.order,
                    text_vi=q.text_vi,
                    data_version=data_version,
                )
            )
            t.added += 1
        elif row.text_vi != q.text_vi:
            row.text_vi, row.data_version = q.text_vi, data_version
            t.changed += 1
        else:
            t.unchanged += 1

    default_from = min(valid_from_by_code.values())
    for et in data.evidence_types:
        existing_type = await session.get(ComplianceEvidenceType, et.code)
        await _upsert(
            session,
            report.table("compliance_evidence_types"),
            existing_type,
            {
                "code": et.code,
                "layer": et.layer,
                "scope": et.scope,
                "name_vi": et.name_vi,
                "issuer_vi": et.issuer_vi,
                "validity_months": et.validity_months,
                "retention_years": et.retention_years,
                "blocks": et.blocks,
                "legal_basis": et.legal_basis,
                "legal_status": et.legal_status,
                "valid_from": default_from,
                "data_version": data_version,
            },
            ComplianceEvidenceType,
        )
    await session.flush()

    for rq in data.requirements:
        valid_from = valid_from_by_code[rq.cn_code]
        existing_req = await session.scalar(
            select(ComplianceEvidenceRequirement).where(
                ComplianceEvidenceRequirement.hs_code == rq.cn_code,
                ComplianceEvidenceRequirement.evidence_type == rq.evidence_type,
                ComplianceEvidenceRequirement.condition == rq.condition,
                ComplianceEvidenceRequirement.valid_from == valid_from,
            )
        )
        await _upsert(
            session,
            report.table("compliance_evidence_requirements"),
            existing_req,
            {
                "hs_code": rq.cn_code,
                "evidence_type": rq.evidence_type,
                "condition": rq.condition,
                "valid_from": valid_from,
                "data_version": data_version,
            },
            ComplianceEvidenceRequirement,
        )
    await session.flush()

    if mappings_path is not None:
        await _load_mappings(
            session, mappings_path, {t.code for t in data.evidence_types}, data_version, report
        )
        await session.flush()

    # §6.2: có dòng thuế và quy tắc còn hiệu lực thì mã được hỗ trợ, không xét trạng thái duyệt
    supported = sorted({t.cn_code for t in data.tariffs} & {r.cn_code for r, _ in data.rules})
    await catalog.set_calculator_supported(session, supported)
    report.calculator_supported = len(supported)
    return report


def format_report(report: SeedReport) -> str:
    lines = [f"data-version {report.data_version}"]
    for name, t in report.tables.items():
        lines.append(
            f"  {name}: thêm {t.added}, đổi {t.changed}, giữ nguyên {t.unchanged}, "
            f"bỏ qua (đã duyệt, trùng) {t.skipped_reviewed}, thay dòng đã duyệt {t.superseded}, "
            f"chưa duyệt {t.unreviewed}"
        )
    lines.append(f"  hs_codes thêm vào danh mục: {report.hs_codes_added_to_catalog}")
    lines.append(f"  mã được máy tính hỗ trợ: {report.calculator_supported}")
    return "\n".join(lines)


def _format_review(report: ReviewReport) -> str:
    return (
        f"duyệt {report.approved}, đã duyệt từ trước {report.already_reviewed}, "
        f"kết thúc hiệu lực {report.ended} (đã kết thúc {report.already_ended}), "
        f"hàng đợi admin: mới {report.issues_created}, đã có {report.issues_existing}"
    )


async def _import_review(workbook: Path, reviewer_email: str) -> int:
    from app.core.db import get_sessionmaker
    from app.core.errors import AppError

    try:
        data = await asyncio.to_thread(workbook.read_bytes)
        async with get_sessionmaker()() as session:
            report = await import_review(session, data, reviewer_email)
            await session.commit()
    except OSError as error:
        print(f"Không đọc được file: {error}", file=sys.stderr)
        return 1
    except ReviewImportError as exc:
        print("File duyệt không hợp lệ, KHÔNG ghi gì:", file=sys.stderr)
        for e in exc.errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    except AppError as exc:
        print(f"Lỗi: {exc}", file=sys.stderr)
        return 1
    print(_format_review(report))
    return 0


async def _main(argv: Sequence[str]) -> int:
    import app.main  # noqa: F401  (nạp mọi model để mapper tìm đủ khoá ngoại)
    from app.core.db import get_sessionmaker

    parser = argparse.ArgumentParser(prog="python -m app.modules.compliance.seed")
    sub = parser.add_subparsers(dest="command", required=True)
    load = sub.add_parser("load", help="nạp seed (một transaction, idempotent)")
    load.add_argument("seed_dir", type=Path)
    load.add_argument("--data-version", required=True)
    review = sub.add_parser("import-review", help="nhập kết quả duyệt của luật sư (.xlsx)")
    review.add_argument("workbook", type=Path)
    review.add_argument("--reviewer-email", required=True)
    args = parser.parse_args(argv)
    if args.command == "import-review":
        return await _import_review(args.workbook, args.reviewer_email)

    try:
        async with get_sessionmaker()() as session:
            report = await load_seed(session, args.seed_dir, args.data_version)
            await session.commit()
    except SeedError as exc:
        print("Seed không hợp lệ, KHÔNG ghi gì:", file=sys.stderr)
        for e in exc.errors:
            print(f"  - {e}", file=sys.stderr)
        return 1
    print(format_report(report))
    return 0


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        getattr(stream, "reconfigure", lambda **_: None)(encoding="utf-8")
    raise SystemExit(asyncio.run(_main(sys.argv[1:])))
