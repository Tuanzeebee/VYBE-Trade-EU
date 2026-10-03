"""Dữ liệu tham chiếu DEMO cho buổi demo: giá cước, phí bảo hiểm, phân khúc thị trường.

    uv run python -m scripts.seed_demo_reference            # nạp (chạy lại không trùng)
    uv run python -m scripts.seed_demo_reference --purge    # xóa đúng các dòng DEMO

Chỉ gồm số và ý kiến chị Hà My nêu trong buổi họp 02/10/2026, gắn nhãn "DEMO", CHƯA kiểm chứng:
- cước 40ft Việt Nam → Đức khoảng 3.000 (chị nói "3.000 đô", nên lưu USD; chờ xác nhận USD hay EUR);
- phí bảo hiểm khoảng 2% giá trị lô hàng (chờ người có chuyên môn xác minh);
- hai ví dụ phân khúc (Đức, Pháp) chị nêu miệng, chưa có nguồn thống kê.
Không bịa số cho tuyến/nước khác: giao diện sẽ hiện "chưa có giá tham khảo".

Dòng được ghi người duyệt là admin demo (admin@vybe-demo.example, tạo bởi seed_demo_journey) để
hiện ra giao diện; ở production người duyệt thật phải nhập và duyệt. Script từ chối chạy khi tên DB
có 'prod'; DB staging hoặc máy chủ từ xa chỉ chạy khi có --allow-remote.
"""

import argparse
import asyncio
import datetime as dt
import sys
import uuid
from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_sessionmaker
from app.modules.auth.models import User
from app.modules.compliance.models import FreightBenchmark, InsuranceBenchmark
from app.modules.markets.models import MarketInsight
from scripts._console import use_utf8
from scripts.seed_demo import assert_allowed

ADMIN_EMAIL = "admin@vybe-demo.example"
SOURCE = "DEMO — số liệu nêu trong buổi họp 02/10/2026, chưa kiểm chứng"
VALID_DAYS = 180


async def seed(session: AsyncSession, reviewer_id: uuid.UUID, today: dt.date | None = None) -> int:
    """Tạo các dòng DEMO còn thiếu; trả số dòng mới. Không commit (người gọi quyết định)."""
    day = today or dt.datetime.now(dt.UTC).date()
    now = dt.datetime.now(dt.UTC)
    window = {"valid_from": day, "valid_until": day + dt.timedelta(days=VALID_DAYS)}
    reviewed = {"reviewed_by": reviewer_id, "reviewed_at": now}
    created = 0

    has_freight = await session.scalar(
        select(FreightBenchmark.id).where(FreightBenchmark.source == SOURCE).limit(1)
    )
    if has_freight is None:
        session.add(
            FreightBenchmark(
                origin_port="Cat Lai (TP.HCM)",
                dest_country="DE",
                container_type="40HC",
                cargo_class="dry",
                price_low=Decimal("2500"),
                price_typical=Decimal("3000"),
                price_high=Decimal("3500"),
                currency="USD",
                source=SOURCE,
                **window,
                **reviewed,
            )
        )
        created += 1

    has_insurance = await session.scalar(
        select(InsuranceBenchmark.id).where(InsuranceBenchmark.source == SOURCE).limit(1)
    )
    if has_insurance is None:
        session.add(
            InsuranceBenchmark(
                cargo_class="dry",
                rate_percent=Decimal("2"),
                basis="invoice",
                source=SOURCE,
                **window,
                **reviewed,
            )
        )
        created += 1

    insights = [
        (
            "DE",
            "consumer_asian",
            "Ví dụ minh hoạ (chưa kiểm chứng): ở Đức, nhóm người nhập cư gốc Thổ Nhĩ Kỳ chiếm tỷ "
            "trọng đáng kể trong kênh bán gạo cho cộng đồng.",
            "Illustrative example (unverified): in Germany, consumers of Turkish origin make up a "
            "notable share of rice sold to community retail.",
        ),
        (
            "FR",
            "consumer_asian",
            "Ví dụ minh hoạ (chưa kiểm chứng): ở Pháp, cộng đồng người gốc Trung Quốc là nhóm "
            "tiêu dùng gạo châu Á đáng chú ý.",
            "Illustrative example (unverified): in France, the Chinese-origin community is a "
            "notable group of Asian rice consumers.",
        ),
    ]
    for country, segment, note_vi, note_en in insights:
        exists = await session.scalar(
            select(MarketInsight.id)
            .where(
                MarketInsight.source == SOURCE,
                MarketInsight.country == country,
                MarketInsight.segment == segment,
            )
            .limit(1)
        )
        if exists is None:
            session.add(
                MarketInsight(
                    country=country,
                    hs_prefix="1006",
                    segment=segment,
                    note_vi=note_vi,
                    note_en=note_en,
                    source=SOURCE,
                    **reviewed,
                )
            )
            created += 1
    await session.flush()
    return created


async def purge(session: AsyncSession) -> int:
    """Xóa đúng các dòng DEMO (theo nhãn nguồn); dòng nhập tay hoặc dữ liệu thật không bị đụng."""
    total = 0
    for model in (FreightBenchmark, InsuranceBenchmark, MarketInsight):
        result = await session.execute(delete(model).where(model.source == SOURCE))
        total += int(result.rowcount or 0)  # type: ignore[attr-defined]
    await session.flush()
    return total


async def _run(do_purge: bool) -> None:
    async with get_sessionmaker()() as session:
        if do_purge:
            removed = await purge(session)
            await session.commit()
            print(f"Đã xóa {removed} dòng dữ liệu tham chiếu DEMO.")
            return
        reviewer = await session.scalar(select(User.id).where(User.email == ADMIN_EMAIL))
        if reviewer is None:
            raise SystemExit(
                f"Chưa có admin demo ({ADMIN_EMAIL}). Chạy trước: "
                "uv run python -m scripts.seed_demo_journey --approve-evidence-types"
            )
        created = await seed(session, reviewer)
        await session.commit()
        print(f"Đã tạo {created} dòng dữ liệu tham chiếu DEMO mới (cước, bảo hiểm, phân khúc).")


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--purge", action="store_true", help="Xóa các dòng DEMO")
    parser.add_argument("--allow-remote", action="store_true", help="Cho phép DB staging/từ xa")
    args = parser.parse_args(list(sys.argv[1:] if argv is None else argv))
    url = make_url(get_settings().database_url)
    assert_allowed(url.host, url.database, args.allow_remote)
    asyncio.run(_run(args.purge))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
