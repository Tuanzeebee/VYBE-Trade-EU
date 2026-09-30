"""Logic tuân thủ. Mọi truy vấn dòng thuế công khai đi qua _reviewed_lines."""

import csv
import datetime as dt
import io
import uuid
from collections.abc import AsyncIterator
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.companies import service as companies
from app.modules.compliance.calculators import (
    CountryTerms,
    Material,
    RooResult,
    RuleData,
    TariffLineData,
    rank_markets,
    roo_verdict,
    tariff_savings,
)
from app.modules.compliance.models import (
    CheckType,
    ComplianceCheck,
    ImportCountryTerm,
    ProductSpecificRule,
    TariffLine,
)
from app.modules.compliance.schemas import (
    MarketRowOut,
    MarketsIn,
    MarketsOut,
    RooIn,
    RooOut,
    TariffIn,
    TariffOut,
    TariffPreviewOut,
)

# EU là liên minh thuế quan: biểu thuế chung lưu ở destination 'EU' (một dòng/HS cho 27 nước).
UNION_DESTINATION = "EU"
HEADING_LENGTH = 6  # mã HS 6 số — cấp danh mục và dòng thuế
# Cơ sở tính chỉ để lấy thuế suất (%); không hiển thị tiền nào ở màn xem thuế.
_RATE_BASIS = Decimal(100)


def _reviewed_lines(hs_code: str, destination: str, on_date: dt.date) -> Select[TariffLine]:
    """Dòng thuế ĐÃ DUYỆT và đang hiệu lực vào `on_date` (valid_until là ngày đã hết hiệu lực)."""
    return select(TariffLine).where(
        TariffLine.reviewed_by.is_not(None),
        TariffLine.hs_code == hs_code,
        TariffLine.destination == destination,
        TariffLine.valid_from <= on_date,
        or_(TariffLine.valid_until.is_(None), TariffLine.valid_until > on_date),
    )


async def find_lines(
    session: AsyncSession, hs_code: str, destination: str, on_date: dt.date
) -> list[TariffLine]:
    """Dòng đã duyệt khớp mã HS + nước đến vào ngày `on_date` (C2 đếm để phát hiện mơ hồ)."""
    result = await session.scalars(_reviewed_lines(hs_code, destination, on_date))
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


async def lookup_lines(session: AsyncSession, code: str, on_date: dt.date) -> list[TariffLine]:
    """Dòng thuế đã duyệt cho mã `code`: thử mã 8 số trước, không có thì lùi về nhóm 6 số.

    Mã 6 số KHÔNG tự chọn một mã 8 số con (các con có thể khác thuế, vd 081090)."""
    for key in await _supported_keys(session, code):
        lines = await find_lines(session, key, UNION_DESTINATION, on_date)
        if lines:
            return lines
    return []


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
    """Máy tính tiết kiệm thuế (C2). Mỗi lần chạy hợp lệ ghi ĐÚNG MỘT compliance_checks."""
    code = catalog.normalize_code(data.hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    lines = await lookup_lines(session, code, dt.datetime.now(dt.UTC).date())
    line = lines[0] if lines else None
    result = tariff_savings(
        None if line is None else _line_data(line),
        len(lines),
        data.product_value,
        data.shipments_per_year,
    )
    company_id = await companies.get_company_id(session, user.id) if user else None
    check = await log_check(
        session,
        check_type=CheckType.tariff,
        hs_code=code,
        destination_country=data.destination,
        status=result.status,
        company_id=company_id,
        product_value=data.product_value,
        mfn_duty_rate=result.mfn_rate,
        evfta_duty_rate=result.evfta_rate,
        savings_amount=result.savings,
        tariff_line_id=line.id if line is not None and len(lines) == 1 else None,
    )
    await session.commit()
    return TariffOut(
        check_id=str(check.id),
        status=result.status,
        hs_code=code,
        hs_formatted=catalog.format_code(code),
        destination=data.destination,
        product_value=data.product_value,
        mfn_rate=result.mfn_rate,
        evfta_rate=result.evfta_rate,
        mfn_duty=result.mfn_duty,
        evfta_duty=result.evfta_duty,
        savings=result.savings,
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
    lines = await lookup_lines(session, code, dt.datetime.now(dt.UTC).date())
    line = lines[0] if lines else None
    result = tariff_savings(
        None if line is None else _line_data(line), len(lines), _RATE_BASIS, None
    )
    ok = result.status == "ok" and line is not None
    return TariffPreviewOut(
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
