"""Báo cáo go-to-market (U18): exporter tạo yêu cầu → job chụp chỉ số, viết lời văn, dựng PDF →
xem bản tóm tắt (miễn phí) hoặc bản đầy đủ (cần quyền `gtm_report_full`, cấp ở module billing).

Lời văn: ChatModel chỉ viết placeholder; server điền số và kiểm tra (report.validate_narrative).
Model lỗi hoặc viết sai quy tắc → lời văn mẫu. CTA "Tư vấn triển khai qua mạng lưới VBA" tạo
consulting_leads cho admin theo dõi.
"""

import datetime as dt
import logging
import uuid
from collections.abc import Awaitable, Callable
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.chat import ChatModel, get_chat_model
from app.core.errors import AppError
from app.core.storage import Storage
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import product_service
from app.modules.companies import service as companies
from app.modules.compliance import service as compliance
from app.modules.compliance.schemas import TariffPreviewOut
from app.modules.markets import recommendation
from app.modules.markets.models import ConsultingLead, MarketReport
from app.modules.markets.report import (
    SECTION_TITLES,
    SECTIONS,
    SUMMARY_SECTIONS,
    CompanyFacts,
    build_metrics,
    country,
    eur,
    model_prompt,
    pct,
    template_narrative,
    validate_narrative,
)
from app.modules.markets.report_pdf import ReportDocument, ReportTable, render_report
from app.modules.markets.schemas import (
    AdminConsultingLeadOut,
    ConsultingLeadIn,
    ConsultingLeadOut,
    ConsultingLeadPatch,
    MarketRecommendationOut,
    ReportIn,
    ReportListItemOut,
    ReportOut,
    ReportSectionOut,
    ReportTableRowOut,
)

log = logging.getLogger(__name__)

FULL_REPORT = "gtm_report_full"
REPORTS_PER_DAY = 10
LEADS_PER_DAY = 5
FAILED_MESSAGE = "report_failed"

# ── Hàng đợi job và kiểm tra quyền (test / module billing thay) ──────────────
ReportEnqueuer = Callable[[uuid.UUID], Awaitable[None]]
EntitlementChecker = Callable[[AsyncSession, uuid.UUID, str], Awaitable[bool]]


async def _defer_report(report_id: uuid.UUID) -> None:
    try:
        from app.jobs.generate_market_report import generate_market_report

        await generate_market_report.defer_async(report_id=str(report_id))
    except Exception:
        log.exception("Không xếp được job báo cáo thị trường %s", report_id)


async def _no_entitlement(session: AsyncSession, company_id: uuid.UUID, feature: str) -> bool:
    """Mặc định đóng: chưa nối billing thì chỉ có bản tóm tắt."""
    return False


_enqueue_report: ReportEnqueuer = _defer_report
_entitled: EntitlementChecker = _no_entitlement


def set_report_enqueuer(enqueuer: ReportEnqueuer) -> ReportEnqueuer:
    global _enqueue_report
    previous, _enqueue_report = _enqueue_report, enqueuer
    return previous


def set_entitlement_checker(checker: EntitlementChecker) -> EntitlementChecker:
    global _entitled
    previous, _entitled = _entitled, checker
    return previous


async def _exporter_company_id(session: AsyncSession, user: CurrentUser) -> uuid.UUID:
    if user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return company_id


async def _count_since(session: AsyncSession, model: Any, company_id: uuid.UUID) -> int:
    since = dt.datetime.now(dt.UTC) - dt.timedelta(days=1)
    count = await session.scalar(
        select(func.count())
        .select_from(model)
        .where(model.company_id == company_id, model.created_at >= since)
    )
    return int(count or 0)


