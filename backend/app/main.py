import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_session
from app.core.errors import register_error_handlers
from app.core.logging import RequestIdMiddleware, setup_logging
from app.core.ratelimit import enforce_public_limit
from app.core.storage import Storage, get_storage
from app.jobs.app import app as jobs_app
from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.companies.router import router as companies_router
from app.modules.compliance.router import router as compliance_router
from app.modules.copilot.router import router as copilot_router
from app.modules.directory.router import router as directory_router
from app.modules.notifications import handlers as notification_handlers
from app.modules.notifications.router import router as notifications_router
from app.modules.verification.router import router as verification_router

setup_logging()
log = logging.getLogger(__name__)
notification_handlers.register()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Mở kết nối hàng đợi job để xếp việc (gửi email…); worker là tiến trình riêng."""
    async with jobs_app.open_async():
        yield


app = FastAPI(title="evfta.eu API", dependencies=[Depends(enforce_public_limit)], lifespan=lifespan)
app.add_middleware(RequestIdMiddleware)
# Frontend gọi API kèm cookie phiên (ADR-0002) → chỉ cho các origin khai báo trong cấu hình.
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["content-type", "x-request-id"],
)
register_error_handlers(app)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(companies_router)
app.include_router(catalog_router)
app.include_router(compliance_router)
app.include_router(copilot_router)
app.include_router(directory_router)
app.include_router(notifications_router)
app.include_router(verification_router)


@app.get("/health")
async def health(
    session: Annotated[AsyncSession, Depends(get_session)],
    storage: Annotated[Storage, Depends(get_storage)],
) -> JSONResponse:
    status: dict[str, str] = {}
    try:
        await session.execute(text("SELECT 1"))
        status["db"] = "ok"
    except Exception:
        log.exception("health: db lỗi")
        status["db"] = "error"
    try:
        await storage.ping()
        status["storage"] = "ok"
    except Exception:
        log.exception("health: storage lỗi")
        status["storage"] = "error"
    ok = all(v == "ok" for v in status.values())
    return JSONResponse(status, status_code=200 if ok else 503)
