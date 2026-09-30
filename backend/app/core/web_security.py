"""Phòng thủ tầng web (J8): kiểm Origin cho request ghi và header bảo mật.

Phiên là cookie SameSite=Lax (ADR-0002) nên trình duyệt đã không gửi cookie cho POST chéo trang;
kiểm Origin/Referer là lớp thứ hai (defense in depth) cho trình duyệt cũ hoặc cấu hình sai.
Client không phải trình duyệt (curl, server-to-server) không gửi Origin thì được qua — chúng
không tự mang cookie phiên của người dùng.
"""

from collections.abc import Sequence
from urllib.parse import urlsplit

from starlette.types import ASGIApp, Message, Receive, Scope, Send

WRITE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
# Phản hồi của các nhóm URL này chứa dữ liệu riêng của người dùng: không cho cache.
PRIVATE_PREFIXES = ("/api/me", "/api/auth", "/api/admin", "/api/exporter", "/api/buyer")


def _origin_of(url: str) -> str | None:
    """'https://a.example/x?y' → 'https://a.example'; giá trị không hợp lệ → None."""
    parts = urlsplit(url)
    if not parts.scheme or not parts.netloc:
        return None
    return f"{parts.scheme}://{parts.netloc}"


class OriginCheckMiddleware:
    """Từ chối POST/PUT/PATCH/DELETE có Origin (hoặc Referer khi thiếu Origin) ngoài danh sách."""

    def __init__(self, app: ASGIApp, allowed_origins: Sequence[str]) -> None:
        self.app = app
        self.allowed = frozenset(o.rstrip("/") for o in allowed_origins)

    def _forbidden(self, headers: dict[bytes, bytes]) -> bool:
        origin = headers.get(b"origin")
        if origin is not None:
            return origin.decode("latin-1").rstrip("/") not in self.allowed
        referer = headers.get(b"referer")
        if referer is not None:
            return _origin_of(referer.decode("latin-1")) not in self.allowed
        return False

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["method"] in WRITE_METHODS:
            if self._forbidden(dict(scope["headers"])):
                body = b'{"error":{"code":"forbidden_origin","message":"Origin not allowed"}}'
                await send(
                    {
                        "type": "http.response.start",
                        "status": 403,
                        "headers": [
                            (b"content-type", b"application/json"),
                            (b"content-length", str(len(body)).encode()),
                        ],
                    }
                )
                await send({"type": "http.response.body", "body": body})
                return
        await self.app(scope, receive, send)


class SecurityHeadersMiddleware:
    """Thêm header bảo mật cho mọi phản hồi (không ghi đè header đã có)."""

    def __init__(self, app: ASGIApp, *, hsts: bool) -> None:
        self.app = app
        self.hsts = hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path: str = scope["path"]

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers: list[tuple[bytes, bytes]] = message.setdefault("headers", [])
                present = {name.lower() for name, _ in headers}
                wanted = {
                    b"x-content-type-options": b"nosniff",
                    b"x-frame-options": b"DENY",
                    b"referrer-policy": b"no-referrer",
                }
                if self.hsts:
                    wanted[b"strict-transport-security"] = b"max-age=31536000; includeSubDomains"
                if path.startswith(PRIVATE_PREFIXES):
                    wanted[b"cache-control"] = b"no-store"
                for name, value in wanted.items():
                    if name not in present:
                        headers.append((name, value))
            await send(message)

        await self.app(scope, receive, send_with_headers)
