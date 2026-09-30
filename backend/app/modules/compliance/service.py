"""Logic tuân thủ. Mọi truy vấn dòng thuế công khai đi qua _reviewed_lines."""

import csv
import datetime as dt
import io
import uuid
from collections.abc import AsyncIterator
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.config import get_settings
from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.companies import service as companies
from app.modules.compliance.calculators import (
    EU_MEMBERS,
    CountryTerms,
    Material,
    QuotaData,
    QuotaDuty,
    QuotaResult,
    RooResult,
    RuleData,
    TariffLineData,
    quota_scenarios,
    rank_markets,
    roo_verdict,
    tariff_savings,
)
from app.modules.compliance.models import (
    CheckType,
    ComplianceCheck,
    ImportCountryTerm,
    ProductSpecificRule,
    ProductSubtype,
    SectorAlert,
    TariffLine,
    TariffQuota,
    TradeAgreement,
)
from app.modules.compliance.schemas import (
    AgreementOut,
    MarketRowOut,
    MarketsIn,
    MarketsOut,
    QuotaInfoOut,
    RooIn,
    RooOut,
    ScenarioOut,
    SectorAlertOut,
    SubtypeOut,
    TariffIn,
    TariffOptionsOut,
    TariffOut,
    TariffPreviewOut,
)

# EU là liên minh thuế quan: biểu thuế chung lưu ở destination 'EU' (một dòng/HS cho 27 nước).
UNION_DESTINATION = "EU"
DEFAULT_AGREEMENT = "EVFTA"
HEADING_LENGTH = 6  # mã HS 6 số — cấp danh mục và dòng thuế
# Cơ sở tính chỉ để lấy thuế suất (%); không hiển thị tiền nào ở màn xem thuế.
_RATE_BASIS = Decimal(100)


REVIEWED = "reviewed"
DEMO_UNREVIEWED = "demo_unreviewed"


def demo_enabled() -> bool:
    """AGENTS.md §6.2 (sửa đổi): dữ liệu minh hoạ chỉ khi cờ DEMO_COMPLIANCE_DATA bật VÀ ENV khác
    prod (cấu hình prod + cờ đã bị từ chối khi khởi động; đây là lớp chặn thứ hai)."""
    settings = get_settings()
    return settings.demo_compliance_data and settings.env != "prod"


def _visibility(model: Any, demo: bool) -> Any:
    """Dòng ĐÃ DUYỆT; hoặc (demo=True) dòng minh hoạ CHƯA duyệt. Dòng nháp không gắn is_demo không
    bao giờ khớp nhánh nào."""
    if demo:
        return (model.is_demo.is_(True)) & (model.reviewed_by.is_(None))
    return model.reviewed_by.is_not(None)


def destination_key(country: str) -> str:
    """Nước thành viên EU dùng biểu thuế chung 'EU'; nước khác dùng chính mã ISO-2."""
    return UNION_DESTINATION if country in EU_MEMBERS else country


def _reviewed_lines(
    hs_code: str,
    destination: str,
    on_date: dt.date,
    agreement: str = DEFAULT_AGREEMENT,
    demo: bool = False,
) -> Select[TariffLine]:
    """Dòng thuế ĐÃ DUYỆT (demo=True: dòng minh hoạ) đang hiệu lực vào `on_date` (valid_until là
    ngày đã hết hiệu lực)."""
    return select(TariffLine).where(
        _visibility(TariffLine, demo),
        TariffLine.hs_code == hs_code,
        TariffLine.destination == destination,
        TariffLine.agreement_code == agreement,
        TariffLine.valid_from <= on_date,
        or_(TariffLine.valid_until.is_(None), TariffLine.valid_until > on_date),
    )


