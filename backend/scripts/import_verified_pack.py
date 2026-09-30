"""Nạp file EVFTA_20_ma_da_xac_minh.xlsx vào DB — luôn CHƯA DUYỆT.

    uv run python -m scripts.import_verified_pack --actor <email admin> [--dry-run] [--file <xlsx>]

Nạp: 20 mã CN 8 số vào danh mục HS, 20 dòng thuế, 20 quy tắc xuất xứ, 60 dòng VAT (DE/FR/NL).
Admin phải duyệt từng nhóm trong màn hình quản trị thì dữ liệu mới ra công khai. Chạy lại không
nhân đôi dòng (bỏ qua dòng đã có). Ghi qua compliance.admin_service nên có kiểm tra chéo và audit.
"""

import argparse
import asyncio
import sys
from collections.abc import Sequence
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_sessionmaker
from app.core.errors import AppError
from app.modules.auth.service import get_admin_by_email
from app.modules.catalog.service import upsert_hs_codes
from app.modules.compliance import admin_service
from app.modules.compliance.admin_schemas import CountryTermIn
from app.modules.compliance.models import ImportCountryTerm
from scripts._console import use_utf8
from scripts.import_compliance_data import import_psr, import_tariff
from scripts.verified_pack import (
    DEFAULT_XLSX,
    Pack,
    hs_rows,
    load_pack,
    psr_rows,
    tariff_rows,
    term_rows,
)


async def import_terms(
    session: AsyncSession,
    actor_email: str,
    rows: Sequence[tuple[int, CountryTermIn]],
    dry_run: bool,
) -> tuple[int, int]:
    actor = await get_admin_by_email(session, actor_email)
    if actor is None:
        raise ValueError(f"không có tài khoản admin {actor_email}")
    added = skipped = 0
    for line_no, data in rows:
        exists = await session.scalar(
            select(ImportCountryTerm.id).where(
                ImportCountryTerm.hs_code == data.hs_code,
                ImportCountryTerm.country == data.country,
                ImportCountryTerm.valid_from == data.valid_from,
            )
        )
        if exists:
            skipped += 1
            continue
        try:
            await admin_service.create_country_term(session, actor, data, commit=False)
        except AppError as exc:
            await session.rollback()
            raise ValueError(f"dòng {line_no}: {exc.message}") from exc
        added += 1
    await (session.rollback() if dry_run else session.commit())
    return added, skipped


async def import_pack(
    session: AsyncSession, actor_email: str, pack: Pack, dry_run: bool
) -> dict[str, tuple[int, int]]:
    if dry_run:
        if await get_admin_by_email(session, actor_email) is None:
            raise ValueError(f"không có tài khoản admin {actor_email}")
        # Không ghi gì, kể cả danh mục HS (upsert_hs_codes luôn commit): chỉ đếm dòng hợp lệ,
        # schema đã kiểm khi dựng các dòng.
        return {
            "tariff": (len(tariff_rows(pack)), 0),
            "psr": (len(psr_rows(pack)), 0),
            "terms": (len(term_rows(pack)), 0),
        }
    await upsert_hs_codes(session, hs_rows(pack))  # danh mục HS phải có trước (khóa ngoại)
    return {
        "tariff": await import_tariff(session, actor_email, tariff_rows(pack), False),
        "psr": await import_psr(session, actor_email, psr_rows(pack), False),
        "terms": await import_terms(session, actor_email, term_rows(pack), False),
    }


async def _run(pack: Pack, actor: str, dry_run: bool) -> dict[str, tuple[int, int]]:
    async with get_sessionmaker()() as session:
        return await import_pack(session, actor, pack, dry_run)


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--actor", required=True, help="email admin thực hiện (ghi audit)")
    parser.add_argument("--file", type=Path, default=DEFAULT_XLSX)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))
    if not args.file.is_file():
        print(f"Không tìm thấy file: {args.file}", file=sys.stderr)
        return 1
    try:
        pack = load_pack(args.file)
        report = asyncio.run(_run(pack, args.actor, args.dry_run))
    except ValueError as exc:
        print(f"Lỗi dữ liệu: {exc}", file=sys.stderr)
        return 1
    withheld = [(r.cn_code, r.internal_note) for r in pack.rows if r.internal_note]
    if withheld:
        print("Ghi chú nội bộ KHÔNG nạp vào DB (người duyệt luật đọc, không hiển thị công khai):")
        for code, text in withheld:
            print(f"  {code}: {text}")
    verb = "sẽ thêm" if args.dry_run else "đã thêm"
    for name, (added, skipped) in report.items():
        print(f"{name}: {verb} {added} dòng (chưa duyệt), bỏ qua {skipped} dòng đã có")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
