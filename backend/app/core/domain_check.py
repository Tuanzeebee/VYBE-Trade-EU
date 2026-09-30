"""Kiểm tên miền email (U21, ADR-0003) — chỉ gọi từ job nền.

- Mail miễn phí: danh sách trong repo (data/free_email_domains.txt).
- MX: DNS-over-HTTPS (JSON), không cần thư viện DNS.
- Tuổi tên miền: RDAP (sự kiện "registration").
"""

import datetime as dt
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Protocol

import httpx

from app.core.config import get_settings

FREE_MAIL_FILE = Path(__file__).resolve().parents[2] / "data" / "free_email_domains.txt"


@lru_cache
def free_mail_domains(path: Path = FREE_MAIL_FILE) -> frozenset[str]:
    return frozenset(
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    )


def domain_of(email_or_domain: str) -> str:
    text = email_or_domain.strip().lower()
    return text.rsplit("@", 1)[-1].rstrip(".")


@dataclass(frozen=True)
class DomainResult:
    domain: str
    free_mail: bool
    mx: str  # pass | fail | unknown
    registered_on: dt.date | None = None


class DomainChecker(Protocol):
    async def check(self, email_or_domain: str) -> DomainResult: ...


class HttpDomainChecker:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        s = get_settings()
        self._doh = s.doh_url
        self._rdap = s.rdap_url.rstrip("/")
        self._client = client or httpx.AsyncClient(
            timeout=s.lookup_timeout_seconds, follow_redirects=True
        )

    async def _mx(self, domain: str) -> str:
        try:
            r = await self._client.get(
                self._doh,
                params={"name": domain, "type": "MX"},
                headers={"accept": "application/dns-json"},
            )
            data = r.json()
        except (httpx.HTTPError, ValueError):
            return "unknown"
        if data.get("Status") == 3:  # NXDOMAIN
            return "fail"
        answers = [a for a in data.get("Answer") or [] if a.get("type") == 15]
        return "pass" if answers else "fail"

    async def _registered(self, domain: str) -> dt.date | None:
        try:
            r = await self._client.get(f"{self._rdap}/domain/{domain}")
            if r.status_code != 200:
                return None
            events = r.json().get("events") or []
        except (httpx.HTTPError, ValueError):
            return None
        for event in events:
            if event.get("eventAction") == "registration" and event.get("eventDate"):
                try:
                    return dt.date.fromisoformat(str(event["eventDate"])[:10])
                except ValueError:
                    return None
        return None

    async def check(self, email_or_domain: str) -> DomainResult:
        domain = domain_of(email_or_domain)
        free = domain in free_mail_domains()
        if free:
            return DomainResult(domain, True, "pass")
        return DomainResult(domain, False, await self._mx(domain), await self._registered(domain))


class FakeDomainChecker:
    def __init__(self, results: dict[str, DomainResult] | None = None) -> None:
        self.results = results or {}

    async def check(self, email_or_domain: str) -> DomainResult:
        domain = domain_of(email_or_domain)
        default = DomainResult(domain, domain in free_mail_domains(), "unknown")
        return self.results.get(domain, default)
