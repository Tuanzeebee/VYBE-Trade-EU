"""U15: nạp thống kê thương mại — parser SDMX-CSV (đoạn trích THẬT từ Eurostat Comext, lấy ngày
01/10/2026), job nạp với nguồn giả, nạp file đã tuyển chọn, phân quyền admin."""

import uuid
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.trade_stats import (
    EurostatComextSource,
    FakeTradeStatsSource,
    TradeFlowRow,
    TradeQuery,
    format_flow_csv,
    parse_flow_csv,
    parse_sdmx_csv,
)
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD
from app.modules.markets import service
from app.modules.markets.models import TradeFlow, TradeImportBatch

SDMX = """DATAFLOW,LAST UPDATE,freq,reporter,partner,product,flow,indicators,TIME_PERIOD,OBS_VALUE
ESTAT:DS-045409(1.0),15/09/26 11:00:00,A,DE,VN,030462,1,QUANTITY_IN_100KG,2024,90212.63
ESTAT:DS-045409(1.0),15/09/26 11:00:00,A,DE,VN,030462,1,VALUE_IN_EUROS,2024,32313884
ESTAT:DS-045409(1.0),15/09/26 11:00:00,A,DE,WORLD,030462,1,VALUE_IN_EUROS,2024,39919520
ESTAT:DS-045409(1.0),15/09/26 11:00:00,A,DE,WORLD,030462,1,QUANTITY_IN_100KG,2024,113481.95
ESTAT:DS-045409(1.0),15/09/26 11:00:00,M,DE,VN,030462,1,VALUE_IN_EUROS,2024-01,1
ESTAT:DS-045409(1.0),15/09/26 11:00:00,A,FR,VN,030462,1,VALUE_IN_EUROS,2024,
"""


def test_sdmx_parser_merges_value_and_quantity_and_skips_monthly() -> None:
    rows = parse_sdmx_csv(SDMX)
    by_key = {(r.reporter, r.partner): r for r in rows}
    vn = by_key[("DE", "VN")]
    assert (vn.year, vn.flow, vn.value_eur, vn.quantity_kg) == (
        2024,
        "import",
        Decimal("32313884"),
        Decimal("9021263.00"),  # 100 kg → kg
    )
    assert by_key[("DE", "WORLD")].quantity_kg == Decimal("11348195.00")
    assert by_key[("FR", "VN")].value_eur is None  # ô trống không thành 0
    assert len(rows) == 3  # dòng tháng bị bỏ


def test_eurostat_url_joins_dimensions() -> None:
    source = EurostatComextSource(base_url="https://example.test/DS-045409/")
    url = source.url_for(
        TradeQuery(products=("030462",), years=(2019, 2024), reporters=("DE", "FR"), partners=()),
        "030462",
    )
    assert url == (
        "https://example.test/DS-045409/A.DE+FR..030462.1.VALUE_IN_EUROS+QUANTITY_IN_100KG"
        "?startPeriod=2019&endPeriod=2024&format=SDMX-CSV"
    )


def test_flow_csv_roundtrip_and_errors() -> None:
    rows = [TradeFlowRow("DE", "VN", "030462", 2024, "import", Decimal("1.50"), None)]
    text = format_flow_csv(rows, header_comment="Nguồn: Eurostat Comext")
    assert text.startswith("# Nguồn: Eurostat Comext\n")
    assert parse_flow_csv(text) == rows
    with pytest.raises(ValueError, match="dòng 2"):
        parse_flow_csv(
            "reporter,partner,product,year,flow,value_eur,quantity_kg\nDE,VN,3,2024,import,1,\n"
        )
    with pytest.raises(ValueError, match="flow"):
        parse_flow_csv(
            "reporter,partner,product,year,flow,value_eur,quantity_kg\nDE,VN,030462,2024,in,1,\n"
        )


def test_priority_products_have_keywords() -> None:
    products = service.load_priority_products()
    pangasius = next(p for p in products if p.hs_code == "030462")
    assert pangasius.family == "pangasius" and "cá tra" in pangasius.keywords


