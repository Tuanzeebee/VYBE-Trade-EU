from collections.abc import AsyncIterator
from typing import Annotated

import pytest
from fastapi import APIRouter, Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import register_error_handlers
from app.modules.auth.router import router as auth_router
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import create_admin, require_role

probe = APIRouter()


@probe.get("/api/admin/_probe")
async def admin_probe(
    user: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> dict[str, str]:
    return {"role": user.role}


@pytest.fixture
async def probe_client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """App riêng cho test, không đụng router thật của app.main."""
    app = FastAPI()
    register_error_handlers(app)
    app.include_router(auth_router)
    app.include_router(probe)

    async def _session() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_session] = _session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as c:
        yield c


async def _register(client: AsyncClient, role: str) -> None:
    body = {
        "email": f"{role}@x.vn",
        "password": "mat-khau-du-dai",
        "role": role,
        "preferred_language": "en",
        "accept_terms": True,
    }
    assert (await client.post("/api/auth/register", json=body)).status_code == 201


async def test_admin_route_401_without_session(probe_client: AsyncClient) -> None:
    assert (await probe_client.get("/api/admin/_probe")).status_code == 401


@pytest.mark.parametrize("role", ["buyer", "exporter"])
async def test_admin_route_403_for_other_roles(probe_client: AsyncClient, role: str) -> None:
    await _register(probe_client, role)
    assert (await probe_client.get("/api/admin/_probe")).status_code == 403


async def test_admin_route_200_for_admin(
    probe_client: AsyncClient, db_session: AsyncSession
) -> None:
    await create_admin(db_session, "root@x.vn", "mat-khau-du-dai")
    r = await probe_client.post(
        "/api/auth/login", json={"email": "root@x.vn", "password": "mat-khau-du-dai"}
    )
    assert r.status_code == 200
    assert (await probe_client.get("/api/admin/_probe")).json() == {"role": "admin"}
