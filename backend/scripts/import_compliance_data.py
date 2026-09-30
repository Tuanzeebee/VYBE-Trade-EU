"""Nhập dòng thuế và quy tắc xuất xứ từ CSV do luật TM soạn — luôn vào DB ở trạng thái CHƯA DUYỆT.

    uv run python -m scripts.import_compliance_data tariff <file.csv> --actor <email> [--dry-run]
    uv run python -m scripts.import_compliance_data psr <file.csv> --actor <email> [--dry-run]

- Mẫu file: docs/roadmap/tariff_20_mau.csv và docs/roadmap/psr_20_mau.csv.
- Cột reviewed_by / reviewed_at (nếu có) BỊ BỎ QUA: người duyệt phải bấm duyệt trong hệ thống
  (audit ghi đúng tài khoản admin), file CSV không tự duyệt được dữ liệu.
- Kiểm tra toàn bộ file trước; sai dòng nào báo đúng số dòng đó và không ghi gì. Dòng đã có
  (cùng mã HS + nơi đến + ngày bắt đầu, hoặc cùng mã HS + ngày bắt đầu) được bỏ qua.
- Mọi dòng ghi qua compliance.admin_service nên có kiểm tra chéo và audit như nhập tay.
"""

import argparse
import asyncio
import csv
import datetime as dt
import io
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from app.core.errors import AppError
from app.modules.auth.service import get_admin_by_email
from app.modules.compliance import admin_service
from app.modules.compliance.admin_schemas import RooRuleIn, TariffLineIn
from app.modules.compliance.models import ProductSpecificRule, TariffLine
from scripts._console import use_utf8

_BOOLS = {"true": True, "false": False, "": None}


def _rows(path: Path) -> list[tuple[int, dict[str, str]]]:
    """(số dòng trong file, dòng dữ liệu) — bỏ dòng trống và dòng bắt đầu bằng dấu thăng."""
    numbered = [
        (n, line)
        for n, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), start=1)
        if line.strip() and not line.startswith("#")
    ]
    if not numbered:
        return []
    reader = csv.DictReader(io.StringIO("\n".join(line for _, line in numbered)))
    return [(numbered[i + 1][0], row) for i, row in enumerate(reader)]


def _text(row: dict[str, str], key: str) -> str | None:
    return (row.get(key) or "").strip() or None


def _flag(row: dict[str, str], key: str, default: bool) -> bool:
    raw = (row.get(key) or "").strip().lower()
    if raw not in _BOOLS:
        raise ValueError(f"{key} phải là true hoặc false")
    value = _BOOLS[raw]
    return default if value is None else value


def _date(row: dict[str, str], key: str) -> dt.date | None:
    raw = _text(row, key)
    return dt.date.fromisoformat(raw) if raw else None


