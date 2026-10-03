"""U18: báo cáo go-to-market — validator lời văn (không chữ số, không khoá lạ), lời văn mẫu khi
model sai, PDF có dấu tiếng Việt, bản tóm tắt / đầy đủ theo quyền, phân quyền và IDOR, yêu cầu tư vấn.
Số liệu thương mại là file chụp THẬT của Eurostat (01/10/2026)."""

import datetime as dt
import io
import json
import uuid
from collections.abc import AsyncIterator, Iterator
from decimal import Decimal
from pathlib import Path

import pytest
from httpx import AsyncClient
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import entitlements
from app.core.audit import AuditLog
from app.core.chat import FakeChatModel
from app.core.trade_stats import parse_flow_csv
from app.modules.auth.service import create_admin
from app.modules.catalog.service import upsert_hs_codes
from app.modules.companies.tests.helpers import PASSWORD, company_body, login_as, product_body
from app.modules.markets import report_service
from app.modules.markets.models import MarketInsight, MarketReport
from app.modules.markets.report import (
    SECTIONS,
    CompanyFacts,
    branding_advice,
    build_metrics,
    model_prompt,
    template_narrative,
    validate_narrative,
)
from app.modules.markets.report_pdf import ReportDocument, ReportTable, render_report
from app.modules.markets.service import upsert_rows
from conftest import FakeStorage
from scripts.seed_hs_codes import DEFAULT_CSV, load_csv

SNAPSHOT = Path(__file__).resolve().parents[4] / "data" / "trade_flows_eurostat_snapshot.csv"
URL = "/api/exporter/market-reports"
METRICS = {
    "product_name": "Phi lê cá tra",
    "top1_country": "Tây Ban Nha",
    "top1_import": "42,7 triệu EUR",
}


def valid_narrative(**over: str) -> str:
    text = {key: "Thị trường {top1_country} nhập {top1_import} {product_name}." for key in SECTIONS}
    text.update(over)
    return json.dumps(text, ensure_ascii=False)


# ── Phần thuần ────────────────────────────────────────────────────────────────
def test_validator_fills_numbers_only_from_metrics() -> None:
    out = validate_narrative(valid_narrative(), METRICS)
    assert out is not None
    assert out["market"] == "Thị trường Tây Ban Nha nhập 42,7 triệu EUR Phi lê cá tra."


@pytest.mark.parametrize(
    "raw",
    [
        valid_narrative(market="Nhập khẩu tăng 12% mỗi năm."),  # model tự viết số
        valid_narrative(market="Thị phần {vn_share_fake} rất cao."),  # khoá không có
        json.dumps({"market": "Chỉ một phần."}),  # thiếu phần
        valid_narrative(extra="thừa"),  # thừa phần
        valid_narrative(market=""),
        valid_narrative(market="x" * 2001),
        "không phải JSON",
        json.dumps(["market"]),
    ],
)
def test_validator_rejects_digits_unknown_keys_and_bad_shape(raw: str) -> None:
    assert validate_narrative(raw, METRICS) is None


def test_template_uses_only_sentences_with_available_metrics() -> None:
    narrative = template_narrative(METRICS, "vi")
    assert set(narrative) == set(SECTIONS)
    joined = " ".join(narrative.values())
    assert "{" not in joined  # không còn placeholder chưa điền
    assert "Tây Ban Nha" in joined


def test_prompt_hides_numeric_values_but_shows_words() -> None:
    system, user = model_prompt(METRICS, "vi")
    assert "KHÔNG viết chữ số" in system
    payload = json.loads(user)["placeholders"]
    assert payload["top1_country"]["gia_tri"] == "Tây Ban Nha"
    assert "gia_tri" not in payload["top1_import"]  # có chữ số → chỉ có mô tả
    assert "42,7" not in user


def test_branding_rule_compares_budget_with_benchmark() -> None:
    low = branding_advice(Decimal("0.02"), Decimal(5), "vi")
    high = branding_advice(Decimal("0.06"), Decimal(5), "en")
    assert low is not None and "OEM" in low
    assert high == "an own brand can be tested in one priority market"
    assert branding_advice(None, Decimal(5), "vi") is None


def test_pdf_renders_vietnamese_text() -> None:
    pdf = render_report(
        ReportDocument(
            language="vi",
            company_name="Công ty TNHH Nông Sản Việt",
            product_name="Phi lê cá tra đông lạnh",
            created=dt.date(2026, 10, 2),
            source="Eurostat Comext (DS-045409)",
            narrative_source="template",
            sections=[("summary", "Tóm tắt", "Đức là thị trường lớn.")],
            tables=[ReportTable("top", [["Đức", "39,9 triệu EUR", "5,0%", "80,9%"]])],
            demo_data=True,
        )
    )
    text = "".join(page.extract_text() for page in PdfReader(io.BytesIO(pdf)).pages)
    assert "Báo cáo go-to-market" in text
    assert "Phi lê cá tra đông lạnh" in text
    assert "Đức là thị trường lớn." in text
    assert "không phải tư vấn pháp lý" in text
    assert "chưa được luật TM duyệt" in text


