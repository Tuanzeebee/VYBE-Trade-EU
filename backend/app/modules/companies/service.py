"""API công khai của module companies. Module khác chỉ gọi các hàm ở đây và dùng schemas."""

import re
import unicodedata
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.errors import AppError
from app.core.events import publish
from app.core.storage import Storage
from app.modules.auth import service as auth
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import completeness_service
from app.modules.companies.completeness import BUSINESS_MODELS
from app.modules.companies.events import CompanyUpdated
from app.modules.companies.models import (
    BuyerSourcingNeeds,
    Company,
    CompanyExportMarket,
    CompanyFacilityCode,
    CompanyLanguage,
    CompanySourcingCategory,
    CompanyType,
    OfferingType,
    VerificationLevel,
    VerificationStatus,
)
from app.modules.companies.schemas import (
    AdminCompanyOut,
    AdminCompanyPatch,
    CompanyFilters,
    CompanyIdentityFacts,
    CompanyIn,
    CompanyOut,
    CompanyPatch,
    CompanySummary,
    CompletenessOut,
    MissingOut,
    PresignIn,
    PresignOut,
    SourcingNeedsIn,
    SourcingNeedsOut,
    VerificationState,
    ViewerIdentity,
)

_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "application/pdf": "pdf",
}
_UPLOAD_FOLDERS = {"logo": "logos", "product_image": "products", "evidence": "evidence"}
_ALLOWED_ROLES = {"exporter": CompanyType.exporter, "buyer": CompanyType.buyer}
# Trường chỉ một loại công ty được đặt; loại kia gửi giá trị thật → 422.
# Quy mô nhân sự (company_size) nay dùng cho cả seller (U2).
_ONLY_EXPORTER = (
    "export_markets",
    "export_market_channels",
    "languages_spoken",
    "offering_type",
    "factory_address",
    "capacity_value",
    "capacity_unit",
    "capacity_period",
    "main_customers",
    "facility_codes",
)
_ONLY_BUYER = (
    "procurement_estimate",
    "vat_number",
    "eori_number",
    "sourcing_categories",
    "hide_profile_views",
)
_LIST_FIELDS = (
    "export_markets",
    "export_market_channels",
    "languages_spoken",
    "sourcing_categories",
    "facility_codes",
)


def slugify(name: str) -> str:
    text = unicodedata.normalize("NFKD", name.replace("đ", "d").replace("Đ", "D"))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:100].strip("-")
    return slug or "company"


async def _unique_slug(session: AsyncSession, name: str) -> str:
    base = slugify(name)
    slug, n = base, 1
    while await session.scalar(select(Company.id).where(Company.slug == slug)):
        n += 1
        slug = f"{base}-{n}"
    return slug


def _to_out(company: Company) -> CompanyOut:
    return CompanyOut.model_validate(
        {
            **{c.name: getattr(company, c.name) for c in Company.__table__.columns},
            "type": company.type.value,
            "verification_status": company.verification_status.value,
            "verification_level": company.verification_level.value,
            "export_markets": [m.market for m in company.export_markets],
            "export_market_channels": {
                m.market: m.trade_channel for m in company.export_markets if m.trade_channel
            },
            "languages_spoken": [lang.lang for lang in company.languages],
            "sourcing_categories": [c.category for c in company.sourcing_categories],
            "facility_codes": [
                {"code_type": f.code_type, "code": f.code} for f in company.facility_codes
            ],
            "offering_type": (
                company.offering_type if company.type is CompanyType.exporter else None
            ),
        }
    )


def _company_type(user: CurrentUser) -> CompanyType:
    company_type = _ALLOWED_ROLES.get(user.role)
    if company_type is None:
        raise AppError("forbidden", "Not allowed for this role", 403)
    return company_type


async def _own_company(session: AsyncSession, user: CurrentUser) -> Company:
    _company_type(user)
    company = await session.scalar(select(Company).where(Company.owner_user_id == user.id))
    if company is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return company