async def find_lines(
    session: AsyncSession,
    hs_code: str,
    destination: str,
    on_date: dt.date,
    agreement: str = DEFAULT_AGREEMENT,
    demo: bool = False,
) -> list[TariffLine]:
    """Dòng đã duyệt khớp mã HS + nước đến + hiệp định vào `on_date` (đếm để phát hiện mơ hồ)."""
    result = await session.scalars(_reviewed_lines(hs_code, destination, on_date, agreement, demo))
    return list(result)


def _reviewed_rules(hs_code: str, on_date: dt.date) -> Select[Any]:
    """Quy tắc xuất xứ ĐÃ DUYỆT và đang hiệu lực vào `on_date`."""
    return select(ProductSpecificRule).where(
        ProductSpecificRule.reviewed_by.is_not(None),
        ProductSpecificRule.hs_code == hs_code,
        ProductSpecificRule.valid_from <= on_date,
        or_(ProductSpecificRule.valid_until.is_(None), ProductSpecificRule.valid_until > on_date),
    )


async def find_rules(
    session: AsyncSession, hs_code: str, on_date: dt.date
) -> list[ProductSpecificRule]:
    """Các quy tắc đã duyệt khớp mã HS (C4 dùng số lượng để phát hiện dữ liệu mơ hồ)."""
    return list(await session.scalars(_reviewed_rules(hs_code, on_date)))


def _reviewed_terms(hs_code: str, on_date: dt.date) -> Select[Any]:
    """Dòng VAT ĐÃ DUYỆT và đang hiệu lực vào `on_date`."""
    return select(ImportCountryTerm).where(
        ImportCountryTerm.reviewed_by.is_not(None),
        ImportCountryTerm.hs_code == hs_code,
        ImportCountryTerm.valid_from <= on_date,
        or_(ImportCountryTerm.valid_until.is_(None), ImportCountryTerm.valid_until > on_date),
    )


async def find_terms(
    session: AsyncSession, hs_code: str, on_date: dt.date
) -> list[ImportCountryTerm]:
    """Dòng VAT theo nước đã duyệt cho `hs_code` (mã chính xác của dòng thuế đã khớp)."""
    return list(
        await session.scalars(_reviewed_terms(hs_code, on_date).order_by(ImportCountryTerm.country))
    )


async def _supported_keys(session: AsyncSession, code: str) -> list[str]:
    """Khóa tra cứu theo thứ tự thử: mã nhập rồi nhóm 6 số, chỉ giữ mã trong danh mục hỗ trợ."""
    keys: list[str] = []
    for key in dict.fromkeys((code, code[:HEADING_LENGTH])):
        hs = await catalog.get_hs_code(session, key)
        if hs is not None and hs.supported:
            keys.append(key)
    return keys


async def lookup_lines(
    session: AsyncSession,
    code: str,
    on_date: dt.date,
    destination: str = UNION_DESTINATION,
    agreement: str = DEFAULT_AGREEMENT,
    demo: bool = False,
) -> list[TariffLine]:
    """Dòng thuế đã duyệt cho mã `code`: thử mã 8 số trước, không có thì lùi về nhóm 6 số.

    Mã 6 số KHÔNG tự chọn một mã 8 số con (các con có thể khác thuế, vd 081090)."""
    for key in await _supported_keys(session, code):
        lines = await find_lines(session, key, destination, on_date, agreement, demo)
        if lines:
            return lines
    return []


async def lookup_lines_visible(
    session: AsyncSession,
    code: str,
    on_date: dt.date,
    destination: str = UNION_DESTINATION,
    agreement: str = DEFAULT_AGREEMENT,
) -> tuple[list[TariffLine], bool]:
    """Dòng đã duyệt; không có và DEMO bật thì dòng minh hoạ. Trả (dòng, có dùng dữ liệu minh hoạ).
    Dòng đã duyệt luôn thắng — không bao giờ trộn hai loại."""
    lines = await lookup_lines(session, code, on_date, destination, agreement)
    if lines or not demo_enabled():
        return lines, False
    demo = await lookup_lines(session, code, on_date, destination, agreement, demo=True)
    return demo, bool(demo)


