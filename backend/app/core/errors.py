"""Một dạng lỗi chuẩn cho toàn API: {"error": {"code": ..., "message": ...}}."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _body(code: str, message: str) -> dict[str, dict[str, str]]:
    return {"error": {"code": code, "message": message}}


async def _app_error(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(_body(exc.code, exc.message), status_code=exc.status_code)


async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        _body(f"http_{exc.status_code}", str(exc.detail)),
        status_code=exc.status_code,
        headers=exc.headers,
    )


def register_error_handlers(app: FastAPI) -> None:
    app.exception_handler(AppError)(_app_error)
    app.exception_handler(StarletteHTTPException)(_http_error)