def _verification_state(company: Company) -> VerificationState:
    return VerificationState(
        status=company.verification_status.value,
        level=company.verification_level.value,
        verified_at=company.verified_at,
        expires_at=company.expires_at,
        tier=company.verification_tier,
        tier_reviewed_at=company.tier_reviewed_at,
        tier_expires_at=company.tier_expires_at,
    )


async def get_verification_state(session: AsyncSession, company_id: uuid.UUID) -> VerificationState:
    company = await session.get(Company, company_id)
    if company is None:
        raise AppError("company_not_found", "Company not found", 404)
    await session.refresh(company)  # đọc trạng thái mới nhất từ DB
    return _verification_state(company)


async def set_verification_state(
    session: AsyncSession,
    company_id: uuid.UUID,
    *,
    status: str,
    level: str,
    verified_at: datetime | None,
    expires_at: datetime | None,
    tier: int | None = None,
    tier_reviewed_at: datetime | None = None,
    tier_expires_at: datetime | None = None,
) -> VerificationState:
    """Ghi trạng thái xác minh; trả về trạng thái TRƯỚC khi đổi.

    Chỉ verification.service được gọi hàm này (test khóa) — nơi duy nhất đổi trạng thái xác minh.
    U20: tier None = giữ cấp hiện tại; không còn verified thì cấp luôn về 0 (ADR-0004).
    """
    company = await session.get(Company, company_id)
    if company is None:
        raise AppError("company_not_found", "Company not found", 404)
    previous = _verification_state(company)
    company.verification_status = VerificationStatus(status)
    company.verification_level = VerificationLevel(level)
    company.verified_at = verified_at
    company.expires_at = expires_at
    if status != VerificationStatus.verified.value:
        tier, tier_reviewed_at, tier_expires_at = 0, None, None
    if tier is not None:
        company.verification_tier = tier
        company.tier_reviewed_at = tier_reviewed_at
        company.tier_expires_at = tier_expires_at
    await session.flush()
    return previous


async def set_coordinates(
    session: AsyncSession, company_id: uuid.UUID, latitude: Decimal, longitude: Decimal
) -> None:
    """U21: toạ độ từ định vị địa chỉ (job kiểm tự động), chỉ khi chủ hồ sơ bật location_public."""
    company = await session.get(Company, company_id)
    if company is None or not company.location_public:
        return
    company.latitude, company.longitude = latitude, longitude
    await session.flush()


async def list_tier_expired(session: AsyncSession, now: datetime) -> list[uuid.UUID]:
    """U20: công ty verified ở cấp 2–3 mà hạn của cấp đã tới (tier_expires_at <= now)."""
    rows = await session.scalars(
        select(Company.id).where(
            Company.verification_status == VerificationStatus.verified,
            Company.verification_tier >= 2,
            Company.tier_expires_at.is_not(None),
            Company.tier_expires_at <= now,
        )
    )
    return list(rows)


async def list_companies_at_tier(
    session: AsyncSession, min_tier: int
) -> list[tuple[uuid.UUID, str, str, int]]:
    """U20: (id, loại công ty, offering_type, cấp) của công ty verified từ cấp min_tier."""
    rows = await session.execute(
        select(Company.id, Company.type, Company.offering_type, Company.verification_tier).where(
            Company.verification_status == VerificationStatus.verified,
            Company.verification_tier >= min_tier,
        )
    )
    return [(r[0], r[1].value, r[2], r[3]) for r in rows]


async def list_expired_verified(session: AsyncSession, now: datetime) -> list[uuid.UUID]:
    """Công ty đang verified và đã tới hạn (expires_at <= now) — cho job hết hạn."""
    rows = await session.scalars(
        select(Company.id).where(
            Company.verification_status == VerificationStatus.verified,
            Company.expires_at.is_not(None),
            Company.expires_at <= now,
        )
    )
    return list(rows)