# ── API và job ────────────────────────────────────────────────────────────────
@pytest.fixture
async def snapshot(db_session: AsyncSession) -> None:
    rows = parse_flow_csv(SNAPSHOT.read_text(encoding="utf-8"))
    await upsert_rows(db_session, "eurostat_comext", rows, None)
    await upsert_hs_codes(db_session, load_csv(DEFAULT_CSV))
    await db_session.flush()


@pytest.fixture
async def queued() -> AsyncIterator[list[uuid.UUID]]:
    box: list[uuid.UUID] = []

    async def enqueue(report_id: uuid.UUID) -> None:
        box.append(report_id)

    previous = report_service.set_report_enqueuer(enqueue)
    yield box
    report_service.set_report_enqueuer(previous)


@pytest.fixture
def entitled() -> Iterator[None]:
    async def yes(session: AsyncSession, company_id: uuid.UUID, feature: str) -> bool:
        return feature == report_service.FULL_REPORT

    previous = entitlements.register(yes)
    yield
    entitlements.register(previous)


async def exporter(client: AsyncClient, email: str = "exp@x.vn") -> None:
    await login_as(client, "exporter", email)
    r = await client.post("/api/me/company", json=company_body())
    assert r.status_code == 201, r.text


async def run(session: AsyncSession, report_id: uuid.UUID, chat: FakeChatModel) -> None:
    await report_service.run_report(session, FakeStorage(), report_id, chat)
    session.expire_all()


api = pytest.mark.usefixtures("snapshot", "queued")


