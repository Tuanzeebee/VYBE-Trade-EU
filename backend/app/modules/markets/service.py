"""Thống kê thương mại (U15): tạo lô nạp, chạy nạp trong job nền, nạp file đã tuyển chọn.

Gọi nguồn ngoài (Eurostat) chỉ trong job (ADR-0003); request của admin chỉ tạo lô và xếp hàng job.
"""

import csv
import datetime as dt
import io
import logging
import uuid
from collections.abc import Awaitable, Callable, Sequence
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.trade_stats import TradeFlowRow, TradeQuery, TradeStatsSource, parse_flow_csv
from app.modules.auth.schemas import CurrentUser
from app.modules.markets.models import TradeFlow, TradeImportBatch
from app.modules.markets.schemas import PriorityProductOut, TradeImportBatchOut, TradeImportIn

log = logging.getLogger(__name__)

PRIORITY_CSV = Path(__file__).resolve().parents[3] / "data" / "trade_priority_products.csv"
EU_MEMBERS = tuple(
    "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split()
)
EU_AGGREGATE = "EU27_2020"
WORLD = "WORLD"
EXTRA_EU = "EXT_EU27_2020"
VIETNAM = "VN"
DEFAULT_PARTNERS = (WORLD, EXTRA_EU, VIETNAM)
DEFAULT_YEARS = 6
COMPETITOR_YEARS = 2
CHUNK = 1000


def load_priority_products(path: Path = PRIORITY_CSV) -> list[PriorityProductOut]:
    lines = [
        line
        for line in path.read_text(encoding="utf-8-sig").splitlines()
        if line.strip() and not line.startswith("#")
    ]
    return [
        PriorityProductOut(
            hs_code=row["hs_code"].strip(),
            family=row["family"].strip(),
            name_vi=row["name_vi"].strip(),
            name_en=row["name_en"].strip(),
            keywords=[k.strip() for k in row["keywords"].split("|") if k.strip()],
        )
        for row in csv.DictReader(io.StringIO("\n".join(lines)))
    ]


# ── Hàng đợi job (test thay bằng bản ghi trong bộ nhớ) ───────────────────────
ImportEnqueuer = Callable[[uuid.UUID], Awaitable[None]]


async def _defer_import(batch_id: uuid.UUID) -> None:
    try:
        from app.jobs.import_trade_stats import import_trade_stats

        await import_trade_stats.defer_async(batch_id=str(batch_id))
    except Exception:
        log.exception("Không xếp được job nạp thống kê cho lô %s", batch_id)


_enqueue_import: ImportEnqueuer = _defer_import


def set_import_enqueuer(enqueuer: ImportEnqueuer) -> ImportEnqueuer:
    global _enqueue_import
    previous, _enqueue_import = _enqueue_import, enqueuer
    return previous


def _default_years(today: dt.date) -> tuple[int, int]:
    return today.year - DEFAULT_YEARS, today.year - 1


async def create_import(
    session: AsyncSession, admin: CurrentUser, data: TradeImportIn, today: dt.date | None = None
) -> TradeImportBatchOut:
    start, end = _default_years(today or dt.date.today())
    year_from, year_to = data.year_from or start, data.year_to or end
    if year_from > year_to:
        raise AppError("invalid_years", "year_from must not be after year_to", 422)
    products = data.products or [p.hs_code for p in load_priority_products()]
    batch = TradeImportBatch(
        source="eurostat_comext",
        params={"products": products, "years": [year_from, year_to]},
        started_by=admin.id,
    )
    session.add(batch)
    await session.flush()
    await record(
        session,
        actor_id=admin.id,
        action_type="trade_import.create",
        entity_type="trade_import_batch",
        entity_id=str(batch.id),
        before=None,
        after=batch.params,
    )
    await session.commit()
    await session.refresh(batch)
    await _enqueue_import(batch.id)
    return TradeImportBatchOut.model_validate(batch)


