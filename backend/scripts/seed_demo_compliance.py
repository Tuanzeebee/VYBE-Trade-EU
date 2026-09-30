"""Nạp dữ liệu tuân thủ MINH HOẠ (U14, AGENTS.md §6.2 sửa đổi) cho staging / buổi demo.

Mọi dòng đều `is_demo = true`, `reviewed_by = NULL`: chỉ hiện khi DEMO_COMPLIANCE_DATA bật và ENV
khác prod, kèm banner "Dữ liệu minh hoạ — chưa được chuyên gia pháp lý duyệt". Script từ chối chạy
khi ENV=prod. Chạy lại không tạo trùng.

Nguồn số liệu: bản nháp chuyên môn CHƯA KÝ docs/roadmap/tariff_20_draft.csv (20 dòng thuế EVFTA),
cùng phần hạn ngạch ghi trong đó:
- Gạo 100630: TRQ EVFTA 80.000 t/năm (30.000 t gạo xay xát, 20.000 t gạo chưa xay xát — mã 100620
  chưa nằm trong danh mục hỗ trợ, 30.000 t gạo thơm); ngoài hạn ngạch 175 EUR/t. Ví dụ khách nêu
  trong buổi demo (40.000 / 40.000) KHÁC bản nháp → luật TM phải đối chiếu Phụ lục 2-A.
- Cá ngừ chế biến 160414: TRQ 11.500 t/năm, 0% trong hạn ngạch, 24% ngoài hạn ngạch; dòng CN8 nào
  thuộc hạn ngạch (đồ hộp hay loins) còn phải xác định.
- ST24/ST25: bản nháp ghi được bổ sung vào danh sách gạo thơm cuối 2023 nhưng CHƯA được xác nhận →
  để ở phân nhóm "giống khác" (không đủ điều kiện), đúng ca kiểm của AGENTS.md §6.4.

    uv run python -m scripts.seed_demo_compliance
"""

import argparse
import asyncio
import datetime as dt
from collections.abc import Sequence
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.modules.catalog.service import get_hs_code, upsert_hs_codes
from app.modules.compliance.models import (
    DutyType,
    ProductSubtype,
    SectorAlert,
    TariffLine,
    TariffQuota,
)
from scripts._console import use_utf8
from scripts.import_compliance_data import parse_tariff
from scripts.seed_hs_codes import DEFAULT_CSV, load_csv

DRAFT_CSV = Path(__file__).resolve().parents[2] / "docs" / "roadmap" / "tariff_20_draft.csv"
DRAFT_SOURCE = "docs/roadmap/tariff_20_draft.csv — bản nháp chuyên môn, CHƯA KÝ"
QUOTA_FROM = dt.date(2026, 1, 1)
QUOTA_UNTIL = dt.date(2027, 1, 1)
RICE_LICENCE_VI = (
    "Cần giấy chứng nhận chủng loại gạo thơm (Nghị định 103/2020/NĐ-CP) và giấy phép nhập khẩu "
    "phía EU theo Quy định (EU) 2020/761 — theo bản nháp chuyên môn."
)
RICE_LICENCE_EN = (
    "Requires a fragrant-rice variety certificate (Decree 103/2020/ND-CP) and an EU import "
    "licence under Regulation (EU) 2020/761 — per the expert draft."
)
RICE_ALLOCATION_VI = "Hạn ngạch EVFTA 80.000 t/năm chia theo nhóm; phân bổ theo cơ chế của EU."
RICE_ALLOCATION_EN = "EVFTA quota of 80,000 t/year split by group; allocated under the EU scheme."

SUBTYPES: list[dict[str, Any]] = [
    {
        "code": "rice_milled",
        "hs_prefix": "100630",
        "name_vi": "Gạo trắng xay xát (không phải gạo thơm)",
        "name_en": "Milled rice (not fragrant)",
    },
    {
        "code": "rice_fragrant_listed",
        "hs_prefix": "100630",
        "name_vi": "Gạo thơm thuộc danh sách giống của hạn ngạch",
        "name_en": "Fragrant rice of a listed variety",
        "description_vi": "Danh sách giống theo bản nháp; luật TM đối chiếu trước khi duyệt.",
    },
    {
        "code": "rice_fragrant_other",
        "hs_prefix": "100630",
        "name_vi": "Gạo thơm giống khác (vd ST25 — chưa xác nhận)",
        "name_en": "Other fragrant rice (e.g. ST25 — unconfirmed)",
        "description_vi": (
            "Bản nháp ghi ST24/ST25 được bổ sung cuối 2023; chưa xác nhận nên chưa đủ điều kiện."
        ),
    },
    {
        "code": "rice_broken",
        "hs_prefix": "100630",
        "name_vi": "Gạo tấm",
        "name_en": "Broken rice",
    },
    {
        "code": "tuna_prepared",
        "hs_prefix": "160414",
        "name_vi": "Cá ngừ chế biến, đóng hộp",
        "name_en": "Prepared or canned tuna",
        "description_vi": "Dòng CN8 thuộc hạn ngạch còn phải xác định (bản nháp).",
    },
    {
        "code": "tuna_loins",
        "hs_prefix": "160414",
        "name_vi": "Cá ngừ loins (1604 14 16) — chưa xác nhận thuộc hạn ngạch",
        "name_en": "Tuna loins (1604 14 16) — quota coverage unconfirmed",
    },
]