async def _agreement_out(session: AsyncSession, code: str) -> AgreementOut:
    row = await session.scalar(select(TradeAgreement).where(TradeAgreement.code == code))
    if row is None:  # khóa ngoại bảo đảm có; phòng dữ liệu hỏng thì vẫn hiện mã
        return AgreementOut(code=code, name_vi=code, name_en=code)
    return AgreementOut(code=row.code, name_vi=row.name_vi, name_en=row.name_en)


async def available_agreements(
    session: AsyncSession, code: str, country: str, on_date: dt.date
) -> list[AgreementOut]:
    """Hiệp định có dòng thuế ĐÃ DUYỆT cho (mã HS, thị trường) — nguồn DUY NHẤT để biết hiệp định
    nào áp dụng (bảng trade_agreements chỉ cho tên hiển thị)."""
    destination = destination_key(country)
    codes: list[str] = []
    modes = (False, True) if demo_enabled() else (False,)
    for key, demo in ((k, d) for k in await _supported_keys(session, code) for d in modes):
        found = await session.scalars(
            select(TariffLine.agreement_code)
            .where(
                _visibility(TariffLine, demo),
                TariffLine.hs_code == key,
                TariffLine.destination == destination,
                TariffLine.valid_from <= on_date,
                or_(TariffLine.valid_until.is_(None), TariffLine.valid_until > on_date),
            )
            .distinct()
        )
        codes.extend(c for c in found if c not in codes)
    return [await _agreement_out(session, c) for c in sorted(codes)]


def _prefix_of(code: str, column: Any) -> Any:
    """`column` (tiền tố HS 4–8 số) là tiền tố của mã `code`."""
    return literal(code).like(func.concat(column, "%"))


def _reviewed_quotas(
    code: str, destination: str, agreement: str, on_date: dt.date, demo: bool = False
) -> Select[TariffQuota]:
    """Hạn ngạch ĐÃ DUYỆT (demo=True: minh hoạ), đang hiệu lực, khớp hiệp định/nơi đến/tiền tố."""
    return select(TariffQuota).where(
        _visibility(TariffQuota, demo),
        TariffQuota.agreement_code == agreement,
        TariffQuota.destination == destination,
        _prefix_of(code, TariffQuota.hs_prefix),
        TariffQuota.valid_from <= on_date,
        or_(TariffQuota.valid_until.is_(None), TariffQuota.valid_until > on_date),
    )


def _reviewed_subtypes(code: str, demo: bool = False) -> Select[ProductSubtype]:
    """Phân nhóm ĐÃ DUYỆT (demo=True: minh hoạ) áp cho mã `code` (tiền tố HS khớp)."""
    return (
        select(ProductSubtype)
        .where(_visibility(ProductSubtype, demo), _prefix_of(code, ProductSubtype.hs_prefix))
        .order_by(ProductSubtype.code)
    )


async def visible_subtypes(session: AsyncSession, code: str) -> list[ProductSubtype]:
    rows = list(await session.scalars(_reviewed_subtypes(code)))
    if demo_enabled():
        rows += list(await session.scalars(_reviewed_subtypes(code, demo=True)))
    return rows


async def visible_quotas(
    session: AsyncSession, code: str, destination: str, agreement: str, on_date: dt.date
) -> tuple[list[TariffQuota], bool]:
    """Hạn ngạch đã duyệt; không có và DEMO bật thì hạn ngạch minh hoạ (đã duyệt luôn thắng)."""
    rows = list(await session.scalars(_reviewed_quotas(code, destination, agreement, on_date)))
    if rows or not demo_enabled():
        return rows, False
    demo = list(
        await session.scalars(_reviewed_quotas(code, destination, agreement, on_date, demo=True))
    )
    return demo, bool(demo)


