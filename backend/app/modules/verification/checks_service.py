"""Kiểm tự động và kiểm tay (U21, ADR-0003).

Job nền gọi nguồn ngoài (VIES/GLEIF, DNS/RDAP, website, Nominatim) qua interface trong app/core và
ghi kết quả vào verification_checks. Kết quả chỉ là tín hiệu cho admin — không bao giờ gọi decide().
Admin ghi kết quả kiểm tay (vd Cổng ĐKDN quốc gia không có API) và nạp danh sách cơ sở TRACES-NT.
"""

import csv
import datetime as dt
import io
import logging
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record
from app.core.company_lookup import (
    LEI_PATTERN,
    CompanyLookup,
    FakeCompanyLookup,
    HttpCompanyLookup,
    split_vat,
)
from app.core.config import get_settings
from app.core.domain_check import DomainChecker, FakeDomainChecker, HttpDomainChecker
from app.core.errors import AppError
from app.core.geocoder import FakeGeocoder, Geocoder, NominatimGeocoder
from app.core.website_probe import FakeWebsiteProbe, HttpWebsiteProbe, WebsiteProbe
from app.modules.auth import service as auth
from app.modules.auth.schemas import CurrentUser
from app.modules.companies import service as companies
from app.modules.verification.checks import (
    address_matches,
    domain_age_status,
    name_matches,
    registry_address,
    same_organisation_domain,
)
from app.modules.verification.models import ApprovedEstablishment, VerificationCheck
from app.modules.verification.schemas import CheckOut, ManualCheckIn

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class CheckSources:
    lookup: CompanyLookup
    domains: DomainChecker
    probe: WebsiteProbe
    geocoder: Geocoder


def sources_from_settings() -> CheckSources:
    """live: gọi dịch vụ thật (chỉ trong job); mặc định fake — không gọi mạng."""
    if get_settings().lookup_backend == "live":
        return CheckSources(
            HttpCompanyLookup(), HttpDomainChecker(), HttpWebsiteProbe(), NominatimGeocoder()
        )
    return CheckSources(
        FakeCompanyLookup(), FakeDomainChecker(), FakeWebsiteProbe(), FakeGeocoder()
    )


# ── Hàng đợi job (test thay bằng bản ghi trong bộ nhớ) ───────────────────────
ChecksEnqueuer = Callable[[uuid.UUID], Awaitable[None]]


async def _defer_checks(company_id: uuid.UUID) -> None:
    try:
        from app.jobs.run_verification_checks import run_verification_checks

        await run_verification_checks.defer_async(company_id=str(company_id))
    except Exception:
        log.exception("Không xếp được job kiểm tự động cho công ty %s", company_id)


_enqueue_checks: ChecksEnqueuer = _defer_checks


def set_checks_enqueuer(enqueuer: ChecksEnqueuer) -> ChecksEnqueuer:
    global _enqueue_checks
    previous, _enqueue_checks = _enqueue_checks, enqueuer
    return previous


async def enqueue_checks(company_id: uuid.UUID) -> None:
    await _enqueue_checks(company_id)


# ── Chạy kiểm (thân job) ──────────────────────────────────────────────────────
Result = tuple[str, str, dict[str, Any], str]  # (mã kiểm, trạng thái, chi tiết, nguồn)


async def _email_and_website(
    sources: CheckSources, name: str, email: str | None, website: str | None, today: dt.date
) -> list[Result]:
    out: list[Result] = []
    domain = None
    if email:
        d = await sources.domains.check(email)
        domain = None if d.free_mail else d.domain
        out.append(
            (
                "email_free_mail",
                "warning" if d.free_mail else "pass",
                {"domain": d.domain},
                "free_mail_list",
            )
        )
        out.append(("email_mx", d.mx, {"domain": d.domain}, "dns_over_https"))
        if not d.free_mail:
            registered = d.registered_on.isoformat() if d.registered_on else None
            out.append(
                (
                    "domain_age",
                    domain_age_status(d.registered_on, today),
                    {"domain": d.domain, "registered_on": registered},
                    "rdap",
                )
            )
    if website:
        r = await sources.probe.probe(website)
        detail = {
            "url": r.final_url,
            "http_status": r.http_status,
            "title": r.title,
            "error": r.error,
        }
        out.append(("website_live", r.status, detail, "website_probe"))
        if r.status == "pass":
            matched = name_matches(name, f"{r.title or ''} {r.text}")
            out.append(
                (
                    "website_name_match",
                    "pass" if matched else "warning",
                    {"title": r.title},
                    "website_probe",
                )
            )
        if domain:
            same = same_organisation_domain(website, domain)
            out.append(
                (
                    "website_email_domain",
                    "pass" if same else "warning",
                    {"website": website, "email_domain": domain},
                    "rule",
                )
            )
    return out


