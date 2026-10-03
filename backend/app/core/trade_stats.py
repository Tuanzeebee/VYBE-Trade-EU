"""Nguồn thống kê thương mại (U15, ADR-0003) — chỉ gọi từ job nền, không từ request.

- EurostatComextSource: API SDMX 2.1 của Eurostat Comext (bộ DS-045409), SDMX-CSV, qua httpx.
- parse_flow_csv: file CSV đã tuyển chọn theo định dạng chuẩn của hệ thống (nạp tay / dữ liệu demo).
- FakeTradeStatsSource: cho test.

Số liệu là thống kê công bố; hàm tính chỉ số (markets.calculators) và lời văn báo cáo chỉ dùng
các số đã nạp vào trade_flows — không bao giờ để model tự điền số.
"""

import csv
import io
from collections.abc import Iterable
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Literal, Protocol

import httpx

from app.core.config import get_settings

Flow = Literal["import", "export"]
_FLOW_CODES: dict[str, Flow] = {"1": "import", "2": "export"}
_FLOW_PARAM = {"import": "1", "export": "2"}
KG_PER_100KG = Decimal(100)


@dataclass(frozen=True)
class TradeFlowRow:
    reporter: str  # nước báo cáo (ISO-2) hoặc khối (EU27_2020)
    partner: str  # đối tác (ISO-2) hoặc tổng hợp (WORLD, EXT_EU27_2020…)
    product: str  # mã HS (2–8 số)
    year: int
    flow: Flow
    value_eur: Decimal | None = None
    quantity_kg: Decimal | None = None


@dataclass(frozen=True)
class TradeQuery:
    """Truy vấn theo năm. Tuple rỗng ở reporters/partners = mọi giá trị."""

    products: tuple[str, ...]
    years: tuple[int, int]
    reporters: tuple[str, ...] = ()
    partners: tuple[str, ...] = ()
    flow: Flow = "import"


class TradeStatsSource(Protocol):
    name: str

    async def fetch(self, query: TradeQuery) -> list[TradeFlowRow]: ...


def _decimal(raw: str | None) -> Decimal | None:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def parse_sdmx_csv(text: str) -> list[TradeFlowRow]:
    """SDMX-CSV của Comext (cột freq, reporter, partner, product, flow, indicators, TIME_PERIOD,
    OBS_VALUE) → một dòng / khoá, gộp VALUE_IN_EUROS và QUANTITY_IN_100KG. Chỉ lấy dữ liệu năm."""
    merged: dict[tuple[str, str, str, int, Flow], dict[str, Decimal | None]] = {}
    for raw in csv.DictReader(io.StringIO(text)):
        row = {k.strip().lower(): (v or "").strip() for k, v in raw.items() if k}
        if row.get("freq", "A") != "A":
            continue
        flow = _FLOW_CODES.get(row.get("flow", ""))
        period = row.get("time_period", "")
        if flow is None or not period.isdigit():
            continue
        key = (row["reporter"], row["partner"], row["product"], int(period), flow)
        values = merged.setdefault(key, {"value_eur": None, "quantity_kg": None})
        amount = _decimal(row.get("obs_value"))
        indicator = row.get("indicators", "").upper()
        if indicator == "VALUE_IN_EUROS":
            values["value_eur"] = amount
        elif indicator == "QUANTITY_IN_100KG":
            values["quantity_kg"] = None if amount is None else amount * KG_PER_100KG
    return [
        TradeFlowRow(r, p, prod, year, flow, v["value_eur"], v["quantity_kg"])
        for (r, p, prod, year, flow), v in sorted(merged.items())
    ]


FLOW_CSV_COLUMNS = ("reporter", "partner", "product", "year", "flow", "value_eur", "quantity_kg")


def parse_flow_csv(text: str) -> list[TradeFlowRow]:
    """CSV chuẩn của hệ thống (FLOW_CSV_COLUMNS), bỏ dòng '#'. Sai dòng nào báo đúng dòng đó."""
    lines = [line for line in text.splitlines() if line.strip() and not line.startswith("#")]
    rows: list[TradeFlowRow] = []
    for n, raw in enumerate(csv.DictReader(io.StringIO("\n".join(lines))), start=2):
        try:
            flow = raw["flow"].strip().lower()
            if flow not in ("import", "export"):
                raise ValueError("flow must be import or export")
            product = raw["product"].strip()
            if not (product.isdigit() and 2 <= len(product) <= 8):
                raise ValueError("product must be 2-8 digits")
            rows.append(
                TradeFlowRow(
                    reporter=raw["reporter"].strip().upper(),
                    partner=raw["partner"].strip().upper(),
                    product=product,
                    year=int(raw["year"]),
                    flow=flow,  # type: ignore[arg-type]
                    value_eur=_decimal(raw.get("value_eur")),
                    quantity_kg=_decimal(raw.get("quantity_kg")),
                )
            )
        except (KeyError, ValueError) as exc:
            raise ValueError(f"dòng {n}: {exc}") from exc
    return rows


def format_flow_csv(rows: Iterable[TradeFlowRow], header_comment: str | None = None) -> str:
    buf = io.StringIO()
    if header_comment:
        for line in header_comment.splitlines():
            buf.write(f"# {line}\n")
    writer = csv.writer(buf, lineterminator="\n")
    writer.writerow(FLOW_CSV_COLUMNS)
    for r in rows:
        writer.writerow(
            [
                r.reporter,
                r.partner,
                r.product,
                r.year,
                r.flow,
                r.value_eur or "",
                r.quantity_kg or "",
            ]
        )
    return buf.getvalue()


class EurostatComextSource:
    """Eurostat Comext DS-045409 qua API SDMX 2.1 (không cần khoá). Một yêu cầu cho mỗi mã hàng."""

    name = "eurostat_comext"

    def __init__(self, base_url: str | None = None, timeout: float = 60.0) -> None:
        self.base_url = (base_url or get_settings().eurostat_comext_url).rstrip("/")
        self.timeout = timeout

    def url_for(self, query: TradeQuery, product: str) -> str:
        key = ".".join(
            [
                "A",
                "+".join(query.reporters),
                "+".join(query.partners),
                product,
                _FLOW_PARAM[query.flow],
                "VALUE_IN_EUROS+QUANTITY_IN_100KG",
            ]
        )
        start, end = query.years
        return f"{self.base_url}/{key}?startPeriod={start}&endPeriod={end}&format=SDMX-CSV"

    async def fetch(self, query: TradeQuery) -> list[TradeFlowRow]:
        rows: list[TradeFlowRow] = []
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=False) as client:
            for product in query.products:
                response = await client.get(self.url_for(query, product))
                if response.status_code == 404:  # Eurostat trả 404 khi không có quan sát nào
                    continue
                response.raise_for_status()
                rows.extend(parse_sdmx_csv(response.text))
        return rows


@dataclass
class FakeTradeStatsSource:
    rows: list[TradeFlowRow] = field(default_factory=list)
    name: str = "fake"
    queries: list[TradeQuery] = field(default_factory=list)

    async def fetch(self, query: TradeQuery) -> list[TradeFlowRow]:
        self.queries.append(query)
        return [r for r in self.rows if r.product in query.products]
