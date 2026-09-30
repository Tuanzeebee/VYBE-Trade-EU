"""U21: kiểm tự động (ADR-0003) — WebsiteProbe chặn SSRF; đánh giá email/domain/website/VIES/LEI;
job ghi tín hiệu vào verification_checks và KHÔNG đổi trạng thái xác minh; kiểm tay của admin;
nạp danh sách cơ sở TRACES-NT. Mọi nguồn ngoài là bản giả — test không gọi mạng."""

import datetime as dt
import uuid
from collections.abc import Callable, Iterator
from decimal import Decimal

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.core.company_lookup import FakeCompanyLookup, LookupResult, split_vat
from app.core.domain_check import DomainResult, FakeDomainChecker, free_mail_domains
from app.core.geocoder import FakeGeocoder, GeoPoint
from app.core.website_probe import (
    FakeWebsiteProbe,
    HttpWebsiteProbe,
    ProbeResult,
    Resolver,
    is_public_ip,
)
from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import buyer_body, company_body, login_as
from app.modules.verification import checks_service
from app.modules.verification.checks import (
    domain_age_status,
    name_matches,
    same_organisation_domain,
)
from app.modules.verification.checks_service import CheckSources, run_checks
from app.modules.verification.models import VerificationCheck
from app.modules.verification.tests.test_verification_requests import login_admin

NOW = dt.datetime(2026, 10, 3, 9, tzinfo=dt.UTC)


# ── SSRF ─────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    ("ip", "public"),
    [
        ("93.184.216.34", True),
        ("2606:2800:220:1:248:1893:25c8:1946", True),
        ("127.0.0.1", False),
        ("10.1.2.3", False),
        ("172.16.0.5", False),
        ("192.168.1.1", False),
        ("169.254.169.254", False),  # metadata cloud
        ("100.64.0.1", False),  # CGNAT
        ("0.0.0.0", False),  # noqa: S104 — dữ liệu test, không bind
        ("224.0.0.1", False),
        ("::1", False),
        ("fe80::1", False),
        ("fc00::1", False),
        ("::ffff:127.0.0.1", False),  # IPv4 nhúng trong IPv6
        ("2002:7f00:1::", False),  # 6to4 của 127.0.0.1
    ],
)
def test_only_public_addresses_are_allowed(ip: str, public: bool) -> None:
    assert is_public_ip(ip) is public


def fixed_resolver(mapping: dict[str, list[str]]) -> Resolver:
    async def resolve(host: str, port: int) -> list[str]:
        if host not in mapping:
            raise OSError("no such host")
        return mapping[host]

    return resolve


def transport(
    handler: Callable[[httpx.Request], httpx.Response],
) -> tuple[httpx.MockTransport, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def wrapped(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return handler(request)

    return httpx.MockTransport(wrapped), seen


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://example.com",
        "http://127.0.0.1/",
        "http://[::1]/",
        "http://localhost/admin",
        "http://metadata.internal/",
        "http://169.254.169.254/latest/meta-data/",
        "http://user:pass@good.example/",
        "http://good.example:22/",
        "http://rebind.example/",  # tên miền phân giải ra IP nội bộ
        "http://mixed.example/",  # một trong các IP là nội bộ
    ],
)
async def test_probe_blocks_internal_targets_without_any_request(url: str) -> None:
    resolver = fixed_resolver(
        {
            "good.example": ["93.184.216.34"],
            "rebind.example": ["10.0.0.7"],
            "mixed.example": ["93.184.216.34", "192.168.0.10"],
        }
    )
    mock, seen = transport(lambda request: httpx.Response(200, text="ok"))
    result = await HttpWebsiteProbe(resolver, mock).probe(url)
    assert result.status == "fail" and (result.error or "").startswith("blocked_")
    assert seen == []


async def test_probe_pins_checked_ip_keeps_host_and_limits_body() -> None:
    resolver = fixed_resolver({"nongsanviet.vn": ["93.184.216.34"]})
    big = "<html><title>Nông Sản Việt — Export</title>" + "x" * 200_000 + "</html>"
    mock, seen = transport(lambda request: httpx.Response(200, text=big))
    result = await HttpWebsiteProbe(resolver, mock).probe("nongsanviet.vn")
    assert (result.status, result.http_status, result.title) == (
        "pass",
        200,
        "Nông Sản Việt — Export",
    )
    assert len(result.text) <= 64 * 1024
    request = seen[0]
    assert request.url.host == "93.184.216.34"  # kết nối tới IP đã kiểm
    assert request.headers["host"] == "nongsanviet.vn"
    assert request.extensions.get("sni_hostname") == "nongsanviet.vn"
    assert "cookie" not in request.headers