async def get_company_summaries(
    session: AsyncSession, company_ids: list[uuid.UUID]
) -> dict[uuid.UUID, CompanySummary]:
    """Tên, MST, quốc gia của các công ty (admin xem hàng đợi)."""
    if not company_ids:
        return {}
    rows = await session.scalars(select(Company).where(Company.id.in_(company_ids)))
    return {
        c.id: CompanySummary(
            id=c.id,
            legal_name=c.legal_name,
            tax_id=c.tax_id,
            country=c.country,
            address=c.address,
            verification_status=c.verification_status.value,
        )
        for c in rows
    }


async def get_viewer_identities(
    session: AsyncSession, company_ids: list[uuid.UUID], now: datetime
) -> dict[uuid.UUID, ViewerIdentity]:
    """Danh tính các công ty đã xem hồ sơ (U9). Tên chỉ được lộ khi `identifiable`."""
    if not company_ids:
        return {}
    rows = await session.scalars(select(Company).where(Company.id.in_(company_ids)))
    return {
        c.id: ViewerIdentity(
            id=c.id,
            legal_name=c.legal_name,
            country=c.country,
            business_type=c.business_type,
            identifiable=(
                c.type is CompanyType.buyer
                and c.verification_status is VerificationStatus.verified
                and (c.expires_at is None or c.expires_at > now)
                and not c.hide_profile_views
            ),
        )
        for c in rows
    }


async def get_company_for_review(session: AsyncSession, company_id: uuid.UUID) -> CompanyOut:
    """Hồ sơ đầy đủ của công ty cho admin duyệt xác minh. Router phải giới hạn vai trò admin."""
    company = await session.get(Company, company_id)
    if company is None:
        raise AppError("company_not_found", "Company not found", 404)
    return _to_out(company)


async def refresh_completeness(session: AsyncSession, company_id: uuid.UUID) -> None:
    """Tính lại điểm hoàn thiện (vd khi bằng chứng đổi hoặc hết hạn). Chỉ flush, không commit."""
    company = await session.get(Company, company_id)
    if company is not None:
        await completeness_service.refresh_score(session, company)
        await session.flush()


async def list_exporter_ids(session: AsyncSession) -> list[uuid.UUID]:
    """Mọi công ty exporter — job hằng ngày tính lại điểm hoàn thiện."""
    rows = await session.scalars(select(Company.id).where(Company.type == CompanyType.exporter))
    return list(rows)


async def list_identity_facts(session: AsyncSession) -> list[CompanyIdentityFacts]:
    """Định danh của mọi công ty (gom cụm chống mạo danh, I11)."""
    # ponytail: đọc toàn bộ công ty mỗi lần — ổn tới vài nghìn hồ sơ; lớn hơn thì gom cụm bằng
    # truy vấn GROUP BY theo từng loại định danh.
    rows = await session.scalars(select(Company))
    return [
        CompanyIdentityFacts(
            id=c.id,
            legal_name=c.legal_name,
            type=c.type.value,
            tax_id=c.tax_id,
            website=c.website,
            contact_email=c.contact_email,
            founded_year=c.founded_year,
            owner_user_id=c.owner_user_id,
        )
        for c in rows
    ]


def register_evidence_counter(counter: completeness_service.EvidenceCounter) -> None:
    """verification đăng ký hàm đếm bằng chứng đã nộp còn hạn cho điểm hoàn thiện."""
    completeness_service.register_evidence_counter(counter)


# ── Admin kiểm duyệt (I4): mỗi thao tác ghi audit before/after ─────────────────────────────
_ADMIN_CONTENT_FIELDS = (
    "legal_name",
    "description_vi",
    "description_en",
    "website",
    "address",
    "contact_email",
)


