"""Đối chiếu GLEIF (onboarding buyer, bước giấy phép & chứng nhận): số đăng ký quốc gia và địa chỉ
pháp lý trong GLEIF so với hồ sơ khai. Chỉ là tín hiệu cho admin; nguồn ngoài là bản giả."""

import datetime as dt
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.company_lookup import FakeCompanyLookup, LookupResult
from app.core.domain_check import FakeDomainChecker
from app.core.geocoder import FakeGeocoder
from app.core.website_probe import FakeWebsiteProbe
from app.modules.companies import service as companies
from app.modules.companies.tests.helpers import buyer_body, login_as
from app.modules.verification.checks import registration_numbers_match
from app.modules.verification.checks_service import CheckSources, run_checks

NOW = dt.datetime(2026, 10, 5, 9, tzinfo=dt.UTC)
LEI = "5493001KJTIIGC8Y1R12"
DECLARED_ADDRESS = "Hafenstraße 12, 20457 Hamburg"


@pytest.mark.parametrize(
    ("declared", "registered", "expected"),
    [
        ("HRB 12345", "HRB12345", True),
        ("hrb-12345", "HRB 12345", True),
        ("HRB 12345", "12345", True),  # GLEIF thường chỉ giữ phần số
        ("HRB 12345", "HRB 99999", False),
        ("", "HRB 12345", False),
        ("HRB 12345", "---", False),
    ],
)
def test_registration_numbers_match(declared: str, registered: str, expected: bool) -> None:
    assert registration_numbers_match(declared, registered) is expected


def sources(detail: dict[str, Any] | None, status: str = "pass") -> CheckSources:
    leis = {LEI: LookupResult(status, detail or {})} if detail is not None else {}
    return CheckSources(
        lookup=FakeCompanyLookup(leis=leis),
        domains=FakeDomainChecker(),
        probe=FakeWebsiteProbe(),
        geocoder=FakeGeocoder(),
    )


async def run(
    api_client: AsyncClient,
    session: AsyncSession,
    src: CheckSources,
    **company: Any,
) -> tuple[dict[str, tuple[str, dict[str, Any]]], tuple[str, int], tuple[str, int]]:
    await login_as(api_client, "buyer", "buyer@globalfoods.de")
    body = buyer_body(
        legal_name="Global Foods GmbH", website=None, vat_number=None, address=DECLARED_ADDRESS
    )
    body.update(company)
    r = await api_client.post("/api/me/company", json=body)
    assert r.status_code == 201, r.text
    company_id = uuid.UUID(r.json()["id"])
    before = await companies.get_verification_state(session, company_id)
    results: dict[str, tuple[str, dict[str, Any]]] = {
        c.check_code: (c.status, c.detail) for c in await run_checks(session, company_id, src, NOW)
    }
    after = await companies.get_verification_state(session, company_id)
    return results, (before.status, before.tier), (after.status, after.tier)


GLEIF_OK = {
    "name": "GLOBAL FOODS GMBH",
    "registration_status": "ISSUED",
    "registered_as": "HRB 12345",
    "registered_at": "RA000242",
    "legal_address": "Hafenstrasse 12 20457 Hamburg DE",
}


