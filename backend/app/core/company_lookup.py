"""Tra cứu định danh doanh nghiệp (U21, ADR-0003) — chỉ gọi từ job nền.

- VIES (Ủy ban châu Âu): mã VAT EU còn hiệu lực, tên và địa chỉ đăng ký.
- GLEIF: mã LEI, tên pháp nhân, trạng thái.
Kết quả chỉ là tín hiệu cho admin; dịch vụ lỗi → unknown, không chặn xác minh thủ công.
"""

import re
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx

from app.core.config import get_settings

EU_VAT_COUNTRIES = frozenset(
    "AT BE BG CY CZ DE DK EE EL ES FI FR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK XI".split()
)
LEI_PATTERN = re.compile(r"^[A-Z0-9]{18}[0-9]{2}$")


@dataclass(frozen=True)
class LookupResult:
    status: str  # pass | fail | unknown
    detail: dict[str, Any] = field(default_factory=dict)


class CompanyLookup(Protocol):
    async def vat(self, country: str, number: str) -> LookupResult: ...
    async def lei(self, code: str) -> LookupResult: ...


def split_vat(country: str, raw: str) -> tuple[str, str] | None:
    """('DE', '123456789') từ 'DE 123 456 789' hoặc '123456789' + quốc gia. Hy Lạp dùng mã EL."""
    text = re.sub(r"[\s.\-]", "", raw.upper())
    prefix = text[:2]
    if prefix.isalpha() and prefix in EU_VAT_COUNTRIES:
        return prefix, text[2:]
    code = "EL" if country.upper() == "GR" else country.upper()
    return (code, text) if code in EU_VAT_COUNTRIES and text else None


def _gleif_address(address: object) -> str | None:
    """Ghép địa chỉ pháp lý của GLEIF thành một chuỗi; thiếu thì None."""
    if not isinstance(address, dict):
        return None
    lines = [str(x) for x in address.get("addressLines") or []]
    parts = [*lines, address.get("postalCode"), address.get("city"), address.get("country")]
    text = " ".join(str(p) for p in parts if p)
    return text or None


class HttpCompanyLookup:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        s = get_settings()
        self._vies = s.vies_url.rstrip("/")
        self._gleif = s.gleif_url.rstrip("/")
        self._client = client or httpx.AsyncClient(timeout=s.lookup_timeout_seconds)

    async def vat(self, country: str, number: str) -> LookupResult:
        try:
            r = await self._client.get(f"{self._vies}/ms/{country}/vat/{number}")
            if r.status_code != 200:
                return LookupResult("unknown", {"http_status": r.status_code})
            data = r.json()
        except (httpx.HTTPError, ValueError):
            return LookupResult("unknown", {"error": "vies_unavailable"})
        if data.get("userError") not in (None, "VALID", "INVALID"):
            return LookupResult("unknown", {"error": data.get("userError")})
        valid = bool(data.get("isValid"))
        detail = {"name": data.get("name"), "address": data.get("address"), "country": country}
        return LookupResult("pass" if valid else "fail", detail)

    async def lei(self, code: str) -> LookupResult:
        try:
            r = await self._client.get(f"{self._gleif}/lei-records/{code}")
            if r.status_code == 404:
                return LookupResult("fail", {"error": "not_found"})
            if r.status_code != 200:
                return LookupResult("unknown", {"http_status": r.status_code})
            attributes = r.json()["data"]["attributes"]
        except (httpx.HTTPError, ValueError, KeyError):
            return LookupResult("unknown", {"error": "gleif_unavailable"})
        entity = attributes.get("entity", {})
        status = attributes.get("registration", {}).get("status")
        detail: dict[str, Any] = {
            "name": entity.get("legalName", {}).get("name"),
            "registration_status": status,
            # Số đăng ký quốc gia, cơ quan đăng ký và địa chỉ pháp lý: để đối chiếu với hồ sơ khai.
            "registered_as": entity.get("registeredAs"),
            "registered_at": (entity.get("registeredAt") or {}).get("id"),
            "legal_address": _gleif_address(entity.get("legalAddress")),
        }
        return LookupResult("pass" if status == "ISSUED" else "fail", detail)


class FakeCompanyLookup:
    def __init__(
        self,
        vats: dict[str, LookupResult] | None = None,
        leis: dict[str, LookupResult] | None = None,
    ) -> None:
        self.vats = vats or {}
        self.leis = leis or {}

    async def vat(self, country: str, number: str) -> LookupResult:
        return self.vats.get(f"{country}{number}", LookupResult("unknown"))

    async def lei(self, code: str) -> LookupResult:
        return self.leis.get(code, LookupResult("unknown"))