@api
async def test_summary_is_free_full_report_needs_entitlement(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    await exporter(api_client)
    body = {"q": "cá tra", "marketing_budget": "20000", "expected_revenue": "1000000"}
    r = await api_client.post(URL, json=body)
    assert r.status_code == 202, r.text
    report = r.json()
    assert (report["status"], report["full"], report["sections"]) == ("queued", False, [])
    assert queued == [uuid.UUID(report["id"])]

    chat = FakeChatModel(lambda system, user: valid_narrative())
    await run(db_session, queued[0], chat)
    assert "42,7" not in chat.calls[0][1]  # model không thấy con số nào
    got = (await api_client.get(f"{URL}/{report['id']}")).json()
    assert (got["status"], got["narrative_source"], got["full"]) == ("ready", "model", False)
    unlocked = [s["key"] for s in got["sections"] if not s["locked"]]
    assert unlocked == ["positioning", "market", "why_market"]
    assert all(s["text"] == "" for s in got["sections"] if s["locked"])
    summary = next(s for s in got["sections"] if s["key"] == "why_market")
    assert "Tây Ban Nha" in summary["text"] or "Đức" in summary["text"]
    assert len(got["top_markets"]) == 3
    assert got["competitors"] == [] and got["pdf_url"] is None  # bản đầy đủ bị khoá
    row = await db_session.get_one(MarketReport, uuid.UUID(report["id"]))
    assert row.pdf_key is not None and row.pdf_key in FakeStorage.objects
    listing = (await api_client.get(URL)).json()
    assert [x["id"] for x in listing] == [report["id"]]


@api
@pytest.mark.usefixtures("entitled")
async def test_model_breaking_rules_falls_back_to_template(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    await exporter(api_client)
    r = await api_client.post(URL, json={"hs": "030462", "language": "en"})
    assert r.status_code == 202, r.text
    await run(db_session, queued[0], FakeChatModel(lambda s, u: valid_narrative(risks="Up 12%")))
    got = (await api_client.get(f"{URL}/{r.json()['id']}")).json()
    assert (got["narrative_source"], got["full"]) == ("template", True)
    assert all(not s["locked"] for s in got["sections"])
    assert got["sections"][1]["title"] == "EU market overview"
    assert got["competitors"][0]["country"] == "VN"
    assert got["pdf_url"].startswith("https://fake/market-reports/")


@api
async def test_report_from_own_product_and_model_error(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    await exporter(api_client)
    product = await api_client.post(
        "/api/exporter/products", json=product_body(name="Cá tra phi lê", hs_code="0304.62")
    )
    assert product.status_code == 201, product.text

    def boom(system: str, user: str) -> str:
        raise RuntimeError("model down")

    r = await api_client.post(URL, json={"product_id": product.json()["id"]})
    assert r.status_code == 202, r.text
    await run(db_session, queued[0], FakeChatModel(boom))
    got = (await api_client.get(f"{URL}/{r.json()['id']}")).json()
    assert (got["status"], got["narrative_source"]) == ("ready", "template")
    assert got["product_name"] == "Phi lê cá tra đông lạnh"


@api
async def test_unknown_product_and_validation(api_client: AsyncClient) -> None:
    await exporter(api_client)
    r = await api_client.post(URL, json={"q": "xe máy"})
    assert (r.status_code, r.json()["error"]["code"]) == (422, "no_trade_data")
    assert (await api_client.post(URL, json={})).status_code == 422
    r = await api_client.post(URL, json={"q": "cá tra", "marketing_budget": "-1"})
    assert r.status_code == 422


@api
async def test_daily_limit(api_client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(report_service, "REPORTS_PER_DAY", 1)
    await exporter(api_client)
    assert (await api_client.post(URL, json={"q": "tôm"})).status_code == 202
    r = await api_client.post(URL, json={"q": "tôm"})
    assert (r.status_code, r.json()["error"]["code"]) == (429, "report_limit")


@api
async def test_auth_and_idor(api_client: AsyncClient) -> None:
    assert (await api_client.get(URL)).status_code == 401
    assert (await api_client.post(URL, json={"q": "tôm"})).status_code == 401
    await exporter(api_client, "a@x.vn")
    mine = (await api_client.post(URL, json={"q": "tôm"})).json()["id"]
    await api_client.post("/api/auth/logout")
    await exporter(api_client, "b@x.vn")
    assert (await api_client.get(f"{URL}/{mine}")).status_code == 404
    assert (await api_client.get(URL)).json() == []
    lead = {"report_id": mine, "contact_name": "B", "contact_email": "b@x.vn"}
    assert (await api_client.post("/api/exporter/consulting-leads", json=lead)).status_code == 404
    assert (await api_client.get("/api/admin/consulting-leads")).status_code == 403
    await api_client.post("/api/auth/logout")
    await login_as(api_client, "buyer", "buyer@x.eu")
    assert (await api_client.get(URL)).status_code == 403
    assert (await api_client.get(f"{URL}/{mine}")).status_code == 403


@api
async def test_consulting_lead_flow(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await exporter(api_client)
    report_id = (await api_client.post(URL, json={"q": "cà phê"})).json()["id"]
    body = {
        "report_id": report_id,
        "contact_name": "Nguyễn Văn A",
        "contact_email": "a@nongsan.vn",
        "phone": "+84 90 123 4567",
        "message": "Cần tư vấn vào thị trường Đức",
    }
    r = await api_client.post("/api/exporter/consulting-leads", json=body)
    assert r.status_code == 201, r.text
    lead = r.json()
    assert lead["status"] == "new"
    await api_client.post("/api/auth/logout")
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    login = {"email": "admin@evfta.eu", "password": PASSWORD}
    assert (await api_client.post("/api/auth/login", json=login)).status_code == 200
    leads = (await api_client.get("/api/admin/consulting-leads")).json()
    assert leads[0]["company_name"] == company_body()["legal_name"]
    assert leads[0]["report_query"] == "cà phê"
    r = await api_client.patch(
        f"/api/admin/consulting-leads/{lead['id']}", json={"status": "contacted"}
    )
    assert (r.status_code, r.json()["status"]) == (200, "contacted")
    assert (await api_client.get("/api/admin/consulting-leads?status=new")).json() == []
    audit = await db_session.scalar(
        select(AuditLog).where(AuditLog.action_type == "consulting_lead.update")
    )
    assert audit is not None and audit.after_state == {"status": "contacted"}


@api
async def test_metrics_from_real_statistics(db_session: AsyncSession) -> None:
    from app.modules.markets.recommendation import market_recommendation, price_reference

    rec = await market_recommendation(db_session, "cá tra", None)
    price = await price_reference(db_session, "030462")
    metrics = build_metrics(
        rec.model_dump(mode="json"),
        price.model_dump(mode="json"),
        "thuế MFN 9%",
        ["Thẻ vàng IUU"],
        CompanyFacts(name="X", capacity_value=Decimal("1200"), capacity_unit="tonne"),
        {"marketing": Decimal("20000"), "revenue": Decimal("1000000")},
        "vi",
    )
    assert metrics["vn_rank"] == "1"
    assert metrics["company_capacity"] == "1200 tấn/năm"
    assert metrics["budget_ratio"] == "2,0%" and metrics["benchmark_pct"] == "5,0%"
    assert "OEM" in metrics["branding_advice"]
    assert metrics["price_position"] in {"cao hơn", "thấp hơn", "tương đương"}
    assert {"top1_country", "top3_vn_share", "comp1_country"} <= set(metrics)


@api
async def test_orientation_is_validated_and_stored(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    """N5: thương hiệu riêng thiếu ngân sách → 422; đủ trường → 202 và input lưu hướng bán."""
    await exporter(api_client)
    base = {
        "q": "cá tra",
        "target_market": "DE",
        "sales_orientation": "own_brand",
        "expected_revenue": "1000000",
    }
    assert (await api_client.post(URL, json=base)).status_code == 422
    r = await api_client.post(
        URL, json={**base, "budget": "50000", "target_market": "DE", "annual_volume": "300000"}
    )
    assert r.status_code == 202, r.text
    row = await db_session.get_one(MarketReport, uuid.UUID(r.json()["id"]))
    assert row.input["sales_orientation"] == "own_brand"
    assert row.input["target_market"] == "DE"
    assert Decimal(row.input["budget"]) == Decimal("50000")
    assert row.input["brand_model"] == "own_brand"
    assert Decimal(row.input["marketing_budget"]) == Decimal("50000")  # nuôi logic cũ


@api
async def test_bulk_orientation_needs_no_budget(
    api_client: AsyncClient, queued: list[uuid.UUID]
) -> None:
    await exporter(api_client)
    body = {
        "q": "cá tra",
        "target_market": "DE",
        "sales_orientation": "bulk",
        "expected_revenue": "1000000",
    }
    assert (await api_client.post(URL, json=body)).status_code == 202


@api
@pytest.mark.usefixtures("entitled")
async def test_report_starts_with_positioning_and_has_segments_slot(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    """N5: định vị đứng đầu, có điểm 4 trục; mục phân khúc nằm sau 'thị trường nên ưu tiên'."""
    await exporter(api_client)
    r = await api_client.post(URL, json={"q": "cá tra"})
    assert r.status_code == 202, r.text
    await run(db_session, queued[0], FakeChatModel(lambda s, u: valid_narrative()))
    got = (await api_client.get(f"{URL}/{r.json()['id']}")).json()
    keys = [s["key"] for s in got["sections"]]
    assert keys[0] == "positioning"
    assert keys.index("segments") == keys.index("why_market") + 1
    assert set(got["positioning"]["axes"]) == {"volume", "certification", "trust", "experience"}
    assert Decimal(got["positioning"]["score"]) >= 0
    segments = next(s for s in got["sections"] if s["key"] == "segments")
    assert segments["text"] == ""  # chưa có market_insights đã duyệt: không bịa nội dung


@api
@pytest.mark.usefixtures("entitled")
async def test_segments_show_only_reviewed_insight(
    api_client: AsyncClient, db_session: AsyncSession, queued: list[uuid.UUID]
) -> None:
    admin_id = await create_admin(db_session, "luat-tm@evfta.eu", PASSWORD)
    now = dt.datetime.now(dt.UTC)
    db_session.add_all(
        [
            MarketInsight(
                country="ES",
                hs_prefix="0304",
                segment="horeca",
                note_vi="Nhà hàng chuộng phi lê.",
                note_en="Restaurants favour fillets.",
                source="SYNTHETIC test",
                reviewed_by=admin_id,
                reviewed_at=now,
            ),
            MarketInsight(
                country="ES",
                hs_prefix="0304",
                segment="retail",
                note_vi="CHƯA DUYỆT KHÔNG ĐƯỢC LỘ.",
                note_en="UNREVIEWED MUST NOT LEAK",
                source="SYNTHETIC test",
            ),
        ]
    )
    await db_session.flush()
    await exporter(api_client)
    r = await api_client.post(URL, json={"hs": "030462"})
    assert r.status_code == 202, r.text
    await run(db_session, queued[0], FakeChatModel(lambda s, u: valid_narrative()))
    got = (await api_client.get(f"{URL}/{r.json()['id']}")).json()
    text = next(s for s in got["sections"] if s["key"] == "segments")["text"]
    assert "Nhà hàng chuộng phi lê." in text
    assert "KHÔNG ĐƯỢC LỘ" not in text


def test_target_market_metrics_and_orientation() -> None:
    from app.modules.markets.report import CompanyFacts

    de = {"country": "DE", "import_value": "1000000", "vn_share": "0.05", "import_cagr": "0.04"}
    rec = {"countries": [de], "top_markets": [de], "potential_markets": []}
    facts = CompanyFacts(
        name="X",
        target_market="DE",
        orientation="bulk",
        production_region="Cần Thơ",
        export_markets=("EU", "US"),
    )
    m = build_metrics(rec, None, None, [], facts, {}, "vi")
    assert m["target_country"] == "Đức"
    assert m["target_status"] == "thuộc nhóm thị trường nên ưu tiên"
    assert m["orientation"] == "xuất thô từ nhà máy"
    assert m["production_region"] == "Cần Thơ"
    assert m["export_markets_text"] == "EU, Hoa Kỳ"
    eu = build_metrics(rec, None, None, [], CompanyFacts(name="X", target_market="EU"), {}, "en")
    assert eu["target_country"] == "the whole EU" and "target_status" not in eu
