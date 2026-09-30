"""Xuất / nhập Excel loại bằng chứng và luật bằng chứng theo nhóm hàng (admin, C6).

Dòng nhập vào luôn CHƯA DUYỆT. Khóa nhận diện: loại bằng chứng = `code`; luật = (nhóm hàng, loại).
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
from app.modules.verification import admin_service
from app.modules.verification.admin_schemas import (
    EvidenceTypeIn,
    EvidenceTypePatch,
    RuleIn,
    RulePatch,
)
from app.modules.verification.models import EvidenceType, RequiredEvidenceRule

_STATUS = Column("review_status", readonly=True)

TYPE_COLUMNS = (
    Column(
        "code",
        required=True,
        help="Mã loại bằng chứng: chữ thường, số, gạch dưới, bắt đầu bằng chữ "
        "(vd eur1_certificate).",
    ),
    Column("name_vi", required=True, help="Tên tiếng Việt."),
    Column("name_en", required=True, help="Tên tiếng Anh."),
    Column("group", required=True, help="Nhóm: origin, quality, social, technical, lab…"),
    Column("validity_months", "int", help="Hạn hiệu lực (tháng), > 0. Trống = không tự tính hạn."),
    Column("is_active", "bool", help="true = exporter được nộp loại này. Mặc định true."),
    Column("source", help="Nguồn / căn cứ."),
    _STATUS,
)

RULE_COLUMNS = (
    Column("category", required=True, help="Nhóm hàng (hs_codes.category) phải có trong danh mục."),
    Column("evidence_type_code", required=True, help="Mã loại bằng chứng đã tồn tại."),
    Column(
        "is_required",
        "bool",
        help="true = bắt buộc (tính vào EVFTA-verified); false = chỉ nhắc. Mặc định true.",
    ),
    Column("note", help="Lời nhắc hiển thị cho exporter."),
    _STATUS,
)


def _rows(
    rows: list[EvidenceType] | list[RequiredEvidenceRule], columns: tuple[Column, ...]
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


def type_template() -> bytes:
    return build_workbook(TYPE_COLUMNS, [], template=True)


def rule_template() -> bytes:
    return build_workbook(RULE_COLUMNS, [], template=True)


async def export_types(session: AsyncSession) -> bytes:
    return build_workbook(
        TYPE_COLUMNS, _rows(await admin_service.list_types(session), TYPE_COLUMNS)
    )


async def export_rules(session: AsyncSession) -> bytes:
    rows = await admin_service.list_rules(session, None)
    return build_workbook(RULE_COLUMNS, _rows(rows, RULE_COLUMNS))


async def import_types(
    session: AsyncSession, actor: CurrentUser, data: bytes, dry_run: bool
) -> ImportResult:
    async def find(d: EvidenceTypeIn) -> EvidenceType | None:
        return await session.get(EvidenceType, d.code)

    async def create(d: EvidenceTypeIn) -> EvidenceType:
        return await admin_service.create_type(session, actor, d, commit=False)

    async def update(row: EvidenceType, d: EvidenceTypeIn) -> EvidenceType:
        values = d.model_dump(exclude={"code"})
        patch = EvidenceTypePatch.model_construct(_fields_set=set(values), **values)
        return await admin_service.update_type(session, actor, row.code, patch, commit=False)

    return await apply_rows(
        session,
        TYPE_COLUMNS,
        read_workbook(data, TYPE_COLUMNS),
        schema=EvidenceTypeIn,
        key=lambda d: (d.code,),
        find=find,
        create=create,
        update=update,
        dry_run=dry_run,
    )


async def import_rules(
    session: AsyncSession, actor: CurrentUser, data: bytes, dry_run: bool
) -> ImportResult:
    async def find(d: RuleIn) -> RequiredEvidenceRule | None:
        return await session.scalar(
            select(RequiredEvidenceRule).where(
                RequiredEvidenceRule.category == d.category,
                RequiredEvidenceRule.evidence_type_code == d.evidence_type_code,
            )
        )

    async def create(d: RuleIn) -> RequiredEvidenceRule:
        return await admin_service.create_rule(session, actor, d, commit=False)

    async def update(row: RequiredEvidenceRule, d: RuleIn) -> RequiredEvidenceRule:
        values = d.model_dump(include={"is_required", "note"})
        patch = RulePatch.model_construct(_fields_set=set(values), **values)
        return await admin_service.update_rule(session, actor, row.id, patch, commit=False)

    return await apply_rows(
        session,
        RULE_COLUMNS,
        read_workbook(data, RULE_COLUMNS),
        schema=RuleIn,
        key=lambda d: (d.category, d.evidence_type_code),
        find=find,
        create=create,
        update=update,
        dry_run=dry_run,
    )
