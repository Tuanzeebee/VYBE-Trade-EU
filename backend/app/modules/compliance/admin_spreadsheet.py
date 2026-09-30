"""Xuất / nhập Excel dòng thuế và quy tắc xuất xứ (admin). Dòng nhập vào luôn CHƯA DUYỆT.

Khóa nhận diện dòng đã có: dòng thuế = (mã HS, nơi đến, ngày bắt đầu); PSR = (mã HS, ngày bắt đầu).
Trùng khóa: giống hệt thì bỏ qua, khác thì cập nhật và đưa về chưa duyệt (audit before/after).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.spreadsheet import (
    Column,
    ImportResult,
    apply_rows,
    build_workbook,
    read_workbook,
)
from app.modules.auth.schemas import CurrentUser
from app.modules.compliance import admin_service
from app.modules.compliance.admin_schemas import (
    DESTINATIONS,
    RooRuleIn,
    RooRulePatch,
    TariffLineIn,
    TariffLinePatch,
)
from app.modules.compliance.models import DutyType, ProductSpecificRule, RuleType, TariffLine

_STATUS = Column("review_status", readonly=True)

TARIFF_COLUMNS = (
    Column("hs_code", required=True, help="Mã HS 6–8 số, phải có trong danh mục HS hỗ trợ."),
    Column(
        "destination",
        "enum",
        True,
        tuple(sorted(DESTINATIONS)),
        "Nước EU đến (ISO-2) hoặc EU = biểu thuế chung của liên minh thuế quan.",
    ),
    Column(
        "duty_type",
        "enum",
        True,
        tuple(t.value for t in DutyType),
        "ad_valorem = theo % trị giá; specific = tuyệt đối (số tiền/đơn vị); mixed = hỗn hợp. "
        "specific/mixed hoặc có hạn ngạch → máy tính trả 'cần xem xét', không trả số.",
    ),
    Column("mfn_rate", "decimal", help="Thuế MFN, % (0–100). Bỏ trống nếu không phải ad_valorem."),
    Column("mfn_specific", help="Thuế tuyệt đối/hỗn hợp dạng văn bản (vd '176 EUR/100 kg')."),
    Column("evfta_rate_current", "decimal", help="Thuế EVFTA hiện hành, % (0–100)."),
    Column("staging_category", help="Ký hiệu lộ trình cắt giảm (vd A, B5, TRQ)."),
    Column("zero_from", "date", help="Ngày thuế EVFTA về 0% (YYYY-MM-DD)."),
    Column("quota_required", "bool", help="true nếu áp hạn ngạch thuế quan. Mặc định false."),
    Column("quota_note", help="Ghi chú hạn ngạch."),
    Column("condition_note", help="Điều kiện áp dụng khác."),
    Column("source_url", help="Nguồn văn bản pháp lý."),
    Column("valid_from", "date", True, help="Ngày bắt đầu hiệu lực (YYYY-MM-DD)."),
    Column(
        "valid_until",
        "date",
        help="Ngày ĐÃ hết hiệu lực (YYYY-MM-DD, phải sau ngày bắt đầu). Trống = không thời hạn.",
    ),
    _STATUS,
)

PSR_COLUMNS = (
    Column("hs_code", required=True, help="Mã HS 6–8 số, phải có trong danh mục HS hỗ trợ."),
    Column(
        "rule_type",
        "enum",
        True,
        tuple(t.value for t in RuleType),
        "WO = xuất xứ thuần túy; CTH = chuyển đổi nhóm HS 4 số; MaxNOM = nguyên liệu không xuất "
        "xứ tối đa % giá xuất xưởng; CTH_OR_MaxNOM = đạt một trong hai.",
    ),
    Column(
        "threshold_pct",
        "decimal",
        help="Ngưỡng NOM tối đa, % (0–100]. Bắt buộc với MaxNOM/CTH_OR_MaxNOM; "
        "để trống với WO/CTH.",
    ),
    Column("rule_text", help="Nguyên văn quy tắc."),
    Column(
        "requires_expert",
        "bool",
        help="true = phải có chuyên gia đánh giá; máy tính luôn trả 'chưa kết luận'. "
        "Mặc định false.",
    ),
    Column("source", help="Nguồn văn bản pháp lý."),
    Column("valid_from", "date", True, help="Ngày bắt đầu hiệu lực (YYYY-MM-DD)."),
    Column(
        "valid_until",
        "date",
        help="Ngày ĐÃ hết hiệu lực (YYYY-MM-DD, phải sau ngày bắt đầu). Trống = không thời hạn.",
    ),
    _STATUS,
)


def _rows(
    rows: list[TariffLine] | list[ProductSpecificRule], columns: tuple[Column, ...]
) -> list[dict[str, object]]:
    return [
        {
            c.key: ("reviewed" if r.reviewed_by is not None else "pending")
            if c.key == "review_status"
            else getattr(r, c.key)
            for c in columns
        }
        for r in rows
    ]


def tariff_template() -> bytes:
    return build_workbook(TARIFF_COLUMNS, [], template=True)


def psr_template() -> bytes:
    return build_workbook(PSR_COLUMNS, [], template=True)


async def export_tariff(session: AsyncSession) -> bytes:
    rows = await admin_service.list_tariff_lines(session, None, None)
    return build_workbook(TARIFF_COLUMNS, _rows(rows, TARIFF_COLUMNS))


async def export_psr(session: AsyncSession) -> bytes:
    rows = await admin_service.list_roo_rules(session, None, None)
    return build_workbook(PSR_COLUMNS, _rows(rows, PSR_COLUMNS))


async def import_tariff(
    session: AsyncSession, actor: CurrentUser, data: bytes, dry_run: bool
) -> ImportResult:
    async def find(d: TariffLineIn) -> TariffLine | None:
        return await session.scalar(
            select(TariffLine).where(
                TariffLine.hs_code == d.hs_code,
                TariffLine.destination == d.destination,
                TariffLine.valid_from == d.valid_from,
            )
        )

    async def create(d: TariffLineIn) -> TariffLine:
        return await admin_service.create_tariff_line(session, actor, d, commit=False)

    async def update(row: TariffLine, d: TariffLineIn) -> TariffLine:
        patch = TariffLinePatch.model_construct(_fields_set=set(d.model_dump()), **d.model_dump())
        return await admin_service.update_tariff_line(session, actor, row.id, patch, commit=False)

    return await apply_rows(
        session,
        TARIFF_COLUMNS,
        read_workbook(data, TARIFF_COLUMNS),
        schema=TariffLineIn,
        key=lambda d: (d.hs_code, d.destination, d.valid_from),
        find=find,
        create=create,
        update=update,
        dry_run=dry_run,
    )


async def import_psr(
    session: AsyncSession, actor: CurrentUser, data: bytes, dry_run: bool
) -> ImportResult:
    async def find(d: RooRuleIn) -> ProductSpecificRule | None:
        return await session.scalar(
            select(ProductSpecificRule).where(
                ProductSpecificRule.hs_code == d.hs_code,
                ProductSpecificRule.valid_from == d.valid_from,
            )
        )

    async def create(d: RooRuleIn) -> ProductSpecificRule:
        return await admin_service.create_roo_rule(session, actor, d, commit=False)

    async def update(row: ProductSpecificRule, d: RooRuleIn) -> ProductSpecificRule:
        patch = RooRulePatch.model_construct(_fields_set=set(d.model_dump()), **d.model_dump())
        return await admin_service.update_roo_rule(session, actor, row.id, patch, commit=False)

    return await apply_rows(
        session,
        PSR_COLUMNS,
        read_workbook(data, PSR_COLUMNS),
        schema=RooRuleIn,
        key=lambda d: (d.hs_code, d.valid_from),
        find=find,
        create=create,
        update=update,
        dry_run=dry_run,
    )
