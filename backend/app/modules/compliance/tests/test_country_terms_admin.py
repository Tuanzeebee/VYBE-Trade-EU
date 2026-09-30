"""API admin cho import_country_terms. Dữ liệu SYNTHETIC."""

import datetime as dt
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.modules.auth.service import create_admin
from app.modules.companies.tests.helpers import PASSWORD, login_as
from app.modules.compliance.service import find_terms

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/admin/country-terms"
TODAY = dt.datetime.now(dt.UTC).date()
FROM = (TODAY - dt.timedelta(days=30)).isoformat()


def body(**over: Any) -> dict[str, Any]:
    b: dict[str, Any] = {
        "hs_code": "030617",
        "country": "DE",
        "vat_rate": "7",
        "label_languages": "de",
        "note": "synthetic",
        "source": "synthetic",
        "valid_from": FROM,
    }
    b.update(over)
    return b


@pytest.fixture
async def admin(api_client: AsyncClient, db_session: AsyncSession) -> AsyncClient:
    await create_admin(db_session, "admin@evfta.eu", PASSWORD)
    r = await api_client.post(
        "/api/auth/login", json={"email": "admin@evfta.eu", "password": PASSWORD}
    )
    assert r.status_code == 200, r.text
    return api_client


ROUTES = [
    ("GET", URL),
    ("POST", URL),
    ("PATCH", f"{URL}/00000000-0000-0000-0000-000000000000"),
    ("POST", f"{URL}/00000000-0000-0000-0000-000000000000/review"),
    ("DELETE", f"{URL}/00000000-0000-0000-0000-000000000000"),
]


@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_401_without_session(api_client: AsyncClient, method: str, path: str) -> None:
    assert (await api_client.request(method, path, json={})).status_code == 401


@pytest.mark.parametrize(("method", "path"), ROUTES)
async def test_403_for_non_admin(api_client: AsyncClient, method: str, path: str) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.request(method, path, json={})).status_code == 403


async def test_created_row_is_unreviewed_and_hidden_until_review(
    admin: AsyncClient, db_session: AsyncSession
) -> None:
    r = await admin.post(URL, json=body())
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["reviewed_by"] is None and created["vat_rate"] == "7.0000"
    assert await find_terms(db_session, "030617", TODAY) == []
    reviewed = (await admin.post(f"{URL}/{created['id']}/review")).json()
    assert reviewed["reviewed_by"] is not None
    assert [t.country for t in await find_terms(db_session, "030617", TODAY)] == ["DE"]
    actions = list(
        await db_session.scalars(select(AuditLog.action_type).order_by(AuditLog.created_at))
    )
    assert "country_term.create" in actions and "country_term.review" in actions


async def test_patch_resets_review(admin: AsyncClient, db_session: AsyncSession) -> None:
    created = (await admin.post(URL, json=body())).json()
    await admin.post(f"{URL}/{created['id']}/review")
    r = await admin.patch(f"{URL}/{created['id']}", json={"vat_rate": "8"})
    assert r.status_code == 200 and r.json()["reviewed_by"] is None
    assert await find_terms(db_session, "030617", TODAY) == []


@pytest.mark.parametrize(
    ("over", "status"),
    [
        ({"country": "US"}, 422),
        ({"hs_code": "999999"}, 422),
        ({"vat_rate": 7}, 422),
        ({"vat_rate": "101"}, 422),
    ],
)
async def test_invalid_input(admin: AsyncClient, over: dict[str, Any], status: int) -> None:
    assert (await admin.post(URL, json=body(**over))).status_code == status


async def test_duplicate_key_is_409_and_reviewed_row_cannot_be_deleted(admin: AsyncClient) -> None:
    created = (await admin.post(URL, json=body())).json()
    assert (await admin.post(URL, json=body())).status_code == 409
    await admin.post(f"{URL}/{created['id']}/review")
    assert (await admin.delete(f"{URL}/{created['id']}")).status_code == 409