async def test_probe_follows_same_host_redirect_only() -> None:
    resolver = fixed_resolver({"a.example": ["93.184.216.34"], "b.example": ["93.184.216.35"]})

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/":
            return httpx.Response(301, headers={"location": "/vi", "set-cookie": "s=1"})
        if request.url.path == "/vi":
            return httpx.Response(302, headers={"location": "http://b.example/"})
        return httpx.Response(200, text="<title>B</title>")

    mock, seen = transport(handler)
    result = await HttpWebsiteProbe(resolver, mock).probe("http://a.example/")
    assert (result.status, result.error) == ("fail", "redirect_other_host")
    assert [r.url.path for r in seen] == ["/", "/vi"]
    assert all("cookie" not in r.headers for r in seen)


async def test_probe_network_error_is_unknown() -> None:
    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("slow")

    mock, _ = transport(boom)
    result = await HttpWebsiteProbe(fixed_resolver({"x.example": ["93.184.216.34"]}), mock).probe(
        "https://x.example"
    )
    assert (result.status, result.error) == ("unknown", "ConnectTimeout")


# ── Hàm thuần ─────────────────────────────────────────────────────────────────
def test_rules() -> None:
    assert name_matches("Công ty TNHH Nông Sản Việt", "NONG SAN VIET JSC - Exporter")
    assert not name_matches("Công ty TNHH Nông Sản Việt", "Global Foods GmbH")
    assert not name_matches("Công ty TNHH", "Công ty TNHH")  # chỉ có từ pháp lý → không đủ căn cứ
    assert domain_age_status(None, NOW.date()) == "unknown"
    assert domain_age_status(dt.date(2020, 1, 1), NOW.date()) == "pass"
    assert domain_age_status(dt.date(2026, 9, 1), NOW.date()) == "warning"
    assert same_organisation_domain("https://www.nongsanviet.vn/en", "nongsanviet.vn")
    assert not same_organisation_domain("nongsanviet.vn", "gmail.com")
    assert split_vat("DE", "DE 123 456 789") == ("DE", "123456789")
    assert split_vat("GR", "094259216") == ("EL", "094259216")
    assert split_vat("VN", "0314892345") is None
    assert "gmail.com" in free_mail_domains()


# ── Job ghi tín hiệu, không đổi trạng thái ────────────────────────────────────
@pytest.fixture
def no_enqueue() -> Iterator[list[uuid.UUID]]:
    box: list[uuid.UUID] = []

    async def enqueue(company_id: uuid.UUID) -> None:
        box.append(company_id)

    previous = checks_service.set_checks_enqueuer(enqueue)
    yield box
    checks_service.set_checks_enqueuer(previous)


async def test_run_checks_records_signals_and_never_changes_status(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "buyer", "buyer@globalfoods.de")
    body = buyer_body(
        legal_name="Global Foods GmbH",
        contact_email="anna@globalfoods.de",
        website="https://globalfoods.de",
    )
    r = await api_client.post("/api/me/company", json=body)
    assert r.status_code == 201, r.text
    company_id = uuid.UUID(r.json()["id"])
    sources = CheckSources(
        lookup=FakeCompanyLookup(
            vats={"DE123456789": LookupResult("pass", {"name": "GLOBAL FOODS GMBH"})}
        ),
        domains=FakeDomainChecker(
            {"globalfoods.de": DomainResult("globalfoods.de", False, "pass", dt.date(2011, 5, 2))}
        ),
        probe=FakeWebsiteProbe(
            {
                "https://globalfoods.de": ProbeResult(
                    "pass", 200, "https://globalfoods.de", "Global Foods — Importer", ""
                )
            }
        ),
        geocoder=FakeGeocoder(),
    )
    before = await companies.get_verification_state(db_session, company_id)
    results = {
        c.check_code: c.status for c in await run_checks(db_session, company_id, sources, NOW)
    }
    assert results == {
        "email_free_mail": "pass",
        "email_mx": "pass",
        "domain_age": "pass",
        "website_live": "pass",
        "website_name_match": "pass",
        "website_email_domain": "pass",
        "vies_vat": "pass",
        "vies_name_match": "pass",
    }
    after = await companies.get_verification_state(db_session, company_id)
    assert (after.status, after.tier) == (before.status, before.tier) == ("unverified", 0)

    # Lần sau website sập → bản mới nhất là fail, lịch sử vẫn giữ.
    sources.probe.results.clear()  # type: ignore[attr-defined]
    await run_checks(db_session, company_id, sources, NOW + dt.timedelta(days=1))
    latest = {
        c.check_code: c.status for c in await checks_service.latest_checks(db_session, company_id)
    }
    assert latest["website_live"] == "unknown" and "website_name_match" in latest
    count = len((await db_session.scalars(select(VerificationCheck))).all())
    assert count > len(results)

    mine = (await api_client.get("/api/me/verification-checks")).json()
    assert {c["check_code"] for c in mine} >= {"vies_vat", "website_live"}