async def _registries(
    sources: CheckSources,
    name: str,
    country: str,
    vat: str | None,
    reg: str | None,
    address: str | None = None,
) -> list[Result]:
    out: list[Result] = []
    parts = split_vat(country, vat) if vat else None
    if parts:
        v = await sources.lookup.vat(*parts)
        out.append(("vies_vat", v.status, v.detail, "vies"))
        registered_name = v.detail.get("name")
        if v.status == "pass" and registered_name and registered_name != "---":
            matched = name_matches(name, str(registered_name))
            out.append(
                (
                    "vies_name_match",
                    "pass" if matched else "warning",
                    {"registered_name": registered_name},
                    "vies",
                )
            )
        # C3: địa chỉ khai báo có khớp địa chỉ trong sổ đăng ký không. Chỉ khi nguồn có công bố địa
        # chỉ (VIES nhiều nước trả "---"); Việt Nam chưa có nguồn tự động nên admin kiểm tay.
        registered_address = registry_address(v.detail.get("address"))
        if v.status == "pass" and registered_address and address:
            out.append(
                (
                    "vies_address_match",
                    "pass" if address_matches(address, registered_address) else "warning",
                    {"registered_address": registered_address, "declared_address": address},
                    "vies",
                )
            )
    code = (reg or "").strip().upper()
    if LEI_PATTERN.match(code):
        lei = await sources.lookup.lei(code)
        out.append(("gleif_lei", lei.status, lei.detail, "gleif"))
    return out


async def _establishments(session: AsyncSession, country: str, codes: list[str]) -> Result | None:
    if not codes:
        return None
    loaded = await session.scalar(select(func.count()).select_from(ApprovedEstablishment))
    if not loaded:
        return (
            "traces_facility",
            "unknown",
            {"codes": codes, "error": "list_not_loaded"},
            "traces_nt",
        )
    found = set(
        await session.scalars(
            select(ApprovedEstablishment.approval_number).where(
                ApprovedEstablishment.country == country.upper(),
                ApprovedEstablishment.approval_number.in_(codes),
            )
        )
    )
    missing = [c for c in codes if c not in found]
    return (
        "traces_facility",
        "pass" if not missing else "fail",
        {"codes": codes, "missing": missing},
        "traces_nt",
    )


async def run_checks(
    session: AsyncSession,
    company_id: uuid.UUID,
    sources: CheckSources | None = None,
    now: dt.datetime | None = None,
) -> list[CheckOut]:
    """Chạy mọi kiểm áp dụng được cho công ty, ghi từng kết quả. Lỗi nguồn ngoài → unknown."""
    sources = sources or sources_from_settings()
    moment = now or dt.datetime.now(dt.UTC)
    company = await companies.get_company_for_review(session, company_id)
    owner = await companies.get_owner_user_id(session, company_id)
    contact = await auth.get_contact(session, owner) if owner else None
    email = company.contact_email or (contact.email if contact else None)
    results = await _email_and_website(
        sources, company.legal_name, email, company.website, moment.date()
    )
    results += await _registries(
        sources,
        company.legal_name,
        company.country,
        company.vat_number,
        company.registration_number,
        company.address,
    )
    address = company.factory_address or company.address
    if company.location_public and company.latitude is None and address:
        point = await sources.geocoder.geocode(address, company.country)
        if point is not None:
            await companies.set_coordinates(session, company_id, point.latitude, point.longitude)
        results.append(
            (
                "geocode",
                "pass" if point else "fail",
                {"address": address, "display_name": point.display_name if point else None},
                "nominatim",
            )
        )
    establishment_codes = [f.code for f in company.facility_codes if f.code_type == "establishment"]
    traces = await _establishments(session, company.country, establishment_codes)
    if traces:
        results.append(traces)
    rows = [
        VerificationCheck(
            company_id=company_id,
            check_code=code,
            status=status,
            detail=detail,
            source=source,
            checked_at=moment,
        )
        for code, status, detail, source in results
    ]
    session.add_all(rows)
    await session.commit()
    return [_out(r) for r in rows]


