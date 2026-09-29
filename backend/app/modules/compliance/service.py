"""Logic tuân thủ. Mọi truy vấn dòng thuế công khai đi qua _reviewed_lines."""

import csv
import datetime as dt
import io
import uuid
from collections.abc import AsyncIterator
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.modules.auth.schemas import CurrentUser
from app.modules.catalog import service as catalog
from app.modules.companies import service as companies
from app.modules.compliance.calculators import TariffLineData, tariff_savings
from app.modules.compliance.models import CheckType, ComplianceCheck, TariffLine
from app.modules.compliance.schemas import TariffIn, TariffOut

# EU là liên minh thuế quan: biểu thuế chung lưu ở destination 'EU' (một dòng/HS cho 27 nước).
UNION_DESTINATION = "EU"
HEADING_LENGTH = 6  # mã HS 6 số — cấp danh mục và dòng thuế


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


async def calculate_tariff(
    session: AsyncSession, data: TariffIn, user: CurrentUser | None
) -> TariffOut:
    """Máy tính tiết kiệm thuế (C2). Mỗi lần chạy hợp lệ ghi ĐÚNG MỘT compliance_checks."""
    code = catalog.normalize_code(data.hs_code)
    if code is None:
        raise AppError("invalid_hs_code", "HS code must be 6 to 8 digits", 422)
    heading = code[:HEADING_LENGTH]
    hs = await catalog.get_hs_code(session, heading)
    lines: list[TariffLine] = []
    if hs is not None and hs.supported:  # ngoài danh mục hỗ trợ → unsupported, không tra thuế
        today = dt.datetime.now(dt.UTC).date()
        lines = await find_lines(session, heading, UNION_DESTINATION, today)
    line = lines[0] if lines else None
    result = tariff_savings(
        None
        if line is None
        else TariffLineData(
            duty_type=line.duty_type,
            mfn_rate=line.mfn_rate,
            evfta_rate_current=line.evfta_rate_current,
            quota_required=line.quota_required,
            quota_note=line.quota_note,
            condition_note=line.condition_note,
        ),
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
    )
