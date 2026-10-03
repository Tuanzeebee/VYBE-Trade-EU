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
from app.modules.compliance import disclaimer
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
    TariffResult,
    customs_value,
    evfta_rate,
    evfta_stage,
    quota_scenarios,
    rank_markets,
    roo_verdict,
    tariff_savings,
    unreviewed_components,
)
from app.modules.compliance.evidence import (
    RequirementData,
    ShipmentData,
    list_review_state,
    required_evidence,
)
from app.modules.compliance.models import (
    CheckType,
    ComplianceCheck,
    ComplianceEvidenceRequirement,
    ComplianceEvidenceType,
    CustomsValuationRule,
    HsCodeCompliance,
    ImportCountryTerm,
    ProductSpecificRule,
    ProductSubtype,
    RooQuestion,
    SectorAlert,
    StagingCategory,
    TariffLine,
    TariffQuota,
    TradeAgreement,
)
from app.modules.compliance.origin import (
    REASONS,
    SUPPORTED_RULE_TYPES,
    OriginAnswers,
    OriginRule,
    Reason,
    answer_schema,
    evaluate_origin,
)
from app.modules.compliance.quota import (
    BalanceInfo,
    PeriodInfo,
    QuotaEconomics,
    balance_status,
    convert_quantity,
    period_info,
    quota_economics,
    shipment_share_pct,
)
from app.modules.compliance.quota_store import latest_balance
from app.modules.compliance.schemas import (
    AgreementOut,
    EvidenceItemOut,
    MarketRowOut,
    MarketsIn,
    MarketsOut,
    OriginIn,
    OriginInputOut,
    OriginOut,
    OriginQuestionOut,
    OriginQuestionsOut,
    OriginReasonOut,
    QuotaBalanceStateOut,
    QuotaEconomicsOut,
    QuotaInfoOut,
    RequiredEvidenceOut,
    RooIn,
    RooOut,
    ScenarioOut,
    SectorAlertOut,
    StagingOut,
    SubtypeOut,
    TariffIn,
    TariffOptionsOut,
    TariffOut,
    TariffPreviewOut,
    ValuationOut,
    ValueStepOut,
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
    # demo=True nghĩa là "dòng chưa duyệt": SPEC_compliance_data_20_codes §2.2 cho dùng và hiển thị
    # kèm lưu ý ở mọi môi trường (thay cho điều kiện is_demo + cờ của AGENTS.md §6.2).
    visible = TariffLine.reviewed_by.is_(None) if demo else TariffLine.reviewed_by.is_not(None)
    return select(TariffLine).where(
        visible,
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
    """Dòng đã duyệt; không có thì dòng chưa duyệt. Trả (dòng, có dùng dữ liệu chưa duyệt).
    Dòng đã duyệt luôn thắng — không bao giờ trộn hai loại."""
    # Mã cụ thể nhất thắng: với mỗi khoá (mã nhập, rồi nhóm 6 số) thử dòng đã duyệt, rồi dòng chưa
    # duyệt, trước khi lùi sang khoá chung hơn — để dòng 8 số mới không bị dòng 6 số cũ che mất.
    for key in await _supported_keys(session, code):
        lines = await find_lines(session, key, destination, on_date, agreement)
        if lines:
            return lines, False
        unreviewed = await find_lines(session, key, destination, on_date, agreement, demo=True)
        if unreviewed:
            return unreviewed, True
    return [], False


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


def _quota_info(
    row: TariffQuota,
    *,
    period: PeriodInfo | None = None,
    balance: BalanceInfo | None = None,
    balance_source: str | None = None,
    share_pct: Decimal | None = None,
    economics: QuotaEconomics | None = None,
) -> QuotaInfoOut:
    return QuotaInfoOut(
        period_start=row.period_start,
        period_end=row.period_end,
        days_left=None if period is None else period.days_left,
        in_period=None if period is None else period.in_period,
        allocation_method=row.allocation_method,
        licence_required=row.licence_required,
        licence_issuer_vi=row.licence_issuer_vi,
        balance=None
        if balance is None
        else QuotaBalanceStateOut(
            status=balance.status,
            as_of=balance.as_of,
            used=balance.used,
            remaining=balance.remaining,
            remaining_pct=balance.remaining_pct,
            stale=balance.stale,
            source=balance_source,
        ),
        share_pct=share_pct,
        economics=None
        if economics is None
        else QuotaEconomicsOut(
            savings=economics.savings,
            savings_per_unit=economics.savings_per_unit,
            savings_pct_of_value=economics.savings_pct_of_value,
            access_cost=economics.access_cost,
            net_benefit=economics.net_benefit,
            worthwhile=economics.worthwhile,
        ),
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
    review_state: str | None = None,
    unreviewed_components: list[str] | None = None,
    data_version: str | None = None,
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
        review_state=review_state,
        unreviewed_components=unreviewed_components,
        data_version=data_version,
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


def _line_data(line: TariffLine, evfta_rate_now: Decimal | None = None) -> TariffLineData:
    return TariffLineData(
        duty_type=line.duty_type,
        mfn_rate=line.mfn_rate,
        evfta_rate_current=evfta_rate_now
        if evfta_rate_now is not None
        else line.evfta_rate_current,
        quota_required=line.quota_required,
        quota_note=line.quota_note,
        condition_note=line.condition_note,
        quota_note_en=line.quota_note_en,
        condition_note_en=line.condition_note_en,
    )


async def _evfta_rate_now(
    session: AsyncSession, line: TariffLine, on_date: dt.date
) -> Decimal | None:
    """Thuế EVFTA tại `on_date` tính từ thuế cơ sở và nhóm lộ trình (SPEC §5.1). None khi dòng
    không có base_rate/nhóm lộ trình (dòng nhập tay dùng evfta_rate_current như trước)."""
    if line.base_rate is None or line.staging_category is None:
        return None
    stage = await session.get(StagingCategory, line.staging_category)
    if stage is None:
        return None
    return evfta_rate(line.base_rate, stage.stages, on_date)


async def _valuation_rule(
    session: AsyncSession, country: str, on_date: dt.date
) -> CustomsValuationRule | None:
    """Quy tắc trị giá của nước đến tại `on_date` (bản đã duyệt thắng bản chưa duyệt)."""
    rows = list(
        await session.scalars(
            select(CustomsValuationRule).where(
                CustomsValuationRule.country == country,
                CustomsValuationRule.valid_from <= on_date,
                or_(
                    CustomsValuationRule.valid_until.is_(None),
                    CustomsValuationRule.valid_until > on_date,
                ),
            )
        )
    )
    candidates = [r for r in rows if r.reviewed_by is not None] or rows
    return candidates[0] if candidates else None


async def _staging_out(
    session: AsyncSession, line: TariffLine, on_date: dt.date
) -> StagingOut | None:
    """Bậc cắt giảm EVFTA đang áp dụng tại ngày tính (None khi dòng không theo lộ trình)."""
    if line.base_rate is None or line.staging_category is None:
        return None
    stage = await session.get(StagingCategory, line.staging_category)
    if stage is None:
        return None
    return StagingOut(
        category=line.staging_category,
        stage=evfta_stage(stage.stages, on_date),
        stages=stage.stages,
        zero_from=stage.zero_from,
    )


async def _review_state(
    session: AsyncSession, line: TariffLine | None, extra: list[str] | None = None
) -> tuple[str, list[str], str | None]:
    """(review_state, thành phần chưa duyệt, data_version) của kết quả thuế."""
    if line is None:
        return disclaimer.REVIEWED, [], None
    mapping = await session.get(HsCodeCompliance, line.hs_code)
    components = unreviewed_components(
        line_reviewed=line.reviewed_by is not None,
        mfn_source=line.mfn_source,
        mfn_verified_taric=line.mfn_verified_taric,
        cn_mapping_verified=None if mapping is None else mapping.cn_mapping_verified,
    ) + (extra or [])
    state = disclaimer.UNREVIEWED if components else disclaimer.REVIEWED
    return state, components, line.data_version


async def calculate_tariff(
    session: AsyncSession,
    data: TariffIn,
    user: CurrentUser | None,
    accept_language: str | None = None,
    on_date: dt.date | None = None,
) -> TariffOut:
    """Công cụ tính thuế (C2, U12). Mỗi lần chạy hợp lệ ghi ĐÚNG MỘT compliance_checks.

    `on_date` chỉ cho test/nội bộ (mặc định hôm nay UTC)."""
    code = catalog.normalize_code(data.hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    today = on_date or data.import_date or dt.datetime.now(dt.UTC).date()
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
    rate_now = None if line is None else await _evfta_rate_now(session, line, today)
    # C2-A: thuế tính trên TRỊ GIÁ TÍNH THUẾ (CIF hoặc FOB theo nước đến), không phải giá hóa đơn.
    rule = None if line is None else await _valuation_rule(session, data.destination, today)
    valuation = (
        None
        if line is None
        else customs_value(
            data.product_value,
            data.incoterm,
            freight=data.freight,
            insurance=data.insurance,
            post_border=data.post_border_costs,
            basis=None if rule is None else ("FOB" if rule.basis == "FOB" else "CIF"),
        )
    )
    value_ok = valuation is None or valuation.status == "ok"
    duty_value = (
        valuation.customs_value
        if valuation is not None and valuation.customs_value is not None
        else data.product_value
    )
    if value_ok:
        result = tariff_savings(
            None if line is None else _line_data(line, rate_now),
            len(lines),
            duty_value,
            data.shipments_per_year,
        )
    else:
        result = TariffResult("needs_review")  # không có trị giá thì không có con số nào
    # U13 (AGENTS.md §6.4 sửa đổi): dòng có hạn ngạch → kịch bản chỉ khi có hạn ngạch và phân nhóm
    # đủ điều kiện ĐÃ DUYỆT; còn lại giữ needs_review của tariff_savings (không số).
    quota: TariffQuota | None = None
    quota_result: QuotaResult | None = None
    quota_info: QuotaInfoOut | None = None
    subtypes: list[ProductSubtype] = []
    if line is not None and len(lines) == 1 and line.quota_required and agreement and value_ok:
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
        # C2-C: quy đổi khối lượng người dùng nhập về đơn vị thuế của hạn ngạch (kg ↔ tấn); đơn vị
        # không quy đổi được thì needs_review, không đoán.
        qty_duty = data.quantity
        qty_volume: Decimal | None = None
        unit_mismatch = False
        if quota is not None and data.quantity is not None:
            given = data.quantity_unit or quota.specific_unit or quota.volume_unit
            if quota.specific_unit:
                qty_duty = convert_quantity(data.quantity, given, quota.specific_unit)
                unit_mismatch = qty_duty is None
            qty_volume = convert_quantity(data.quantity, given, quota.volume_unit)
        quota_result = (
            QuotaResult("needs_review", "unit_mismatch")
            if unit_mismatch
            else quota_scenarios(
                found,
                None if quota is None else _quota_data(quota),
                subtype_chosen=data.subtype_code is not None,
                subtype_eligible=chosen_eligible is not None,
                product_value=duty_value,
                quantity=qty_duty,
            )
        )
        if (
            quota_result.status == "quota_scenarios"
            and quota is not None
            and quota_result.savings is not None
        ):
            real_today = dt.datetime.now(dt.UTC).date()
            latest = await latest_balance(session, quota)
            settings = get_settings()
            quota_balance = balance_status(
                quota.volume,
                None if latest is None else latest.used_volume,
                None if latest is None else latest.as_of,
                today=real_today,
                low_pct=settings.quota_low_balance_pct,
                stale_days=settings.quota_balance_stale_days,
            )
            quota_info = _quota_info(
                quota,
                period=period_info(quota.period_start, quota.period_end, today),
                balance=quota_balance,
                balance_source=None if latest is None else latest.source,
                share_pct=shipment_share_pct(qty_volume, quota.volume),
                economics=quota_economics(
                    quota_result.savings,
                    duty_value,
                    qty_duty if qty_duty is not None else qty_volume,
                    data.quota_access_cost,
                ),
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
    review_reason = (
        quota_result.review_reason
        if quota_result is not None
        else (valuation.reason.lower() if valuation is not None and valuation.reason else None)
    )
    extra_components = (
        ["customs_valuation"]
        if rule is not None and rule.reviewed_by is None and data.incoterm
        else []
    )
    review_state, unreviewed, data_version = await _review_state(
        session, line if len(lines) == 1 else None, extra_components
    )
    scenario: dict[str, Any] = {}
    if quota_result is not None:
        scenario.update(
            {
                "subtype_code": data.subtype_code,
                "quantity": None if data.quantity is None else str(data.quantity),
                "quota_allocated": data.quota_allocated,
                "quantity_unit": data.quantity_unit,
                "quota_access_cost": None
                if data.quota_access_cost is None
                else str(data.quota_access_cost),
                "quota_id": None if quota is None else str(quota.id),
                "review_reason": quota_result.review_reason,
            }
        )
    valuation_out = (
        None
        if valuation is None
        else ValuationOut(
            incoterm=data.incoterm,
            currency=data.currency,
            basis=None if rule is None else ("FOB" if rule.basis == "FOB" else "CIF"),
            invoice_value=data.product_value,
            customs_value=valuation.customs_value,
            steps=[ValueStepOut(code=s.code, amount=s.amount) for s in valuation.steps],
            warnings=list(valuation.warnings),
        )
    )
    if valuation_out is not None:
        scenario["valuation"] = valuation_out.model_dump(mode="json")
        scenario["import_date"] = today.isoformat()
    reasons = {"unsupported": ["NOT_SUPPORTED"], "needs_review": ["NEEDS_MANUAL_CHECK"]}.get(
        status, []
    )
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
        review_state=review_state if line is not None else None,
        unreviewed_components=unreviewed if line is not None else None,
        data_version=data_version,
        scenario=scenario or None,
    )
    await session.commit()
    return TariffOut(
        customs_value=valuation.customs_value if valuation is not None else None,
        valuation=valuation_out,
        rate_date=today,
        staging=None if line is None else await _staging_out(session, line, today),
        data_status=data_status,
        review_state=review_state,
        unreviewed_components=unreviewed,
        disclaimer=disclaimer.disclaimer_for(review_state, accept_language) if line else None,
        reasons=reasons,
        review_reason=review_reason,
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
        quota=quota_info if status == "quota_scenarios" else None,
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


async def preview_tariff(
    session: AsyncSession, hs_code: str, accept_language: str | None = None
) -> TariffPreviewOut:
    """Xem thuế MFN so với EVFTA của một mã HS. Chỉ đọc: KHÔNG ghi compliance_checks
    (không phải lần chạy máy tính chủ động). Dùng cùng dòng đã duyệt và cùng hàm thuần với C2."""
    code = catalog.normalize_code(hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    today = dt.datetime.now(dt.UTC).date()
    lines, demo_used = await lookup_lines_visible(session, code, today)
    line = lines[0] if lines else None
    rate_now = None if line is None else await _evfta_rate_now(session, line, today)
    result = tariff_savings(
        None if line is None else _line_data(line, rate_now), len(lines), _RATE_BASIS, None
    )
    ok = result.status == "ok" and line is not None
    review_state, unreviewed, _ = await _review_state(session, line if len(lines) == 1 else None)
    return TariffPreviewOut(
        review_state=review_state,
        unreviewed_components=unreviewed,
        disclaimer=disclaimer.disclaimer_for(review_state, accept_language) if line else None,
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


def _unreviewed_rules(hs_code: str, on_date: dt.date) -> Select[Any]:
    return select(ProductSpecificRule).where(
        ProductSpecificRule.reviewed_by.is_(None),
        ProductSpecificRule.hs_code == hs_code,
        ProductSpecificRule.valid_from <= on_date,
        or_(ProductSpecificRule.valid_until.is_(None), ProductSpecificRule.valid_until > on_date),
    )


async def lookup_rules_visible(
    session: AsyncSession, code: str, on_date: dt.date
) -> list[ProductSpecificRule]:
    """Quy tắc đã duyệt; không có thì quy tắc chưa duyệt (SPEC §2.2). Đã duyệt luôn thắng."""
    for key in await _supported_keys(
        session, code
    ):  # mã cụ thể nhất thắng (xem lookup_lines_visible)
        reviewed = await find_rules(session, key, on_date)
        if reviewed:
            return reviewed
        rows = list(await session.scalars(_unreviewed_rules(key, on_date)))
        if rows:
            return rows
    return []


async def _origin_review_state(
    session: AsyncSession, rule: ProductSpecificRule | None
) -> tuple[str, list[str]]:
    if rule is None:
        return disclaimer.REVIEWED, []
    mapping = await session.get(HsCodeCompliance, rule.hs_code)
    components: list[str] = []
    if rule.reviewed_by is None:
        components.append("origin_rule")
    if mapping is not None and not mapping.cn_mapping_verified:
        components.append("cn_mapping")
    return (disclaimer.UNREVIEWED if components else disclaimer.REVIEWED), components


async def required_evidence_for(
    session: AsyncSession,
    code: str,
    shipment: ShipmentData,
    on_date: dt.date,
    accept_language: str | None = None,
) -> RequiredEvidenceOut:
    """Danh sách bằng chứng cho lô (SPEC §5.3). Dòng chưa duyệt vẫn trả kèm review_state."""
    rows: list[Any] = []
    for key in await _supported_keys(session, code):
        result = await session.execute(
            select(ComplianceEvidenceRequirement, ComplianceEvidenceType)
            .join(
                ComplianceEvidenceType,
                ComplianceEvidenceType.code == ComplianceEvidenceRequirement.evidence_type,
            )
            .where(
                ComplianceEvidenceRequirement.hs_code == key,
                ComplianceEvidenceRequirement.valid_from <= on_date,
                or_(
                    ComplianceEvidenceRequirement.valid_until.is_(None),
                    ComplianceEvidenceRequirement.valid_until > on_date,
                ),
            )
        )
        rows = list(result.all())
        if rows:
            break
    items = required_evidence(
        [
            RequirementData(
                evidence_type=t.code,
                condition=r.condition.value,
                name_vi=t.name_vi,
                name_en=t.name_en,
                layer=t.layer.value,
                scope=t.scope.value,
                blocks=t.blocks.value,
                legal_status=t.legal_status.value,
                reviewed=r.reviewed_by is not None,
            )
            for r, t in rows
        ],
        shipment,
        get_settings().eur1_consignment_threshold_eur,
    )
    state = list_review_state(items)
    return RequiredEvidenceOut(
        items=[
            EvidenceItemOut(
                code=i.code,
                name_vi=i.name_vi,
                name_en=i.name_en,
                layer=i.layer,
                scope=i.scope,
                blocks=i.blocks,
                legal_status=i.legal_status,
                status=i.status,
                conditions=list(i.conditions),
                review_state=i.review_state,
            )
            for i in items
        ],
        review_state=state,
        disclaimer=disclaimer.disclaimer_for(state, accept_language),
    )


def _origin_rule(rule: ProductSpecificRule | None) -> OriginRule | None:
    if rule is None:
        return None
    return OriginRule(
        rule.rule_type.value,
        rule.params or {},
        rule.requires_expert,
        rule.requires_expert_reason,
    )


async def origin_questions(
    session: AsyncSession, hs_code: str, accept_language: str | None = None
) -> OriginQuestionsOut:
    """Câu hỏi hiển thị và các trường trả lời cho một mã (không ghi compliance_checks)."""
    code = catalog.normalize_code(hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    rules = await lookup_rules_visible(session, code, dt.datetime.now(dt.UTC).date())
    rule = rules[0] if len(rules) == 1 else None
    inputs = () if rule is None else answer_schema(rule.rule_type.value)
    state, components = await _origin_review_state(session, rule if inputs else None)
    questions = (
        []
        if not inputs or rule is None
        else list(
            await session.scalars(
                select(RooQuestion)
                .where(RooQuestion.hs_code == rule.hs_code)
                .order_by(RooQuestion.position)
            )
        )
    )
    return OriginQuestionsOut(
        status="ok" if inputs else "unsupported",
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        rule_type=rule.rule_type.value if rule is not None and inputs else None,
        requires_expert=bool(rule and inputs and rule.requires_expert),
        questions=[
            OriginQuestionOut(order=q.position, text_vi=q.text_vi, text_en=q.text_en)
            for q in questions
        ],
        inputs=[
            OriginInputOut(
                name=i.name, kind=i.kind, options=list(i.options), required_if=i.required_if
            )
            for i in inputs
        ],
        review_state=state,
        unreviewed_components=components,
        disclaimer=disclaimer.disclaimer_for(state, accept_language) if inputs else None,
    )


async def _preference_savings(
    session: AsyncSession, code: str, value: Decimal, on_date: dt.date
) -> Decimal | None:
    """Tiết kiệm thuế của lô khi được hưởng ưu đãi; không ghi compliance_checks (chỉ đọc)."""
    lines, _ = await lookup_lines_visible(session, code, on_date)
    if len(lines) != 1:
        return None
    rate = await _evfta_rate_now(session, lines[0], on_date)
    result = tariff_savings(_line_data(lines[0], rate), 1, value, None)
    return result.savings if result.status == "ok" else None


async def calculate_origin(
    session: AsyncSession,
    data: OriginIn,
    user: CurrentUser | None,
    accept_language: str | None = None,
) -> OriginOut:
    """Máy tính xuất xứ Chương 3/7/8. Mỗi lần chạy hợp lệ ghi ĐÚNG MỘT compliance_checks."""
    code = catalog.normalize_code(data.hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    today = dt.datetime.now(dt.UTC).date()
    rules = await lookup_rules_visible(session, code, today)
    rule = rules[0] if len(rules) == 1 else None
    origin_rule = _origin_rule(rule)
    supported = origin_rule is not None and origin_rule.rule_type in SUPPORTED_RULE_TYPES
    answers = OriginAnswers(**{f: getattr(data, f) for f in OriginAnswers.__dataclass_fields__})
    if supported:
        result = evaluate_origin(origin_rule, answers)
        status: str = result.status
        reasons: tuple[Reason, ...] = result.reasons
        missing, extra = result.inputs_missing, result.additional_evidence
    else:
        status, reasons, missing, extra = "unsupported", (REASONS["NOT_SUPPORTED"],), (), ()
    state, components = await _origin_review_state(session, rule if supported else None)
    evidence_list = (
        await required_evidence_for(
            session,
            code,
            ShipmentData(
                consignment_value_eur=data.consignment_value_eur,
                raw_material_source=data.raw_material_source,
                transit_third_country=data.transit_third_country,
                is_fresh=data.is_fresh,
            ),
            today,
            accept_language,
        )
        if supported
        else None
    )
    if evidence_list is not None and evidence_list.review_state == disclaimer.UNREVIEWED:
        components = [*components, "evidence_requirements"]
        state = disclaimer.UNREVIEWED
    savings: Decimal | None = None
    if status == "fail" and data.consignment_value_eur is not None:
        savings = Decimal("0.00")
    elif status == "pass" and data.consignment_value_eur is not None:
        savings = await _preference_savings(session, code, data.consignment_value_eur, today)
    company_id = await companies.get_company_id(session, user.id) if user else None
    check = await log_check(
        session,
        check_type=CheckType.roo,
        hs_code=code,
        destination_country=ORIGIN_DESTINATION,
        origin_country="VN",
        status=status,
        company_id=company_id,
        product_value=data.consignment_value_eur,
        originating_status=status,
        rule_id=rule.id if rule is not None and supported else None,
        review_state=state if supported else None,
        unreviewed_components=components if supported else None,
        data_version=rule.data_version if rule is not None and supported else None,
    )
    await session.commit()
    shown = rule if supported else None
    return OriginOut(
        check_id=str(check.id),
        status=status,
        reasons=[OriginReasonOut(code=r.code, vi=r.vi, en=r.en) for r in reasons],
        inputs_missing=list(missing),
        additional_evidence=list(extra),
        required_evidence=evidence_list,
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        rule_type=shown.rule_type.value if shown else None,
        rule_text_vi=shown.rule_text if shown else None,
        rule_text_en=shown.rule_text_en if shown else None,
        insufficient_operations_vi=shown.insufficient_operations_vi if shown else None,
        tolerance_note_vi=shown.tolerance_note_vi if shown else None,
        risk_note_vi=shown.risk_note_vi if shown else None,
        requires_expert=bool(shown and shown.requires_expert),
        preference_applicable=status == "pass",
        savings=savings,
        review_state=state,
        unreviewed_components=components,
        disclaimer=disclaimer.disclaimer_for(state, accept_language) if supported else None,
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