async def admin_login(client: AsyncClient, session: AsyncSession) -> None:
    await create_admin(session, "admin@evfta.eu", PASSWORD)
    login = {"email": "admin@evfta.eu", "password": PASSWORD}
    assert (await client.post("/api/auth/login", json=login)).status_code == 200


def fake_rows() -> list[TradeFlowRow]:
    return [
        TradeFlowRow("DE", "VN", "030462", 2024, "import", Decimal("32313884"), Decimal("9021263")),
        TradeFlowRow("DE", "WORLD", "030462", 2024, "import", Decimal("39919520"), None),
        TradeFlowRow("EU27_2020", "IN", "030462", 2024, "import", Decimal("1000"), None),
    ]


async def test_admin_creates_import_and_job_upserts_rows(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    queued: list[uuid.UUID] = []

    async def enqueue(batch_id: uuid.UUID) -> None:
        queued.append(batch_id)

    previous = service.set_import_enqueuer(enqueue)
    try:
        await admin_login(api_client, db_session)
        r = await api_client.post(
            "/api/admin/trade-imports", json={"products": ["030462"], "year_from": 2019}
        )
        assert r.status_code == 202, r.text
        batch = r.json()
        assert (batch["status"], batch["params"]["products"]) == ("queued", ["030462"])
        assert queued == [uuid.UUID(batch["id"])]

        fake = FakeTradeStatsSource(fake_rows())
        await service.run_import(db_session, uuid.UUID(batch["id"]), fake)
        assert [q.reporters[-1] for q in fake.queries] == ["EU27_2020", "EU27_2020"]
        assert fake.queries[0].partners == ("WORLD", "EXT_EU27_2020", "VN")
        assert fake.queries[1].partners == ()  # cơ cấu đối tác của EU
        row = await db_session.get(TradeImportBatch, uuid.UUID(batch["id"]))
        assert row is not None and row.status == "succeeded" and row.rows_imported == 3
        count = await db_session.scalar(select(func.count()).select_from(TradeFlow))
        assert count == 3  # hai truy vấn trả cùng dòng → upsert, không trùng

        listed = (await api_client.get("/api/admin/trade-imports")).json()
        assert listed[0]["status"] == "succeeded"
    finally:
        service.set_import_enqueuer(previous)


async def test_failed_fetch_marks_the_batch_failed(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    class Broken(FakeTradeStatsSource):
        async def fetch(self, query: TradeQuery) -> list[TradeFlowRow]:
            raise RuntimeError("Eurostat 503")

    batch = TradeImportBatch(
        source="eurostat_comext", params={"products": ["030462"], "years": [2023, 2024]}
    )
    db_session.add(batch)
    await db_session.flush()
    await service.run_import(db_session, batch.id, Broken())
    refreshed = await db_session.get_one(TradeImportBatch, batch.id)
    assert (refreshed.status, refreshed.error) == ("failed", "Eurostat 503")


async def test_curated_file_import_and_validation(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await admin_login(api_client, db_session)
    content = format_flow_csv(fake_rows()).encode()
    r = await api_client.post(
        "/api/admin/trade-imports/file",
        params={"source": "eurostat_comext"},
        files={"file": ("flows.csv", content, "text/csv")},
    )
    assert r.status_code == 201, r.text
    assert (r.json()["status"], r.json()["rows_imported"]) == ("succeeded", 3)
    bad = await api_client.post(
        "/api/admin/trade-imports/file", files={"file": ("bad.csv", b"a,b\n1,2\n", "text/csv")}
    )
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "invalid_trade_file"


@pytest.mark.parametrize(
    ("method", "url", "kwargs"),
    [
        ("get", "/api/admin/trade-imports", {}),
        ("get", "/api/admin/trade-imports/priority-products", {}),
        ("post", "/api/admin/trade-imports", {"json": {}}),
    ],
)
async def test_trade_import_routes_are_admin_only(
    api_client: AsyncClient, method: str, url: str, kwargs: dict[str, Any]
) -> None:
    assert (await api_client.request(method, url, **kwargs)).status_code == 401
    from app.modules.companies.tests.helpers import login_as

    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.request(method, url, **kwargs)).status_code == 403