async def _to_admin_out(session: AsyncSession, company: Company) -> AdminCompanyOut:
    contact = await auth.get_contact(session, company.owner_user_id)
    return AdminCompanyOut(
        id=company.id,
        slug=company.slug,
        type=company.type.value,
        legal_name=company.legal_name,
        country=company.country,
        tax_id=company.tax_id,
        website=company.website,
        address=company.address,
        contact_email=company.contact_email,
        description_vi=company.description_vi,
        description_en=company.description_en,
        verification_status=company.verification_status.value,
        verification_level=company.verification_level.value,
        verification_tier=company.verification_tier,
        is_hidden=company.is_hidden,
        profile_completeness_score=company.profile_completeness_score,
        owner_email=contact.email if contact else None,
        created_at=company.created_at,
    )


async def admin_list_companies(
    session: AsyncSession,
    *,
    q: str | None,
    status: str | None,
    hidden: bool | None,
    limit: int,
    offset: int,
) -> list[AdminCompanyOut]:
    query = select(Company)
    if q:
        query = query.where(Company.legal_name.ilike(f"%{q.strip()}%"))
    if status:
        query = query.where(Company.verification_status == VerificationStatus(status))
    if hidden is not None:
        query = query.where(Company.is_hidden.is_(hidden))
    rows = await session.scalars(
        query.order_by(Company.created_at, Company.id).limit(limit).offset(offset)
    )
    return [await _to_admin_out(session, c) for c in rows]


async def admin_update_company(
    session: AsyncSession, actor: CurrentUser, company_id: uuid.UUID, patch: AdminCompanyPatch
) -> AdminCompanyOut:
    """Sửa nội dung hoặc ẩn/hiện hồ sơ. Không đụng trạng thái xác minh (chỉ decide() được)."""
    company = await session.get(Company, company_id)
    if company is None:
        raise AppError("company_not_found", "Company not found", 404)
    fields = patch.model_fields_set
    if "legal_name" in fields and patch.legal_name is None:
        raise AppError("invalid_field", "legal_name cannot be empty", 422)
    if "is_hidden" in fields and patch.is_hidden is None:
        raise AppError("invalid_field", "is_hidden cannot be null", 422)

    before: dict[str, Any] = {}
    after: dict[str, Any] = {}
    for name in _ADMIN_CONTENT_FIELDS:
        if name in fields and getattr(patch, name) != getattr(company, name):
            before[name], after[name] = getattr(company, name), getattr(patch, name)
    hide_change = "is_hidden" in fields and patch.is_hidden != company.is_hidden
    if (
        hide_change
        and patch.is_hidden is False
        and await auth.get_contact(session, company.owner_user_id) is None
    ):
        # Chủ đã xóa tài khoản (J2): không đưa hồ sơ trở lại công khai.
        raise AppError("account_deleted", "The owner deleted their account", 409)
    hide_before, hide_after = company.is_hidden, patch.is_hidden

    for name, value in after.items():
        setattr(company, name, value)
    if hide_change:
        company.is_hidden = bool(patch.is_hidden)
    if before:
        await record(
            session,
            actor_id=actor.id,
            action_type="company.update",
            entity_type="company",
            entity_id=str(company.id),
            before=before,
            after=after,
        )
    if hide_change:
        await record(
            session,
            actor_id=actor.id,
            action_type="company.hide" if patch.is_hidden else "company.unhide",
            entity_type="company",
            entity_id=str(company.id),
            before={"is_hidden": hide_before},
            after={"is_hidden": hide_after},
        )
    await _save(session, company)
    return await _to_admin_out(session, company)


async def count_by_verification_status(session: AsyncSession) -> dict[str, int]:
    """Số công ty theo trạng thái xác minh (dashboard nội bộ)."""
    rows = await session.execute(
        select(Company.verification_status, func.count()).group_by(Company.verification_status)
    )
    return {status.value: count for status, count in rows.all()}