async def upsert_rows(
    session: AsyncSession, source: str, rows: Sequence[TradeFlowRow], batch_id: uuid.UUID | None
) -> int:
    """Thêm hoặc cập nhật theo khoá tự nhiên; chạy lại cùng dữ liệu không tạo trùng. Hai truy vấn
    của một lô có thể trả cùng một dòng (vd EU27 ← VN) → khử trùng trước (dòng sau thắng)."""
    unique = {(r.reporter, r.partner, r.product, r.year, r.flow): r for r in rows}
    rows = list(unique.values())
    values = [
        {
            "source": source,
            "reporter": r.reporter,
            "partner": r.partner,
            "product": r.product,
            "year": r.year,
            "flow": r.flow,
            "value_eur": r.value_eur,
            "quantity_kg": r.quantity_kg,
            "batch_id": batch_id,
        }
        for r in rows
    ]
    for start in range(0, len(values), CHUNK):
        statement = insert(TradeFlow).values(values[start : start + CHUNK])
        await session.execute(
            statement.on_conflict_do_update(
                constraint="uq_trade_flows_key",
                set_={
                    "value_eur": statement.excluded.value_eur,
                    "quantity_kg": statement.excluded.quantity_kg,
                    "batch_id": statement.excluded.batch_id,
                    "updated_at": func.clock_timestamp(),
                },
            )
        )
    return len(values)


def queries_for(products: Sequence[str], year_from: int, year_to: int) -> list[TradeQuery]:
    """Hai truy vấn của một lô: nhập khẩu của 27 nước + EU từ WORLD / ngoài EU / Việt Nam trong các
    năm của lô, và cơ cấu mọi đối tác của EU trong 2 năm gần nhất (thị phần đối thủ)."""
    return [
        TradeQuery(
            products=tuple(products),
            years=(year_from, year_to),
            reporters=(*EU_MEMBERS, EU_AGGREGATE),
            partners=DEFAULT_PARTNERS,
        ),
        TradeQuery(
            products=tuple(products),
            years=(max(year_from, year_to - COMPETITOR_YEARS + 1), year_to),
            reporters=(EU_AGGREGATE,),
        ),
    ]


async def run_import(session: AsyncSession, batch_id: uuid.UUID, source: TradeStatsSource) -> None:
    """Thân job: nhập khẩu của 27 nước + EU từ WORLD / ngoài EU / Việt Nam trong các năm của lô, và
    cơ cấu đối tác của EU (để tính thị phần đối thủ) trong 2 năm gần nhất. Lỗi → lô `failed`."""
    batch = await session.get(TradeImportBatch, batch_id)
    if batch is None or batch.status not in ("queued", "failed"):
        return
    batch.status, batch.error = "running", None
    await session.commit()
    products = tuple(batch.params.get("products", []))
    year_from, year_to = batch.params.get("years", _default_years(dt.date.today()))
    try:
        rows: list[TradeFlowRow] = []
        for query in queries_for(products, year_from, year_to):
            rows += await source.fetch(query)
        batch.rows_imported = await upsert_rows(session, source.name, rows, batch.id)
        batch.status = "succeeded"
    except Exception as exc:
        await session.rollback()
        batch = await session.get_one(TradeImportBatch, batch_id)
        batch.status, batch.error = "failed", str(exc)[:2000]
        log.exception("Nạp thống kê thương mại thất bại (lô %s)", batch_id)
    batch.finished_at = dt.datetime.now(dt.UTC)
    await session.commit()


async def import_file(
    session: AsyncSession, admin: CurrentUser, content: bytes, source: str
) -> TradeImportBatchOut:
    """File CSV đã tuyển chọn (định dạng chuẩn); nạp ngay trong request vì dữ liệu nhỏ."""
    try:
        rows = parse_flow_csv(content.decode("utf-8-sig"))
    except (UnicodeDecodeError, ValueError) as exc:
        raise AppError("invalid_trade_file", str(exc)[:500], 422) from exc
    if not rows:
        raise AppError("invalid_trade_file", "The file has no data rows", 422)
    batch = TradeImportBatch(
        source=source,
        params={"file_rows": len(rows)},
        status="succeeded",
        started_by=admin.id,
        finished_at=dt.datetime.now(dt.UTC),
    )
    session.add(batch)
    await session.flush()
    batch.rows_imported = await upsert_rows(session, source, rows, batch.id)
    await record(
        session,
        actor_id=admin.id,
        action_type="trade_import.file",
        entity_type="trade_import_batch",
        entity_id=str(batch.id),
        before=None,
        after={"source": source, "rows": len(rows)},
    )
    await session.commit()
    await session.refresh(batch)
    return TradeImportBatchOut.model_validate(batch)


async def list_batches(session: AsyncSession, limit: int = 50) -> list[TradeImportBatchOut]:
    rows = await session.scalars(
        select(TradeImportBatch).order_by(TradeImportBatch.created_at.desc()).limit(limit)
    )
    return [TradeImportBatchOut.model_validate(r) for r in rows]
