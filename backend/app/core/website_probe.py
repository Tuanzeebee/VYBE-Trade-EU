"""Kiểm website khai báo (U21, ADR-0003) — chỉ gọi từ job nền.

Chống SSRF:
- chỉ http/https, cổng mặc định hoặc 80/443/8080/8443;
- phân giải DNS rồi chặn mọi IP private, loopback, link-local, multicast, reserved, unspecified
  (kể cả IPv4 nhúng trong IPv6);
- kết nối thẳng tới IP ĐÃ KIỂM (Host + SNI giữ tên miền) để DNS không đổi giữa lúc kiểm và lúc gọi;
- chỉ theo redirect trong cùng host (tối đa 3 lần), mỗi lần kiểm lại; timeout 5 giây; đọc tối đa
  64 KB; không gửi cookie.
"""

import asyncio
import ipaddress
import re
import socket
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from html import unescape
from typing import Protocol
from urllib.parse import urljoin, urlsplit

import httpx

TIMEOUT_SECONDS = 5.0
MAX_BYTES = 64 * 1024
MAX_REDIRECTS = 3
ALLOWED_PORTS = {80, 443, 8080, 8443}
USER_AGENT = "VYBE-Trade-VerificationBot/1.0 (+https://vybe.trade)"
_TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)

Resolver = Callable[[str, int], Awaitable[list[str]]]


class BlockedTarget(Exception):
    """Địa chỉ không được phép gọi (SSRF)."""


@dataclass(frozen=True)
class ProbeResult:
    status: str  # pass | fail | unknown
    http_status: int | None = None
    final_url: str | None = None
    title: str | None = None
    text: str = ""  # tối đa MAX_BYTES, để so tên công ty
    error: str | None = None


class WebsiteProbe(Protocol):
    async def probe(self, url: str) -> ProbeResult: ...


async def system_resolver(host: str, port: int) -> list[str]:
    loop = asyncio.get_running_loop()
    infos = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    return list(dict.fromkeys(str(info[4][0]) for info in infos))


def is_public_ip(raw: str) -> bool:
    ip = ipaddress.ip_address(raw.split("%", 1)[0])
    if isinstance(ip, ipaddress.IPv6Address):
        embedded = ip.ipv4_mapped or ip.sixtofour or (ip.teredo[1] if ip.teredo else None)
        if embedded is not None:
            return is_public_ip(str(embedded))
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
        or not ip.is_global
    )


def normalize_url(raw: str) -> str:
    text = raw.strip()
    if "://" not in text:
        text = f"https://{text}"
    return text


async def safe_target(url: str, resolver: Resolver) -> tuple[str, str, int, str]:
    """(scheme, host, port, ip) đã kiểm; ném BlockedTarget nếu không được gọi."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise BlockedTarget("scheme")
    if parts.username or parts.password:
        raise BlockedTarget("credentials")
    port = parts.port or (443 if parts.scheme == "https" else 80)
    if port not in ALLOWED_PORTS:
        raise BlockedTarget("port")
    host = parts.hostname.lower().rstrip(".")
    try:
        ipaddress.ip_address(host)
        addresses = [host]
    except ValueError:
        if host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
            raise BlockedTarget("host") from None
        try:
            addresses = await resolver(host, port)
        except OSError as exc:
            raise BlockedTarget("dns") from exc
    if not addresses or not all(is_public_ip(a) for a in addresses):
        raise BlockedTarget("private_address")
    return parts.scheme, host, port, addresses[0]


class HttpWebsiteProbe:
    def __init__(
        self,
        resolver: Resolver = system_resolver,
        transport: httpx.AsyncBaseTransport | None = None,
        timeout: float = TIMEOUT_SECONDS,
    ) -> None:
        self._resolver = resolver
        self._transport = transport
        self._timeout = timeout

    async def _fetch(
        self, client: httpx.AsyncClient, url: str
    ) -> tuple[httpx.Response, bytes, str]:
        scheme, host, port, ip = await safe_target(url, self._resolver)
        parts = urlsplit(url)
        literal = f"[{ip}]" if ":" in ip else ip
        path = parts.path or "/"
        if parts.query:
            path += f"?{parts.query}"
        pinned = f"{scheme}://{literal}:{port}{path}"
        client.cookies.clear()  # không gửi lại cookie nhận được (kể cả qua redirect)
        request = client.build_request(
            "GET",
            pinned,
            headers={"Host": host if port in (80, 443) else f"{host}:{port}"},
            extensions={"sni_hostname": host} if scheme == "https" else {},
        )
        response = await client.send(request, stream=True)
        body = b""
        try:
            async for chunk in response.aiter_bytes():
                body += chunk
                if len(body) >= MAX_BYTES:
                    body = body[:MAX_BYTES]
                    break
        finally:
            await response.aclose()
        return response, body, host

    async def probe(self, url: str) -> ProbeResult:
        current = normalize_url(url)
        try:
            async with httpx.AsyncClient(
                transport=self._transport,
                timeout=self._timeout,
                follow_redirects=False,
                headers={"User-Agent": USER_AGENT, "Accept": "text/html,*/*;q=0.5"},
                cookies=None,
            ) as client:
                start_host: str | None = None
                for _ in range(MAX_REDIRECTS + 1):
                    response, body, host = await self._fetch(client, current)
                    start_host = start_host or host
                    if host != start_host:
                        return ProbeResult("fail", error="redirect_other_host", final_url=current)
                    if response.is_redirect and "location" in response.headers:
                        current = urljoin(current, response.headers["location"])
                        target = urlsplit(current).hostname or ""
                        if target.lower().rstrip(".") != start_host:
                            return ProbeResult(
                                "fail", response.status_code, current, error="redirect_other_host"
                            )
                        continue
                    text = body.decode(response.encoding or "utf-8", errors="replace")
                    match = _TITLE.search(text)
                    title = " ".join(unescape(match.group(1)).split())[:200] if match else None
                    ok = 200 <= response.status_code < 400
                    return ProbeResult(
                        "pass" if ok else "fail",
                        response.status_code,
                        current,
                        title,
                        text,
                        None if ok else f"http_{response.status_code}",
                    )
                return ProbeResult("fail", error="too_many_redirects", final_url=current)
        except BlockedTarget as exc:
            return ProbeResult("fail", error=f"blocked_{exc.args[0]}", final_url=current)
        except httpx.HTTPError as exc:
            return ProbeResult("unknown", error=type(exc).__name__, final_url=current)


class FakeWebsiteProbe:
    """Test: trả kết quả theo URL; không có trong bảng → unknown."""

    def __init__(self, results: dict[str, ProbeResult] | None = None) -> None:
        self.results = results or {}
        self.calls: list[str] = []

    async def probe(self, url: str) -> ProbeResult:
        self.calls.append(url)
        return self.results.get(normalize_url(url), ProbeResult("unknown", error="not_configured"))