async def anonymize_owner(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Chủ tài khoản bị xóa (J2): công ty biến khỏi danh bạ và hồ sơ công khai, xóa email liên hệ
    và địa chỉ (có thể là địa chỉ cá nhân). Tên pháp lý và mã số thuế là thông tin doanh nghiệp."""
    company = await session.scalar(select(Company).where(Company.owner_user_id == user_id))
    if company is None:
        return
    company.is_hidden = True
    company.contact_email = None
    company.address = None
    await session.flush()


async def get_sourcing_categories(session: AsyncSession, company_id: uuid.UUID) -> list[str]:
    """Nhóm hàng quan tâm của buyer (đã khai khi tạo hồ sơ)."""
    rows = await session.scalars(
        select(CompanySourcingCategory.category)
        .where(CompanySourcingCategory.company_id == company_id)
        .order_by(CompanySourcingCategory.category)
    )
    return list(rows)


async def get_owner_user_id(session: AsyncSession, company_id: uuid.UUID) -> uuid.UUID | None:
    """Chủ sở hữu (người dùng) của công ty — module khác dùng để gửi thông báo."""
    owner_id: uuid.UUID | None = await session.scalar(
        select(Company.owner_user_id).where(Company.id == company_id)
    )
    return owner_id


async def get_company_id(session: AsyncSession, user_id: uuid.UUID) -> uuid.UUID | None:
    """Id công ty của người dùng (None nếu chưa tạo) — module khác dùng để gắn bản ghi."""
    company_id: uuid.UUID | None = await session.scalar(
        select(Company.id).where(Company.owner_user_id == user_id)
    )
    return company_id


def _reject_foreign_fields(company_type: CompanyType, values: dict[str, Any]) -> None:
    foreign = _ONLY_BUYER if company_type is CompanyType.exporter else _ONLY_EXPORTER
    for field in foreign:
        if values.get(field):
            raise AppError(
                "field_not_allowed", f"{field} is not allowed for {company_type.value}", 422
            )
    # Exporter: mô hình kinh doanh là giá trị cố định (buyer để nhập tự do như trước).
    model = values.get("business_type")
    if company_type is CompanyType.exporter and model is not None and model not in BUSINESS_MODELS:
        raise AppError(
            "invalid_business_type", f"business_type must be one of {BUSINESS_MODELS}", 422
        )


def _set_lists(company: Company, values: dict[str, Any]) -> None:
    """Lấy các trường danh sách ra khỏi values và gán vào bảng N-N tương ứng."""
    markets = values.pop("export_markets", None)
    channels = values.pop("export_market_channels", None)
    if markets is not None or channels is not None:
        kept = {m.market: m.trade_channel for m in company.export_markets}
        targets = list(kept) if markets is None else markets
        if channels is not None:
            unknown = sorted(set(channels) - set(targets))
            if unknown:
                raise AppError(
                    "invalid_export_market_channel",
                    f"Channel given for markets not in export_markets: {unknown}",
                    422,
                )
        company.export_markets = [
            CompanyExportMarket(
                market=m, trade_channel=kept.get(m) if channels is None else channels.get(m)
            )
            for m in targets
        ]
    if (langs := values.pop("languages_spoken", None)) is not None:
        company.languages = [CompanyLanguage(lang=lang) for lang in langs]
    if (cats := values.pop("sourcing_categories", None)) is not None:
        company.sourcing_categories = [CompanySourcingCategory(category=c) for c in cats]
    if (codes := values.pop("facility_codes", None)) is not None:
        # Chỉ xóa dòng không còn / thêm dòng mới: gán lại cả list làm SQLAlchemy INSERT
        # trước DELETE nên vi phạm unique (company_id, code_type, code) khi giữ nguyên mã.
        wanted = {(c["code_type"], c["code"]) for c in codes}
        existing = {(f.code_type, f.code) for f in company.facility_codes}
        for f in list(company.facility_codes):
            if (f.code_type, f.code) not in wanted:
                company.facility_codes.remove(f)
        for code_type, code in sorted(wanted - existing):
            company.facility_codes.append(CompanyFacilityCode(code_type=code_type, code=code))


def _normalize(company: Company) -> None:
    """Tên ngành tự ghi chỉ có nghĩa khi chọn ngành "Khác"."""
    if company.industry_sector != "other":
        company.industry_other = None


async def _save(session: AsyncSession, company: Company) -> CompanyOut:
    _normalize(company)
    await session.flush()
    await completeness_service.refresh_score(session, company)  # cùng transaction với thay đổi
    await session.commit()
    await session.refresh(company)
    await publish(CompanyUpdated(company_id=company.id))
    return _to_out(company)


async def get_my_company(session: AsyncSession, user: CurrentUser) -> CompanyOut:
    return _to_out(await _own_company(session, user))


async def get_completeness(session: AsyncSession, user: CurrentUser) -> CompletenessOut:
    """Điểm hoàn thiện và danh sách còn thiếu (tính mới theo bảng trọng số hiện hành)."""
    company = await _own_company(session, user)
    result = await completeness_service.compute_for(session, company)
    return CompletenessOut(
        score=result.score,
        missing=[
            MissingOut(field=m.field_key, group=m.group_key, weight=m.weight)
            for m in result.missing
        ],
    )


async def create_company(session: AsyncSession, user: CurrentUser, data: CompanyIn) -> CompanyOut:
    company_type = _company_type(user)
    if await session.scalar(select(Company.id).where(Company.owner_user_id == user.id)):
        raise AppError("company_exists", "Company profile already exists", 409)
    values: dict[str, Any] = data.model_dump()
    _reject_foreign_fields(company_type, values)
    await auth.ensure_identifiers_allowed(
        session, tax_id=data.tax_id, website=data.website, email=data.contact_email
    )
    lists = {key: values.pop(key) for key in _LIST_FIELDS}
    if company_type is CompanyType.exporter and values.get("offering_type") is None:
        values["offering_type"] = OfferingType.products.value
    if values.get("offering_type") is None:
        values.pop("offering_type")
    for flag in ("location_public", "hide_profile_views"):
        if values.get(flag) is None:
            values.pop(flag)
    company = Company(
        owner_user_id=user.id,
        type=company_type,
        slug=await _unique_slug(session, data.legal_name),
        **values,
    )
    _set_lists(company, lists)
    session.add(company)
    return await _save(session, company)


async def update_company(
    session: AsyncSession, user: CurrentUser, data: CompanyPatch
) -> CompanyOut:
    company = await _own_company(session, user)
    changes = data.model_dump(exclude_unset=True)
    _reject_foreign_fields(company.type, changes)
    await auth.ensure_identifiers_allowed(
        session,
        tax_id=changes.get("tax_id"),
        website=changes.get("website"),
        email=changes.get("contact_email"),
    )
    logo_key = changes.get("logo_key")
    if logo_key is not None and not logo_key.startswith(f"logos/{company.id}/"):
        raise AppError("invalid_logo_key", "Logo does not belong to this company", 422)
    for field in (
        "legal_name",
        "country",
        "offering_type",
        "location_public",
        "hide_profile_views",
    ):
        if field in changes and changes[field] is None:
            raise AppError("invalid_field", f"{field} cannot be empty", 422)
    _set_lists(company, changes)
    for field, value in changes.items():
        setattr(company, field, value)
    return await _save(session, company)


def _filtered(filters: CompanyFilters) -> Select[Company]:
    query = select(Company)
    if filters.country:
        query = query.where(Company.country == filters.country)
    if filters.industry:
        query = query.where(Company.industry_sector == filters.industry)
    if filters.market:
        query = query.where(
            Company.id.in_(
                select(CompanyExportMarket.company_id).where(
                    CompanyExportMarket.market == filters.market
                )
            )
        )
    if filters.language:
        query = query.where(
            Company.id.in_(
                select(CompanyLanguage.company_id).where(CompanyLanguage.lang == filters.language)
            )
        )
    if filters.sourcing:
        query = query.where(
            Company.id.in_(
                select(CompanySourcingCategory.company_id).where(
                    CompanySourcingCategory.category == filters.sourcing
                )
            )
        )
    return query.order_by(Company.legal_name)


async def list_companies(session: AsyncSession, filters: CompanyFilters) -> list[CompanyOut]:
    """Lọc theo trường có cấu trúc. Chưa lọc theo trạng thái xác minh — danh bạ công khai (E1)
    phải tự thêm điều kiện chỉ lấy công ty đã xác minh."""
    companies = (await session.scalars(_filtered(filters))).all()
    return [_to_out(c) for c in companies]


async def presign_upload(
    session: AsyncSession, user: CurrentUser, storage: Storage, data: PresignIn
) -> PresignOut:
    """URL tải lên có hạn ngắn; khóa file luôn nằm dưới thư mục của công ty mình."""
    if data.purpose in ("product_image", "evidence") and user.role != "exporter":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company = await _own_company(session, user)
    folder = _UPLOAD_FOLDERS[data.purpose]
    key = f"{folder}/{company.id}/{uuid.uuid4().hex}.{_EXTENSIONS[data.content_type]}"
    return PresignOut(upload_url=await storage.presign_put(key, data.content_type), key=key)


# ── Nhu cầu mua hàng của buyer (U5) ───────────────────────────────────────────────────────
async def _own_buyer(session: AsyncSession, user: CurrentUser) -> Company:
    """Lớp kiểm thứ hai (lớp một là require_role("buyer") ở router)."""
    if user.role != "buyer":
        raise AppError("forbidden", "Not allowed for this role", 403)
    company = await _own_company(session, user)
    if company.type is not CompanyType.buyer:
        raise AppError("forbidden", "Not allowed for this role", 403)
    return company


def _needs_out(row: BuyerSourcingNeeds | None) -> SourcingNeedsOut:
    if row is None:
        return SourcingNeedsOut()
    return SourcingNeedsOut.model_validate(
        {field: getattr(row, field) for field in SourcingNeedsOut.model_fields}
    )


async def get_sourcing_needs(session: AsyncSession, user: CurrentUser) -> SourcingNeedsOut:
    company = await _own_buyer(session, user)
    return _needs_out(await session.get(BuyerSourcingNeeds, company.id))


async def put_sourcing_needs(
    session: AsyncSession, user: CurrentUser, data: SourcingNeedsIn
) -> SourcingNeedsOut:
    company = await _own_buyer(session, user)
    row = await session.get(BuyerSourcingNeeds, company.id)
    if row is None:
        row = BuyerSourcingNeeds(company_id=company.id)
        session.add(row)
    for field, value in data.model_dump().items():
        setattr(row, field, value)
    await session.commit()
    await session.refresh(row)
    return _needs_out(row)


async def get_sourcing_needs_for(
    session: AsyncSession, company_id: uuid.UUID
) -> SourcingNeedsOut | None:
    """Nhu cầu của một buyer — module khác (RFQ, ghép nối) đọc qua đây, không query bảng."""
    row = await session.get(BuyerSourcingNeeds, company_id)
    return _needs_out(row) if row else None


async def count_buyers_by_country(
    session: AsyncSession, countries: list[str], category: str | None = None
) -> dict[str, int]:
    """Số buyer đã đăng ký (không ẩn hồ sơ) theo nước, tuỳ chọn lọc theo nhóm hàng cần mua.
    Chỉ trả số đếm — không lộ tên buyer. Module markets dùng cho mục "Đối tác tiềm năng"."""
    if not countries:
        return {}
    query = (
        select(Company.country, func.count())
        .where(
            Company.type == CompanyType.buyer,
            Company.is_hidden.is_(False),
            Company.hide_profile_views.is_(False),
            Company.country.in_(countries),
        )
        .group_by(Company.country)
    )
    if category:
        query = query.where(
            Company.id.in_(
                select(CompanySourcingCategory.company_id).where(
                    CompanySourcingCategory.category == category
                )
            )
        )
    return {code: int(total) for code, total in (await session.execute(query)).all()}