# ── Đọc ────────────────────────────────────────────────────────────────────────
def _out(row: VerificationCheck) -> CheckOut:
    return CheckOut(
        check_code=row.check_code,
        status=row.status,
        detail=row.detail,
        source=row.source,
        manual=row.checked_by is not None,
        checked_at=row.checked_at,
    )


async def latest_checks(session: AsyncSession, company_id: uuid.UUID) -> list[CheckOut]:
    """Kết quả mới nhất của từng loại kiểm."""
    rows = await session.scalars(
        select(VerificationCheck)
        .where(VerificationCheck.company_id == company_id)
        .order_by(VerificationCheck.check_code, VerificationCheck.checked_at.desc())
        .ext(distinct_on(VerificationCheck.check_code))
    )
    return [_out(r) for r in rows]


async def passed_check_codes(session: AsyncSession, company_id: uuid.UUID) -> set[str]:
    return {c.check_code for c in await latest_checks(session, company_id) if c.status == "pass"}


async def my_checks(session: AsyncSession, user: CurrentUser) -> list[CheckOut]:
    if user.role not in ("exporter", "buyer"):
        raise AppError("forbidden", "Not allowed for this role", 403)
    company_id = await companies.get_company_id(session, user.id)
    if company_id is None:
        raise AppError("company_not_found", "Company profile not created yet", 404)
    return await latest_checks(session, company_id)


# ── Admin ─────────────────────────────────────────────────────────────────────
async def _existing_company(session: AsyncSession, company_id: uuid.UUID) -> None:
    await companies.get_company_for_review(session, company_id)  # 404 nếu không có


async def admin_run(session: AsyncSession, company_id: uuid.UUID) -> None:
    await _existing_company(session, company_id)
    await enqueue_checks(company_id)


async def admin_record_manual(
    session: AsyncSession, admin: CurrentUser, company_id: uuid.UUID, data: ManualCheckIn
) -> CheckOut:
    await _existing_company(session, company_id)
    row = VerificationCheck(
        company_id=company_id,
        check_code=data.check_code,
        status=data.status,
        detail={"note": data.note.strip(), "url": data.url},
        source="manual",
        checked_by=admin.id,
    )
    session.add(row)
    await session.flush()
    await record(
        session,
        actor_id=admin.id,
        action_type="verification.manual_check",
        entity_type="company",
        entity_id=str(company_id),
        before=None,
        after={"check": data.check_code, "status": data.status},
    )
    await session.commit()
    await session.refresh(row)
    return _out(row)


async def import_establishments(session: AsyncSession, admin: CurrentUser, content: bytes) -> int:
    """CSV: country,approval_number,name,section (TRACES-NT). Chạy lại không tạo trùng."""
    text = content.decode("utf-8-sig", errors="replace")
    rows = []
    for number, raw in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        country = (raw.get("country") or "").strip().upper()
        approval = (raw.get("approval_number") or "").strip()
        if len(country) != 2 or not approval:
            raise AppError(
                "invalid_row", f"Row {number}: country and approval_number are required", 422
            )
        rows.append(
            {
                "list_code": "traces_nt",
                "country": country,
                "approval_number": approval[:64],
                "name": (raw.get("name") or "").strip()[:255] or None,
                "section": (raw.get("section") or "").strip()[:128] or None,
                "source": "TRACES-NT (admin upload)",
                "imported_by": admin.id,
            }
        )
    if not rows:
        raise AppError("empty_file", "The file has no rows", 422)
    unique = {(r["country"], r["approval_number"]): r for r in rows}
    stmt = insert(ApprovedEstablishment).values(list(unique.values()))
    stmt = stmt.on_conflict_do_update(
        constraint="uq_approved_establishments_list_country_number",
        set_={"name": stmt.excluded.name, "section": stmt.excluded.section},
    )
    await session.execute(stmt)
    await record(
        session,
        actor_id=admin.id,
        action_type="verification.establishments_import",
        entity_type="approved_establishments",
        entity_id="traces_nt",
        before=None,
        after={"rows": len(unique)},
    )
    await session.commit()
    return len(unique)