async def test_matching_gleif_record_passes_both_checks_and_changes_no_status(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    results, before, after = await run(
        api_client, db_session, sources(GLEIF_OK), lei_code=LEI, registration_number="HRB12345"
    )
    assert results["gleif_lei"][0] == "pass"
    assert results["gleif_registration_match"][0] == "pass"
    assert results["gleif_registration_match"][1]["registered_at"] == "RA000242"
    assert results["gleif_address_match"][0] == "pass"
    assert before == after


async def test_different_registration_number_and_address_are_warnings(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    other = {**GLEIF_OK, "registered_as": "HRB 99999", "legal_address": "Rue de la Loi 16 1000 BE"}
    results, _, _ = await run(
        api_client, db_session, sources(other), lei_code=LEI, registration_number="HRB 12345"
    )
    assert results["gleif_registration_match"][0] == "warning"
    assert results["gleif_address_match"][0] == "warning"


async def test_no_declared_registration_number_means_no_registration_check(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    results, _, _ = await run(api_client, db_session, sources(GLEIF_OK), lei_code=LEI)
    assert "gleif_registration_match" not in results
    assert results["gleif_address_match"][0] == "pass"


async def test_gleif_without_registry_data_means_no_extra_checks(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    bare = {"name": "GLOBAL FOODS GMBH", "registration_status": "ISSUED"}
    results, _, _ = await run(
        api_client, db_session, sources(bare), lei_code=LEI, registration_number="HRB 12345"
    )
    assert results["gleif_lei"][0] == "pass"
    assert "gleif_registration_match" not in results
    assert "gleif_address_match" not in results


async def test_failed_lei_lookup_gives_no_extra_checks(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    results, _, _ = await run(
        api_client,
        db_session,
        sources({"error": "not_found"}, status="fail"),
        lei_code=LEI,
        registration_number="HRB 12345",
    )
    assert results["gleif_lei"][0] == "fail"
    assert "gleif_registration_match" not in results


async def test_lei_typed_in_registration_number_still_works_but_is_not_compared_to_itself(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Hồ sơ cũ để LEI trong ô số đăng ký: vẫn tra GLEIF, nhưng không đem LEI so với số đăng ký."""
    results, _, _ = await run(api_client, db_session, sources(GLEIF_OK), registration_number=LEI)
    assert results["gleif_lei"][0] == "pass"
    assert "gleif_registration_match" not in results


async def test_buyer_can_request_verification_with_only_a_lei(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "buyer", "buyer@globalfoods.de")
    body = buyer_body(vat_number=None, lei_code=LEI)
    assert (await api_client.post("/api/me/company", json=body)).status_code == 201
    r = await api_client.post("/api/buyer/verification-requests")
    assert r.status_code == 201, r.text


async def test_buyer_without_any_identifier_is_still_refused(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await login_as(api_client, "buyer", "buyer@globalfoods.de")
    body = buyer_body(vat_number=None)
    assert (await api_client.post("/api/me/company", json=body)).status_code == 201
    r = await api_client.post("/api/buyer/verification-requests")
    assert r.status_code == 422


async def test_http_lookup_keeps_registry_number_authority_and_legal_address() -> None:
    import httpx

    from app.core.company_lookup import HttpCompanyLookup

    record = {
        "data": {
            "attributes": {
                "entity": {
                    "legalName": {"name": "GLOBAL FOODS GMBH"},
                    "registeredAs": "HRB 12345",
                    "registeredAt": {"id": "RA000242"},
                    "legalAddress": {
                        "addressLines": ["Hafenstrasse 12"],
                        "postalCode": "20457",
                        "city": "Hamburg",
                        "country": "DE",
                    },
                },
                "registration": {"status": "ISSUED"},
            }
        }
    }
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=record))
    lookup = HttpCompanyLookup(httpx.AsyncClient(transport=transport))
    result = await lookup.lei(LEI)
    assert result.status == "pass"
    assert result.detail["registered_as"] == "HRB 12345"
    assert result.detail["registered_at"] == "RA000242"
    assert result.detail["legal_address"] == "Hafenstrasse 12 20457 Hamburg DE"


async def test_http_lookup_tolerates_a_record_without_registry_fields() -> None:
    import httpx

    from app.core.company_lookup import HttpCompanyLookup

    record = {
        "data": {
            "attributes": {
                "entity": {"legalName": {"name": "X"}},
                "registration": {"status": "ISSUED"},
            }
        }
    }
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=record))
    result = await HttpCompanyLookup(httpx.AsyncClient(transport=transport)).lei(LEI)
    assert result.detail["registered_as"] is None
    assert result.detail["legal_address"] is None
