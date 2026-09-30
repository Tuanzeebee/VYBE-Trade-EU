"""Một dạng lỗi chuẩn cho toàn API: {"error": {"code": ..., "message": ...}}."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.headers = headers


def _body(code: str, message: str) -> dict[str, dict[str, str]]:
    return {"error": {"code": code, "message": message}}


async def _app_error(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        _body(exc.code, exc.message), status_code=exc.status_code, headers=exc.headers
    )


async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        _body(f"http_{exc.status_code}", str(exc.detail)),
        status_code=exc.status_code,
        headers=exc.headers,
    )


async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    # Không trả lại giá trị người dùng nhập (có thể là mật khẩu), chỉ tên trường.
    fields = sorted({".".join(str(p) for p in e["loc"][1:]) for e in exc.errors()})
    body = _body("validation_error", "Dữ liệu không hợp lệ: " + ", ".join(fields))
    return JSONResponse(body, status_code=422)


def register_error_handlers(app: FastAPI) -> None:
    app.exception_handler(AppError)(_app_error)
    app.exception_handler(StarletteHTTPException)(_http_error)
    app.exception_handler(RequestValidationError)(_validation_error)