def _quota(**over: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "agreement_code": "EVFTA",
        "destination": "EU",
        "quota_year": 2026,
        "volume_unit": "tonne",
        "in_quota_duty_type": DutyType.ad_valorem,
        "in_quota_rate": Decimal("0"),
        "valid_from": QUOTA_FROM,
        "valid_until": QUOTA_UNTIL,
        "source_url": None,
    }
    base.update(over)
    return base


QUOTAS: list[tuple[dict[str, Any], list[str]]] = [
    (
        _quota(
            hs_prefix="100630",
            quota_code="DEMO-RICE-MILLED",
            volume=Decimal("30000"),
            out_quota_duty_type=DutyType.specific,
            out_quota_specific=Decimal("175"),
            specific_unit="tonne",
            allocation_note_vi=RICE_ALLOCATION_VI,
            allocation_note_en=RICE_ALLOCATION_EN,
        ),
        ["rice_milled"],
    ),
    (
        _quota(
            hs_prefix="100630",
            quota_code="DEMO-RICE-FRAGRANT",
            volume=Decimal("30000"),
            out_quota_duty_type=DutyType.specific,
            out_quota_specific=Decimal("175"),
            specific_unit="tonne",
            licence_note_vi=RICE_LICENCE_VI,
            licence_note_en=RICE_LICENCE_EN,
            allocation_note_vi=RICE_ALLOCATION_VI,
            allocation_note_en=RICE_ALLOCATION_EN,
        ),
        ["rice_fragrant_listed"],
    ),
    (
        _quota(
            hs_prefix="160414",
            quota_code="DEMO-TUNA",
            volume=Decimal("11500"),
            out_quota_duty_type=DutyType.ad_valorem,
            out_quota_rate=Decimal("24"),
        ),
        ["tuna_prepared"],
    ),
]

ALERTS: list[dict[str, Any]] = [
    {
        "code": "iuu_yellow_card",
        "hs_prefixes": ["03", "1604", "1605"],
        "severity": "warning",
        "title_vi": "Thẻ vàng IUU của EU đối với thủy sản khai thác Việt Nam",
        "title_en": "EU IUU yellow card for Vietnamese wild-caught seafood",
        "body_vi": (
            "Từ 10/2017 EU áp dụng thẻ vàng IUU với thủy sản khai thác của Việt Nam: lô hàng thủy "
            "sản khai thác có thể bị kiểm tra tăng cường và cần giấy chứng nhận khai thác (catch "
            "certificate) hợp lệ cùng hồ sơ truy xuất nguồn gốc."
        ),
        "body_en": (
            "Since October 2017 the EU has applied an IUU yellow card to Vietnamese wild-caught "
            "seafood: shipments may face enhanced checks and need a valid catch certificate and "
            "traceability records."
        ),
        "valid_from": dt.date(2017, 10, 23),
    }
]


def _refuse_in_prod() -> None:
    if get_settings().env == "prod":
        raise SystemExit("Không nạp dữ liệu minh hoạ ở production (AGENTS.md §6.2).")


async def seed(session: AsyncSession, draft_csv: Path = DRAFT_CSV) -> dict[str, int]:
    """Thêm dòng minh hoạ còn thiếu. Trả số dòng đã thêm theo loại."""
    _refuse_in_prod()
    await upsert_hs_codes(session, load_csv(DEFAULT_CSV))
    added = {"tariff_lines": 0, "subtypes": 0, "quotas": 0, "alerts": 0}

    for _, data in parse_tariff(draft_csv):
        if await get_hs_code(session, data.hs_code) is None:
            continue
        exists = await session.scalar(
            select(TariffLine.id).where(
                TariffLine.hs_code == data.hs_code,
                TariffLine.destination == data.destination,
                TariffLine.agreement_code == data.agreement_code,
                TariffLine.valid_from == data.valid_from,
            )
        )
        if exists is None:
            session.add(TariffLine(**data.model_dump(), is_demo=True))
            added["tariff_lines"] += 1

    subtypes: dict[str, ProductSubtype] = {}
    for spec in SUBTYPES:
        row = await session.scalar(
            select(ProductSubtype).where(ProductSubtype.code == spec["code"])
        )
        if row is None:
            row = ProductSubtype(**spec, source=DRAFT_SOURCE, is_demo=True)
            session.add(row)
            added["subtypes"] += 1
        subtypes[row.code] = row
    await session.flush()

    for spec, eligible in QUOTAS:
        exists = await session.scalar(
            select(TariffQuota.id).where(TariffQuota.quota_code == spec["quota_code"])
        )
        if exists is None:
            quota = TariffQuota(**spec, is_demo=True)
            quota.eligible_subtypes = [subtypes[code] for code in eligible]
            session.add(quota)
            added["quotas"] += 1

    for spec in ALERTS:
        exists = await session.scalar(
            select(SectorAlert.id).where(SectorAlert.code == spec["code"])
        )
        if exists is None:
            session.add(SectorAlert(**spec, is_demo=True))
            added["alerts"] += 1

    await session.commit()
    return added


async def _run() -> dict[str, int]:
    async with get_sessionmaker()() as session:
        return await seed(session)


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    argparse.ArgumentParser(description=__doc__).parse_args(argv)
    added = asyncio.run(_run())
    print("Đã thêm dữ liệu minh hoạ:", ", ".join(f"{k}={v}" for k, v in added.items()))
    print("Chỉ hiện khi DEMO_COMPLIANCE_DATA=true và ENV khác prod.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