def _is_visible(row: ProductSubtype) -> bool:
    return row.reviewed_by is not None or (demo_enabled() and row.is_demo)


async def alerts_for(session: AsyncSession, code: str, on_date: dt.date) -> list[SectorAlertOut]:
    """Cảnh báo ngành đang hiệu lực, tiền tố HS khớp `code`: đã duyệt, thêm minh hoạ khi DEMO."""
    modes = (False, True) if demo_enabled() else (False,)
    out: list[SectorAlertOut] = []
    for demo in modes:
        rows = await session.scalars(
            select(SectorAlert)
            .where(
                _visibility(SectorAlert, demo),
                SectorAlert.valid_from <= on_date,
                or_(SectorAlert.valid_until.is_(None), SectorAlert.valid_until > on_date),
            )
            .order_by(SectorAlert.code)
        )
        out.extend(
            SectorAlertOut(
                code=a.code,
                severity=a.severity,
                title_vi=a.title_vi,
                title_en=a.title_en,
                body_vi=a.body_vi,
                body_en=a.body_en,
                source_url=a.source_url,
                data_status=DEMO_UNREVIEWED if demo else REVIEWED,
            )
            for a in rows
            if any(code.startswith(prefix) for prefix in a.hs_prefixes)
        )
    return out


async def sector_alerts(session: AsyncSession, hs_code: str) -> list[SectorAlertOut]:
    code = catalog.normalize_code(hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    return await alerts_for(session, code, dt.datetime.now(dt.UTC).date())


def _subtype_out(row: ProductSubtype) -> SubtypeOut:
    return SubtypeOut(
        code=row.code,
        name_vi=row.name_vi,
        name_en=row.name_en,
        description_vi=row.description_vi,
        description_en=row.description_en,
    )


def _quota_data(row: TariffQuota) -> QuotaData:
    return QuotaData(
        QuotaDuty(row.in_quota_duty_type, row.in_quota_rate, row.in_quota_specific),
        QuotaDuty(row.out_quota_duty_type, row.out_quota_rate, row.out_quota_specific),
        row.specific_unit,
    )


def _quota_info(row: TariffQuota) -> QuotaInfoOut:
    return QuotaInfoOut(
        quota_code=row.quota_code,
        quota_year=row.quota_year,
        volume=row.volume,
        volume_unit=row.volume_unit,
        specific_unit=row.specific_unit,
        licence_note_vi=row.licence_note_vi,
        licence_note_en=row.licence_note_en,
        allocation_note_vi=row.allocation_note_vi,
        allocation_note_en=row.allocation_note_en,
        source_url=row.source_url,
    )


async def tariff_options(session: AsyncSession, hs_code: str, country: str) -> TariffOptionsOut:
    code = catalog.normalize_code(hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    upper = country.strip().upper()
    today = dt.datetime.now(dt.UTC).date()
    agreements = await available_agreements(session, code, upper, today)
    quota_agreements = [
        a.code
        for a in agreements
        if (await visible_quotas(session, code, destination_key(upper), a.code, today))[0]
    ]
    subtypes = await visible_subtypes(session, code) if quota_agreements else []
    return TariffOptionsOut(
        hs_code=code,
        destination=upper,
        agreements=agreements,
        subtypes=[_subtype_out(s) for s in subtypes],
        quota_agreements=quota_agreements,
    )


async def lookup_rules(
    session: AsyncSession, code: str, on_date: dt.date
) -> list[ProductSpecificRule]:
    """Quy tắc xuất xứ đã duyệt cho mã `code`, cùng thứ tự thử như lookup_lines."""
    for key in await _supported_keys(session, code):
        rules = await find_rules(session, key, on_date)
        if rules:
            return rules
    return []


async def log_check(
    session: AsyncSession,
    *,
    check_type: CheckType,
    hs_code: str,
    destination_country: str,
    status: str,
    company_id: uuid.UUID | None = None,
    product_value: Decimal | None = None,
    origin_country: str | None = None,
    mfn_duty_rate: Decimal | None = None,
    evfta_duty_rate: Decimal | None = None,
    savings_amount: Decimal | None = None,
    regional_value_content_pct: Decimal | None = None,
    originating_status: str | None = None,
    tariff_line_id: uuid.UUID | None = None,
    rule_id: uuid.UUID | None = None,
    agreement_code: str | None = None,
    data_status: str | None = None,
    scenario: dict[str, Any] | None = None,
) -> ComplianceCheck:
    """Nơi DUY NHẤT ghi compliance_checks: đúng một bản ghi cho mỗi lần chạy máy tính, kể cả khách.

    Chỉ flush; người gọi (endpoint C2/C4) commit cùng transaction với kết quả trả về.
    """
    row = ComplianceCheck(
        check_type=check_type,
        hs_code=hs_code,
        destination_country=destination_country,
        status=status,
        company_id=company_id,
        product_value=product_value,
        origin_country=origin_country,
        mfn_duty_rate=mfn_duty_rate,
        evfta_duty_rate=evfta_duty_rate,
        savings_amount=savings_amount,
        regional_value_content_pct=regional_value_content_pct,
        originating_status=originating_status,
        tariff_line_id=tariff_line_id,
        rule_id=rule_id,
        agreement_code=agreement_code,
        data_status=data_status,
        scenario=scenario,
    )
    session.add(row)
    await session.flush()
    return row


CSV_COLUMNS = [
    "id",
    "created_at",
    "check_type",
    "company_id",
    "hs_code",
    "product_value",
    "origin_country",
    "destination_country",
    "mfn_duty_rate",
    "evfta_duty_rate",
    "savings_amount",
    "regional_value_content_pct",
    "originating_status",
    "tariff_line_id",
    "rule_id",
    "status",
]


def _cell(value: Any) -> str:
    if value is None:
        return ""
    return value.isoformat() if isinstance(value, dt.datetime) else str(value)


async def export_checks_csv(session: AsyncSession, *, actor_id: uuid.UUID) -> AsyncIterator[str]:
    """Xuất mọi lần tính (cũ nhất trước) dạng CSV, từng khối. Ghi audit trước khi trả dòng đầu."""
    await record(
        session,
        actor_id=actor_id,
        action_type="compliance_checks.export",
        entity_type="compliance_checks",
        entity_id="csv",
        before=None,
        after=None,
    )
    await session.commit()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_COLUMNS)
    yield buf.getvalue()
    query = (
        select(ComplianceCheck)
        .order_by(ComplianceCheck.created_at, ComplianceCheck.id)
        .execution_options(yield_per=500)
    )
    async for row in await session.stream_scalars(query):
        buf.seek(0)
        buf.truncate()
        writer.writerow([_cell(getattr(row, col)) for col in CSV_COLUMNS])
        yield buf.getvalue()


def _line_data(line: TariffLine) -> TariffLineData:
    return TariffLineData(
        duty_type=line.duty_type,
        mfn_rate=line.mfn_rate,
        evfta_rate_current=line.evfta_rate_current,
        quota_required=line.quota_required,
        quota_note=line.quota_note,
        condition_note=line.condition_note,
        quota_note_en=line.quota_note_en,
        condition_note_en=line.condition_note_en,
    )


async def calculate_tariff(
    session: AsyncSession, data: TariffIn, user: CurrentUser | None
) -> TariffOut:
    """Công cụ tính thuế (C2, U12). Mỗi lần chạy hợp lệ ghi ĐÚNG MỘT compliance_checks."""
    code = catalog.normalize_code(data.hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    today = dt.datetime.now(dt.UTC).date()
    agreement = data.agreement
    if agreement is None:
        if data.destination in EU_MEMBERS:
            agreement = DEFAULT_AGREEMENT
        else:
            available = await available_agreements(session, code, data.destination, today)
            if len(available) > 1:
                raise AppError(
                    "agreement_required", "Choose a trade agreement for this market", 422
                )
            agreement = available[0].code if available else None
    lines, demo_used = (
        await lookup_lines_visible(
            session, code, today, destination_key(data.destination), agreement
        )
        if agreement
        else ([], False)
    )
    line = lines[0] if lines else None
    result = tariff_savings(
        None if line is None else _line_data(line),
        len(lines),
        data.product_value,
        data.shipments_per_year,
    )
    # U13 (AGENTS.md §6.4 sửa đổi): dòng có hạn ngạch → kịch bản chỉ khi có hạn ngạch và phân nhóm
    # đủ điều kiện ĐÃ DUYỆT; còn lại giữ needs_review của tariff_savings (không số).
    quota: TariffQuota | None = None
    quota_result: QuotaResult | None = None
    subtypes: list[ProductSubtype] = []
    if line is not None and len(lines) == 1 and line.quota_required and agreement:
        quotas, demo_quota = await visible_quotas(
            session, code, destination_key(data.destination), agreement, today
        )

        # Nhiều hạn ngạch cùng tiền tố (vd gạo xay xát / gạo thơm): chọn hạn ngạch liệt kê phân nhóm
        # người dùng chọn là đủ điều kiện; khớp nhiều hơn một = mơ hồ → needs_review.
        def lists(q: TariffQuota) -> ProductSubtype | None:
            return next(
                (s for s in q.eligible_subtypes if s.code == data.subtype_code and _is_visible(s)),
                None,
            )

        matching = [q for q in quotas if data.subtype_code and lists(q) is not None]
        if matching:
            quota, found, chosen_eligible = matching[0], len(matching), lists(matching[0])
        else:
            quota, found, chosen_eligible = (quotas[0] if quotas else None), len(quotas[:1]), None
        demo_used = (
            demo_used
            or (demo_quota and quota is not None)
            or bool(chosen_eligible and chosen_eligible.reviewed_by is None)
        )
        quota_result = quota_scenarios(
            found,
            None if quota is None else _quota_data(quota),
            subtype_chosen=data.subtype_code is not None,
            subtype_eligible=chosen_eligible is not None,
            product_value=data.product_value,
            quantity=data.quantity,
        )
        subtypes = await visible_subtypes(session, code)
    status = quota_result.status if quota_result is not None else result.status
    scenarios = quota_result.scenarios if quota_result is not None else ()
    quota_savings = quota_result.savings if quota_result is not None else None
    data_status = (DEMO_UNREVIEWED if demo_used else REVIEWED) if line is not None else None
    chosen = next((s for s in subtypes if s.code == data.subtype_code), None)
    conditions: list[str] = []
    if status == "quota_scenarios" and quota is not None:
        conditions = ["origin", "allocation", "subtype"]
        if quota.licence_note_vi or quota.licence_note_en:
            conditions.append("licence")
    company_id = await companies.get_company_id(session, user.id) if user else None
    check = await log_check(
        session,
        check_type=CheckType.tariff,
        hs_code=code,
        destination_country=data.destination,
        status=status,
        company_id=company_id,
        product_value=data.product_value,
        mfn_duty_rate=result.mfn_rate,
        evfta_duty_rate=result.evfta_rate,
        savings_amount=result.savings if quota_result is None else quota_savings,
        tariff_line_id=line.id if line is not None and len(lines) == 1 else None,
        agreement_code=agreement if line is not None else None,
        data_status=data_status,
        scenario=(
            {
                "subtype_code": data.subtype_code,
                "quantity": None if data.quantity is None else str(data.quantity),
                "quota_allocated": data.quota_allocated,
                "quota_id": None if quota is None else str(quota.id),
                "review_reason": quota_result.review_reason,
            }
            if quota_result is not None
            else None
        ),
    )
    await session.commit()
    return TariffOut(
        data_status=data_status,
        review_reason=None if quota_result is None else quota_result.review_reason,
        scenarios=[
            ScenarioOut(
                kind=s.kind,
                duty_type=s.duty_type.value,
                rate=s.rate,
                specific=s.specific,
                duty=s.duty,
            )
            for s in scenarios
        ],
        quota=_quota_info(quota) if quota is not None and status == "quota_scenarios" else None,
        subtype=None if chosen is None else _subtype_out(chosen),
        subtypes=[_subtype_out(s) for s in subtypes],
        conditions=conditions,
        alerts=await alerts_for(session, code, today),
        quantity=data.quantity if quota_result is not None else None,
        quota_allocated=data.quota_allocated if quota_result is not None else None,
        agreement=await _agreement_out(session, agreement) if agreement and line else None,
        preferential_rate=result.evfta_rate,
        preferential_duty=result.evfta_duty,
        check_id=str(check.id),
        status=status,
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        destination=data.destination,
        product_value=data.product_value,
        mfn_rate=result.mfn_rate,
        evfta_rate=result.evfta_rate,
        mfn_duty=result.mfn_duty,
        evfta_duty=result.evfta_duty,
        savings=result.savings if quota_result is None else quota_savings,
        annual_savings=result.annual_savings,
        quota_note=result.quota_note,
        condition_note=result.condition_note,
        quota_note_en=result.quota_note_en,
        condition_note_en=result.condition_note_en,
    )


async def preview_tariff(session: AsyncSession, hs_code: str) -> TariffPreviewOut:
    """Xem thuế MFN so với EVFTA của một mã HS. Chỉ đọc: KHÔNG ghi compliance_checks
    (không phải lần chạy máy tính chủ động). Dùng cùng dòng đã duyệt và cùng hàm thuần với C2."""
    code = catalog.normalize_code(hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    today = dt.datetime.now(dt.UTC).date()
    lines, demo_used = await lookup_lines_visible(session, code, today)
    line = lines[0] if lines else None
    result = tariff_savings(
        None if line is None else _line_data(line), len(lines), _RATE_BASIS, None
    )
    ok = result.status == "ok" and line is not None
    return TariffPreviewOut(
        data_status=(DEMO_UNREVIEWED if demo_used else REVIEWED) if line is not None else None,
        alerts=await alerts_for(session, code, today),
        status=result.status,
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        mfn_rate=result.mfn_rate,
        evfta_rate=result.evfta_rate,
        staging_category=line.staging_category if ok and line is not None else None,
        zero_from=line.zero_from if ok and line is not None else None,
        quota_note=result.quota_note,
        condition_note=result.condition_note,
        quota_note_en=result.quota_note_en,
        condition_note_en=result.condition_note_en,
        source_url=line.source_url if line is not None else None,
    )


async def rank_markets_for(
    session: AsyncSession, data: MarketsIn, user: CurrentUser | None
) -> MarketsOut:
    """Xếp hạng nước EU (thuế + VAT nhập khẩu). Mỗi lần gọi ghi ĐÚNG MỘT compliance_checks."""
    code = catalog.normalize_code(data.hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    today = dt.datetime.now(dt.UTC).date()
    lines = await lookup_lines(session, code, today)
    line = lines[0] if len(lines) == 1 else None
    terms: list[CountryTerms] = []
    if line is not None:
        found = await find_terms(session, line.hs_code, today)
        # Hai dòng VAT cùng nước đang hiệu lực = dữ liệu mơ hồ → nước đó coi như chưa có dữ liệu.
        ambiguous = {
            c for c in {t.country for t in found} if sum(t.country == c for t in found) > 1
        }
        terms = [
            CountryTerms(t.country, t.vat_rate, t.label_languages, t.note, t.note_en)
            for t in found
            if t.country not in ambiguous
        ]
    ranking = rank_markets(
        None if line is None else _line_data(line),
        len(lines),
        data.product_value,
        data.roo_status,
        terms,
    )
    company_id = await companies.get_company_id(session, user.id) if user else None
    ok = ranking.status == "ok" and line is not None
    check = await log_check(
        session,
        check_type=CheckType.tariff,
        hs_code=code,
        destination_country=UNION_DESTINATION,
        status=ranking.status,
        company_id=company_id,
        product_value=data.product_value,
        mfn_duty_rate=line.mfn_rate if ok and line is not None else None,
        evfta_duty_rate=line.evfta_rate_current if ok and line is not None else None,
        tariff_line_id=line.id if line is not None else None,
    )
    await session.commit()
    return MarketsOut(
        check_id=str(check.id),
        status=ranking.status,
        basis=ranking.basis,
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        product_value=data.product_value,
        duty_rate=ranking.duty_rate,
        rows=[MarketRowOut(**row.__dict__) for row in ranking.rows],
    )


# Theo bản nháp luật TM (chưa ký): nguyên liệu xuất xứ EU được cộng gộp như xuất xứ Việt Nam
# (Điều 3 Nghị định thư 1 EVFTA, câu hỏi Q6). Là hằng số hệ thống, không phải đầu vào người dùng.
EU_CUMULATION = True
ORIGIN_DESTINATION = "EU"


async def calculate_roo(session: AsyncSession, data: RooIn, user: CurrentUser | None) -> RooOut:
    """Máy tính quy tắc xuất xứ (C4). Mỗi lần chạy hợp lệ ghi ĐÚNG MỘT compliance_checks."""
    code = catalog.normalize_code(data.hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    rules = await lookup_rules(session, code, dt.datetime.now(dt.UTC).date())
    rule = rules[0] if len(rules) == 1 else None
    if len(rules) > 1:
        result = RooResult("inconclusive", reason="ambiguous_rule")
    else:
        result = roo_verdict(
            None
            if rule is None
            else RuleData(rule.rule_type, rule.threshold_pct, rule.requires_expert),
            code,
            data.ex_works_value,
            [Material(m.origin_country, m.value, m.hs_code) for m in data.materials],
            materials_declared=data.materials_declared,
            eu_cumulation=EU_CUMULATION,
        )
    company_id = await companies.get_company_id(session, user.id) if user else None
    check = await log_check(
        session,
        check_type=CheckType.roo,
        hs_code=code,
        destination_country=ORIGIN_DESTINATION,
        origin_country="VN",
        status=result.status,
        company_id=company_id,
        product_value=data.ex_works_value,
        regional_value_content_pct=result.rvc_pct,
        originating_status=result.status,
        rule_id=rule.id if rule is not None else None,
    )
    await session.commit()
    return RooOut(
        check_id=str(check.id),
        status=result.status,
        reason=result.reason,
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        ex_works_value=data.ex_works_value,
        nom_pct=result.nom_pct,
        rvc_pct=result.rvc_pct,
        rule_type=rule.rule_type.value if rule is not None else None,
        threshold_pct=rule.threshold_pct if rule is not None else None,
        rule_text=rule.rule_text if rule is not None else None,
        source=rule.source if rule is not None else None,
    )


async def sum_tariff_savings(session: AsyncSession, company_id: uuid.UUID) -> tuple[Decimal, int]:
    """(tổng tiền tiết kiệm EUR, số lần chạy) từ các lần chạy máy tính thuế THÀNH CÔNG của công ty.
    needs_review/unsupported không có con số nên không góp vào tổng (G1)."""
    row = (
        await session.execute(
            select(func.coalesce(func.sum(ComplianceCheck.savings_amount), 0), func.count()).where(
                ComplianceCheck.company_id == company_id,
                ComplianceCheck.check_type == CheckType.tariff,
                ComplianceCheck.status == "ok",
            )
        )
    ).one()
    return row[0] or Decimal(0), int(row[1])
