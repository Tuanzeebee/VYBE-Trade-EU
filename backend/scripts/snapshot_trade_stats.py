"""Chụp thống kê thương mại THẬT từ Eurostat Comext cho danh sách mã ưu tiên vào một file CSV (U15).

File này là số liệu công bố (có ghi nguồn và ngày lấy) để staging / buổi demo chạy được khi không có
mạng; nạp bằng màn Admin → Thị trường → "Nạp file CSV" (nguồn Eurostat Comext) hoặc seed demo (U25).
Dùng đúng các truy vấn của job nạp (markets.service.queries_for).

    uv run python -m scripts.snapshot_trade_stats [--out data/trade_flows_eurostat_snapshot.csv]
"""

import argparse
import asyncio
import datetime as dt
from collections.abc import Sequence
from pathlib import Path

from app.core.trade_stats import EurostatComextSource, TradeFlowRow, format_flow_csv
from app.modules.markets.service import load_priority_products, queries_for
from scripts._console import use_utf8

DEFAULT_OUT = Path(__file__).resolve().parents[1] / "data" / "trade_flows_eurostat_snapshot.csv"


async def snapshot(year_from: int, year_to: int) -> list[TradeFlowRow]:
    source = EurostatComextSource()
    products = [p.hs_code for p in load_priority_products()]
    rows: dict[tuple[str, str, str, int, str], TradeFlowRow] = {}
    for query in queries_for(products, year_from, year_to):
        for row in await source.fetch(query):
            rows[(row.reporter, row.partner, row.product, row.year, row.flow)] = row
    return sorted(rows.values(), key=lambda r: (r.product, r.reporter, r.partner, r.year))


def main(argv: Sequence[str] | None = None) -> int:
    use_utf8()
    today = dt.date.today()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--year-from", type=int, default=today.year - 6)
    parser.add_argument("--year-to", type=int, default=today.year - 1)
    args = parser.parse_args(argv)
    rows = asyncio.run(snapshot(args.year_from, args.year_to))
    header = (
        f"Nguồn: Eurostat Comext, bộ DS-045409 (EU trade since 1988 by HS2-4-6 and CN8), lấy ngày "
        f"{today.isoformat()} qua API SDMX 2.1.\n"
        "Tái sử dụng theo chính sách của Eurostat (ghi nguồn). "
        "value_eur = trị giá nhập khẩu (EUR), quantity_kg = khối lượng (kg).\n"
        "Nạp: Admin → Thị trường → Nạp file CSV (nguồn Eurostat Comext)."
    )
    args.out.write_text(format_flow_csv(rows, header_comment=header), encoding="utf-8")
    print(f"Đã ghi {len(rows)} dòng vào {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