async def test_free_mail_geocode_opt_in_and_traces(
    api_client: AsyncClient, db_session: AsyncSession, no_enqueue: list[uuid.UUID]
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    body = company_body(
        contact_email="nongsanviet@gmail.com",
        website=None,
        location_public=True,
        factory_address="Lô A1, KCN Tân Tạo, TP.HCM",
        facility_codes=[{"code_type": "establishment", "code": "DL 123"}],
    )
    r = await api_client.post("/api/me/company", json=body)
    assert r.status_code == 201, r.text
    company_id = uuid.UUID(r.json()["id"])
    point = GeoPoint(Decimal("10.750000"), Decimal("106.600000"), "Tân Tạo")
    sources = CheckSources(
        FakeCompanyLookup(),
        FakeDomainChecker(),
        FakeWebsiteProbe(),
        FakeGeocoder({"Lô A1, KCN Tân Tạo, TP.HCM": point}),
    )
    results = {c.check_code: c for c in await run_checks(db_session, company_id, sources, NOW)}
    assert results["email_free_mail"].status == "warning"
    assert "domain_age" not in results  # mail miễn phí: không kiểm tuổi tên miền
    assert results["geocode"].status == "pass"
    assert results["traces_facility"].status == "unknown"  # chưa nạp danh sách
    company = await companies.get_company_for_review(db_session, company_id)
    assert (company.latitude, company.longitude) == (point.latitude, point.longitude)

    await login_admin(api_client, db_session)
    csv_body = "country,approval_number,name,section\nVN,DL 123,Nong San Viet,Fishery products\n"
    r = await api_client.post(
        "/api/admin/approved-establishments/import",
        files={"file": ("traces.csv", csv_body.encode(), "text/csv")},
    )
    assert (r.status_code, r.json()) == (200, {"imported": 1})
    results = {c.check_code: c for c in await run_checks(db_session, company_id, sources, NOW)}
    assert results["traces_facility"].status == "pass"
    assert "geocode" not in results  # đã có toạ độ → không định vị lại

    r = await api_client.post(
        f"/api/admin/companies/{company_id}/checks",
        json={
            "check_code": "national_registry",
            "status": "pass",
            "note": "MST 0314892345 đang hoạt động",
            "url": "https://dangkykinhdoanh.gov.vn",
        },
    )
    assert r.status_code == 201 and r.json()["manual"] is True
    checks = (await api_client.get(f"/api/admin/companies/{company_id}/checks")).json()
    assert any(c["check_code"] == "national_registry" and c["status"] == "pass" for c in checks)
    audit = await db_session.scalar(
        select(AuditLog).where(AuditLog.action_type == "verification.manual_check")
    )
    assert audit is not None
    assert (
        await api_client.post(f"/api/admin/companies/{company_id}/checks/run")
    ).status_code == 202
    assert no_enqueue == [company_id]


async def test_submitting_a_request_queues_checks_and_roles(
    api_client: AsyncClient, db_session: AsyncSession, no_enqueue: list[uuid.UUID]
) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    company_id = uuid.UUID(
        (await api_client.post("/api/me/company", json=company_body())).json()["id"]
    )
    assert (await api_client.post("/api/exporter/verification-requests")).status_code == 201
    assert no_enqueue == [company_id]
    r = await api_client.post(
        f"/api/admin/companies/{company_id}/checks",
        json={"check_code": "other", "status": "pass", "note": "x"},
    )
    assert r.status_code == 403
    assert (await api_client.get(f"/api/admin/companies/{company_id}/checks")).status_code == 403
    await api_client.post("/api/auth/logout")
    assert (await api_client.get("/api/me/verification-checks")).status_code == 401
