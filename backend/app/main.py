import logging
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import register_error_handlers
from app.core.logging import RequestIdMiddleware, setup_logging
from app.core.storage import Storage, get_storage

setup_logging()
log = logging.getLogger(__name__)

app = FastAPI(title="evfta.eu API")
app.add_middleware(RequestIdMiddleware)
register_error_handlers(app)


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