# ── Tạo yêu cầu ───────────────────────────────────────────────────────────────
async def create_report(
    session: AsyncSession, user: CurrentUser, data: ReportIn, storage: Storage
) -> ReportOut:
    company_id = await _exporter_company_id(session, user)
    if await _count_since(session, MarketReport, company_id) >= REPORTS_PER_DAY:
        raise AppError("report_limit", "Daily report limit reached, try again tomorrow", 429)
    query, hs, brand_model = data.q.strip(), data.hs, data.brand_model
    if data.product_id is not None:
        product = await product_service.get_product(session, user, storage, data.product_id)
        query, hs = query or product.name, hs or product.hs_code[:6]
        brand_model = brand_model or product.brand_model  # type: ignore[assignment]
    rec = await recommendation.market_recommendation(session, query, hs)
    if rec.status != "ok" or rec.family is None:
        raise AppError(
            "no_trade_data",
            "No imported trade statistics for this product yet; try another product",
            422,
        )
    row = MarketReport(
        company_id=company_id,
        requested_by=user.id,
        product_id=data.product_id,
        query=(query or rec.family.name_vi)[:100],
        language=data.language,
        input={
            "hs": hs,
            "family": rec.family.family,
            "brand_model": brand_model,
            "marketing_budget": _str(data.marketing_budget),
            "expected_revenue": _str(data.expected_revenue),
        },
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await _enqueue_report(row.id)
    return await _out(storage, row, full=await _entitled(session, company_id, FULL_REPORT))


def _str(value: Decimal | None) -> str | None:
    return None if value is None else str(value)


def _dec(value: Any) -> Decimal | None:
    return None if value in (None, "") else Decimal(str(value))


# ── Thân job ──────────────────────────────────────────────────────────────────
def tariff_text(tariff: TariffPreviewOut, lang: str) -> str:
    """Mô tả thuế từ dòng đã duyệt (hoặc minh hoạ khi bật DEMO). Không có dòng → nói rõ."""
    vi = lang == "vi"
    if tariff.status == "ok" and tariff.mfn_rate is not None and tariff.evfta_rate is not None:
        mfn = f"{tariff.mfn_rate.normalize():f}%"
        pref = f"{tariff.evfta_rate.normalize():f}%"
        text = (
            f"thuế MFN {mfn}, thuế ưu đãi EVFTA {pref}"
            if vi
            else f"MFN duty {mfn}, EVFTA preferential duty {pref}"
        )
        if tariff.zero_from and tariff.evfta_rate > 0:
            text += (
                f" (về 0% từ {tariff.zero_from:%d/%m/%Y})"
                if vi
                else f" (0% from {tariff.zero_from:%d/%m/%Y})"
            )
        note = tariff.quota_note if vi else tariff.quota_note_en
        return f"{text}; {note}" if note else text
    if tariff.status == "needs_review":
        return (
            "cần chuyên gia rà soát (hạn ngạch hoặc điều kiện đặc biệt), chưa có mức thuế đã duyệt"
            if vi
            else "needs expert review (quota or special conditions); no reviewed rate yet"
        )
    return (
        "chưa có dữ liệu thuế đã duyệt cho mã hàng này"
        if vi
        else "no reviewed tariff data for this code yet"
    )


def _rows(markets: list[Any]) -> list[ReportTableRowOut]:
    return [
        ReportTableRowOut(
            country=m.country,
            value=m.import_value,
            share=m.vn_share,
            growth=m.import_cagr,
            unit_price=m.vn_unit_price,
        )
        for m in markets
    ]


def _tables(rec: MarketRecommendationOut) -> dict[str, list[dict[str, Any]]]:
    competitors = [
        ReportTableRowOut(country=c.partner, value=c.value, share=c.share, unit_price=c.unit_price)
        for c in rec.competitors[:6]
    ]
    return {
        "top_markets": [r.model_dump(mode="json") for r in _rows(rec.top_markets)],
        "potential_markets": [r.model_dump(mode="json") for r in _rows(rec.potential_markets)],
        "competitors": [r.model_dump(mode="json") for r in competitors],
    }


def _pdf_tables(tables: dict[str, list[dict[str, Any]]], lang: str) -> list[ReportTable]:
    def share(value: Any) -> str:
        return pct(Decimal(value), lang) if value is not None else "—"

    def market_rows(key: str) -> list[list[str]]:
        return [
            [
                country(r["country"], lang),
                eur(Decimal(r["value"]), lang),
                share(r["growth"]),
                share(r["share"]),
            ]
            for r in tables.get(key, [])
        ]

    competitor_rows = [
        [
            country(r["country"], lang),
            eur(Decimal(r["value"]), lang),
            share(r["share"]),
            f"{Decimal(r['unit_price']):.2f}" if r.get("unit_price") else "—",
        ]
        for r in tables.get("competitors", [])
    ]
    return [
        ReportTable("top", market_rows("top_markets")),
        ReportTable("potential", market_rows("potential_markets")),
        ReportTable("competitors", competitor_rows),
    ]


async def _narrative(
    chat: ChatModel, metrics: dict[str, str], lang: str
) -> tuple[dict[str, str], str]:
    system, user = model_prompt(metrics, lang)
    try:
        raw = await chat.complete(system, user)
    except Exception:
        log.warning("ChatModel lỗi khi viết báo cáo; dùng lời văn mẫu", exc_info=True)
        raw = ""
    written = validate_narrative(raw, metrics)
    if written is not None:
        return written, "model"
    return template_narrative(metrics, lang), "template"


async def run_report(
    session: AsyncSession,
    storage: Storage,
    report_id: uuid.UUID,
    chat: ChatModel | None = None,
) -> None:
    """Chạy lại không làm lại báo cáo đã xong. Lỗi → failed kèm mã lỗi, không lộ chi tiết."""
    row = await session.get(MarketReport, report_id)
    if row is None or row.status == "ready":
        return
    row.status = "running"
    await session.commit()
    lang = row.language
    try:
        rec = await recommendation.market_recommendation(session, row.query, row.input.get("hs"))
        if rec.status != "ok" or rec.family is None:
            raise AppError("no_trade_data", "No trade statistics", 422)
        hs6 = (row.input.get("hs") or rec.family.products[0])[:6]
        price = await recommendation.price_reference(session, hs6)
        tariff = await compliance.preview_tariff(session, hs6)
        alerts = [a.title_vi if lang == "vi" else a.title_en for a in tariff.alerts]
        company = await companies.get_company_for_review(session, row.company_id)
        facts = CompanyFacts(
            name=company.legal_name,
            capacity_value=company.capacity_value,
            capacity_unit=company.capacity_unit,
            capacity_period=company.capacity_period,
            brand_model=row.input.get("brand_model"),
        )
        budget = {
            "marketing": _dec(row.input.get("marketing_budget")),
            "revenue": _dec(row.input.get("expected_revenue")),
        }
        values = build_metrics(
            rec.model_dump(mode="json"),
            price.model_dump(mode="json"),
            tariff_text(tariff, lang),
            alerts,
            facts,
            budget,
            lang,
        )
        narrative, source = await _narrative(chat or get_chat_model(), values, lang)
        tables = _tables(rec)
        titles = SECTION_TITLES[lang]
        pdf = render_report(
            ReportDocument(
                language=lang,
                company_name=company.legal_name,
                product_name=values["product_name"],
                created=dt.datetime.now(dt.UTC).date(),
                source=values["source"],
                narrative_source=source,
                sections=[(key, titles[key], narrative.get(key, "")) for key in SECTIONS],
                tables=_pdf_tables(tables, lang),
                demo_data=tariff.data_status == "demo_unreviewed",
            )
        )
        key = f"market-reports/{row.company_id}/{uuid.uuid4().hex}.pdf"
        await storage.put(key, pdf, "application/pdf")
    except Exception as exc:
        await session.rollback()
        row = await session.get_one(MarketReport, report_id)
        row.status = "failed"
        row.error = exc.code if isinstance(exc, AppError) else FAILED_MESSAGE
        row.finished_at = dt.datetime.now(dt.UTC)
        await session.commit()
        log.exception("Báo cáo thị trường %s lỗi", report_id)
        return
    row.metrics = {
        "values": values,
        "tables": tables,
        "year": rec.year,
        "source": values["source"],
        "product_name": values["product_name"],
        "tariff_data_status": tariff.data_status,
    }
    row.narrative = narrative
    row.narrative_source = source
    row.pdf_key = key
    row.status = "ready"
    row.error = None
    row.finished_at = dt.datetime.now(dt.UTC)
    await session.commit()


# ── Xem ───────────────────────────────────────────────────────────────────────
async def _out(storage: Storage, row: MarketReport, *, full: bool) -> ReportOut:
    base = ReportListItemOut.model_validate(row).model_dump()
    if row.status != "ready" or row.metrics is None or row.narrative is None:
        return ReportOut(**base, full=full, error=row.error)
    titles = SECTION_TITLES.get(row.language, SECTION_TITLES["vi"])
    sections = []
    for key in SECTIONS:
        locked = not full and key not in SUMMARY_SECTIONS
        text = "" if locked else str(row.narrative.get(key, ""))
        sections.append(ReportSectionOut(key=key, title=titles[key], text=text, locked=locked))
    tables = row.metrics.get("tables", {})
    return ReportOut.model_validate(
        {
            **base,
            "full": full,
            "product_name": row.metrics.get("product_name"),
            "year": row.metrics.get("year"),
            "source": row.metrics.get("source"),
            "narrative_source": row.narrative_source,
            "tariff_data_status": row.metrics.get("tariff_data_status"),
            "sections": sections,
            "top_markets": tables.get("top_markets", []),
            "potential_markets": tables.get("potential_markets", []),
            "competitors": tables.get("competitors", []) if full else [],
            "pdf_url": await storage.presign_get(row.pdf_key) if full and row.pdf_key else None,
        }
    )


async def list_reports(session: AsyncSession, user: CurrentUser) -> list[ReportListItemOut]:
    company_id = await _exporter_company_id(session, user)
    rows = await session.scalars(
        select(MarketReport)
        .where(MarketReport.company_id == company_id)
        .order_by(MarketReport.created_at.desc())
        .limit(50)
    )
    return [ReportListItemOut.model_validate(r) for r in rows]


async def get_report(
    session: AsyncSession, user: CurrentUser, storage: Storage, report_id: uuid.UUID
) -> ReportOut:
    company_id = await _exporter_company_id(session, user)
    row = await session.get(MarketReport, report_id)
    if row is None or row.company_id != company_id:
        raise AppError("report_not_found", "Report not found", 404)
    return await _out(storage, row, full=await _entitled(session, company_id, FULL_REPORT))


# ── Tư vấn triển khai qua mạng lưới VBA ─────────────────────────────────────
async def create_lead(
    session: AsyncSession, user: CurrentUser, data: ConsultingLeadIn
) -> ConsultingLeadOut:
    company_id = await _exporter_company_id(session, user)
    if data.report_id is not None:
        report = await session.get(MarketReport, data.report_id)
        if report is None or report.company_id != company_id:
            raise AppError("report_not_found", "Report not found", 404)
    if await _count_since(session, ConsultingLead, company_id) >= LEADS_PER_DAY:
        raise AppError("lead_limit", "Too many requests today, we will contact you soon", 429)
    lead = ConsultingLead(
        company_id=company_id,
        report_id=data.report_id,
        contact_name=data.contact_name.strip(),
        contact_email=str(data.contact_email),
        phone=(data.phone or "").strip() or None,
        message=(data.message or "").strip() or None,
    )
    session.add(lead)
    await session.commit()
    await session.refresh(lead)
    return ConsultingLeadOut.model_validate(lead)


async def admin_list_leads(
    session: AsyncSession, status: str | None = None
) -> list[AdminConsultingLeadOut]:
    stmt = select(ConsultingLead).order_by(ConsultingLead.created_at.desc()).limit(200)
    if status:
        stmt = stmt.where(ConsultingLead.status == status)
    leads = list(await session.scalars(stmt))
    names = await companies.get_company_summaries(session, list({x.company_id for x in leads}))
    report_ids = [x.report_id for x in leads if x.report_id]
    queries = dict(
        (
            await session.execute(
                select(MarketReport.id, MarketReport.query).where(MarketReport.id.in_(report_ids))
            )
        ).all()
    )
    return [
        AdminConsultingLeadOut(
            **ConsultingLeadOut.model_validate(x).model_dump(),
            company_name=names[x.company_id].legal_name if x.company_id in names else "",
            report_query=queries.get(x.report_id) if x.report_id else None,
        )
        for x in leads
    ]


async def admin_update_lead(
    session: AsyncSession, admin: CurrentUser, lead_id: uuid.UUID, data: ConsultingLeadPatch
) -> ConsultingLeadOut:
    lead = await session.get(ConsultingLead, lead_id)
    if lead is None:
        raise AppError("lead_not_found", "Consulting request not found", 404)
    before = {"status": lead.status}
    lead.status = data.status
    lead.handled_by = admin.id
    lead.handled_at = dt.datetime.now(dt.UTC)
    await session.flush()
    await record(
        session,
        actor_id=admin.id,
        action_type="consulting_lead.update",
        entity_type="consulting_lead",
        entity_id=str(lead.id),
        before=before,
        after={"status": lead.status},
    )
    await session.commit()
    await session.refresh(lead)
    return ConsultingLeadOut.model_validate(lead)