def _reason(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        return "giá trị không hợp lệ (" + ", ".join(str(e["loc"][0]) for e in exc.errors()) + ")"
    return str(exc)


def parse_tariff(path: Path) -> list[tuple[int, TariffLineIn]]:
    parsed: list[tuple[int, TariffLineIn]] = []
    for line_no, row in _rows(path):
        try:
            data: dict[str, Any] = {
                "hs_code": _text(row, "hs_code") or "",
                "destination": _text(row, "destination") or "",
                "duty_type": _text(row, "duty_type") or "",
                "mfn_rate": _text(row, "mfn_rate"),
                "mfn_specific": _text(row, "mfn_specific"),
                "evfta_rate_current": _text(row, "evfta_rate_current"),
                "staging_category": _text(row, "staging_category"),
                "zero_from": _date(row, "zero_from"),
                "quota_required": _flag(row, "quota_required", False),
                "quota_note": _text(row, "quota_note"),
                "condition_note": _text(row, "condition_note"),
                "source_url": _text(row, "source_url"),
                "valid_from": _date(row, "valid_from"),
                "valid_until": _date(row, "valid_until"),
            }
            parsed.append((line_no, TariffLineIn(**data)))
        except (ValidationError, ValueError) as exc:
            raise ValueError(f"dòng {line_no}: {_reason(exc)}") from exc
    return parsed


def parse_psr(path: Path) -> list[tuple[int, RooRuleIn]]:
    parsed: list[tuple[int, RooRuleIn]] = []
    for line_no, row in _rows(path):
        try:
            data: dict[str, Any] = {
                "hs_code": _text(row, "hs_code") or "",
                "rule_type": _text(row, "rule_type") or "",
                "threshold_pct": _text(row, "threshold_pct"),
                "rule_text": _text(row, "rule_text"),
                "requires_expert": _flag(row, "requires_expert", False),
                "source": _text(row, "source"),
                "valid_from": _date(row, "valid_from"),
                "valid_until": _date(row, "valid_until"),
            }
            parsed.append((line_no, RooRuleIn(**data)))
        except (ValidationError, ValueError) as exc:
            raise ValueError(f"dòng {line_no}: {_reason(exc)}") from exc
    return parsed


async def import_tariff(
    session: AsyncSession, actor_email: str, rows: Sequence[tuple[int, TariffLineIn]], dry_run: bool
) -> tuple[int, int]:
    """Trả (số dòng thêm, số dòng bỏ qua vì đã có). dry_run: kiểm tra nhưng không ghi."""
    actor = await get_admin_by_email(session, actor_email)
    if actor is None:
        raise ValueError(f"không có tài khoản admin {actor_email}")
    added = skipped = 0
    for line_no, data in rows:
        exists = await session.scalar(
            select(TariffLine.id).where(
                TariffLine.hs_code == data.hs_code,
                TariffLine.destination == data.destination,
                TariffLine.valid_from == data.valid_from,
            )
        )
        if exists:
            skipped += 1
            continue
        try:
            await admin_service.create_tariff_line(session, actor, data, commit=False)
        except AppError as exc:
            await session.rollback()
            raise ValueError(f"dòng {line_no}: {exc.message}") from exc
        added += 1
    # Ghi một lần ở cuối: lỗi giữa chừng không để lại dòng nào (đã rollback ở trên).
    await (session.rollback() if dry_run else session.commit())
    return added, skipped


async def import_psr(
    session: AsyncSession, actor_email: str, rows: Sequence[tuple[int, RooRuleIn]], dry_run: bool
) -> tuple[int, int]:
    actor = await get_admin_by_email(session, actor_email)
    if actor is None:
        raise ValueError(f"không có tài khoản admin {actor_email}")
    added = skipped = 0
    for line_no, data in rows:
        exists = await session.scalar(
            select(ProductSpecificRule.id).where(
                ProductSpecificRule.hs_code == data.hs_code,
                ProductSpecificRule.valid_from == data.valid_from,
            )
        )
        if exists:
            skipped += 1
            continue
        try:
            await admin_service.create_roo_rule(session, actor, data, commit=False)
        except AppError as exc:
            await session.rollback()
            raise ValueError(f"dòng {line_no}: {exc.message}") from exc
        added += 1
    # Ghi một lần ở cuối: lỗi giữa chừng không để lại dòng nào (đã rollback ở trên).
    await (session.rollback() if dry_run else session.commit())
    return added, skipped


async def _run(kind: str, path: Path, actor: str, dry_run: bool) -> tuple[int, int]:
    async with get_sessionmaker()() as session:
        if kind == "tariff":
            return await import_tariff(session, actor, parse_tariff(path), dry_run)
        return await import_psr(session, actor, parse_psr(path), dry_run)


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("kind", choices=["tariff", "psr"])
    parser.add_argument("file", type=Path)
    parser.add_argument("--actor", required=True, help="email admin thực hiện (ghi audit)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))
    if not args.file.is_file():
        print(f"Không tìm thấy file: {args.file}", file=sys.stderr)
        return 1
    try:
        added, skipped = asyncio.run(_run(args.kind, args.file, args.actor, args.dry_run))
    except ValueError as exc:
        print(f"Lỗi dữ liệu: {exc}", file=sys.stderr)
        return 1
    verb = "sẽ thêm" if args.dry_run else "đã thêm"
    print(f"{verb} {added} dòng (chưa duyệt), bỏ qua {skipped} dòng đã có")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
