"""C3: địa chỉ khai báo so với địa chỉ trong sổ đăng ký (VIES) — tín hiệu cho admin, không đổi
trạng thái xác minh. Nguồn ngoài là bản giả, test không gọi mạng."""

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
from app.modules.verification.checks import address_matches, registry_address
from app.modules.verification.checks_service import CheckSources, run_checks

NOW = dt.datetime(2026, 10, 3, 9, tzinfo=dt.UTC)
DECLARED = "Hafenstraße 12, 20457 Hamburg"


@pytest.mark.parametrize(
    ("declared", "registered", "expected"),
    [
        (DECLARED, "HAFENSTRASSE 12\n20457 HAMBURG", True),
        ("Hafenstrasse 12 Hamburg", "HAFENSTRASSE 12 20457 HAMBURG", True),
        (DECLARED, "RUE DE LA LOI 16\n1000 BRUXELLES", False),
        ("", "HAFENSTRASSE 12", False),
    ],
)
def test_address_matches(declared: str, registered: str, expected: bool) -> None:
    assert address_matches(declared, registered) is expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("---", None), ("  ", None), (None, None), (12, None), ("A  B\nC", "A B C")],
)
def test_registry_address_ignores_undisclosed_values(raw: object, expected: str | None) -> None:
    assert registry_address(raw) == expected


def sources(address: object) -> CheckSources:
    detail: dict[str, object] = {"name": "GLOBAL FOODS GMBH"}
    if address is not None:
        detail["address"] = address
    return CheckSources(
        lookup=FakeCompanyLookup(vats={"DE123456789": LookupResult("pass", detail)}),
        domains=FakeDomainChecker(),
        probe=FakeWebsiteProbe(),
        geocoder=FakeGeocoder(),
    )


async def run(
    api_client: AsyncClient, session: AsyncSession, address: object
) -> tuple[dict[str, tuple[str, dict[str, Any]]], tuple[str, int], tuple[str, int]]:
    await login_as(api_client, "buyer", "buyer@globalfoods.de")
    r = await api_client.post(
        "/api/me/company",
        json=buyer_body(legal_name="Global Foods GmbH", address=DECLARED, website=None),
    )
    assert r.status_code == 201, r.text
    company_id = uuid.UUID(r.json()["id"])
    before = await companies.get_verification_state(session, company_id)
    results: dict[str, tuple[str, dict[str, Any]]] = {
        c.check_code: (c.status, c.detail)
        for c in await run_checks(session, company_id, sources(address), NOW)
    }
    after = await companies.get_verification_state(session, company_id)
    return results, (before.status, before.tier), (after.status, after.tier)


async def test_matching_registry_address_passes(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    results, before, after = await run(api_client, db_session, "HAFENSTRASSE 12\n20457 HAMBURG")
    status, detail = results["vies_address_match"]
    assert status == "pass"
    assert detail["declared_address"] == DECLARED
    assert before == after  # chỉ là tín hiệu, không đổi trạng thái


async def test_different_registry_address_is_a_warning_for_admin(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    results, before, after = await run(api_client, db_session, "RUE DE LA LOI 16\n1000 BRUXELLES")
    assert results["vies_address_match"][0] == "warning"
    assert before == after


@pytest.mark.parametrize("address", [None, "---"])
async def test_no_address_in_registry_means_no_address_check(
    api_client: AsyncClient, db_session: AsyncSession, address: str | None
) -> None:
    results, _, _ = await run(api_client, db_session, address)
    assert "vies_address_match" not in results
    assert results["vies_name_match"][0] == "pass"
