"""Định vị địa chỉ (U21, ADR-0003) — chỉ gọi từ job nền, chỉ khi chủ hồ sơ đồng ý hiện vị trí.

Nominatim (OpenStreetMap): tối đa 1 yêu cầu/giây, User-Agent riêng theo điều khoản sử dụng.
"""

import asyncio
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

import httpx

from app.core.config import get_settings

MIN_INTERVAL_SECONDS = 1.0


@dataclass(frozen=True)
class GeoPoint:
    latitude: Decimal
    longitude: Decimal
    display_name: str


class Geocoder(Protocol):
    async def geocode(self, address: str, country: str | None) -> GeoPoint | None: ...


class NominatimGeocoder:
    _lock = asyncio.Lock()
    _last_call = 0.0

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        s = get_settings()
        self._url = s.nominatim_url
        self._client = client or httpx.AsyncClient(
            timeout=s.lookup_timeout_seconds, headers={"User-Agent": s.nominatim_user_agent}
        )

    async def geocode(self, address: str, country: str | None) -> GeoPoint | None:
        params = {"q": address, "format": "jsonv2", "limit": "1"}
        if country:
            params["countrycodes"] = country.lower()
        async with NominatimGeocoder._lock:
            wait = MIN_INTERVAL_SECONDS - (time.monotonic() - NominatimGeocoder._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            try:
                r = await self._client.get(self._url, params=params)
                rows = r.json() if r.status_code == 200 else []
            except (httpx.HTTPError, ValueError):
                rows = []
            finally:
                NominatimGeocoder._last_call = time.monotonic()
        if not rows:
            return None
        first = rows[0]
        try:
            lat = Decimal(str(first["lat"])).quantize(Decimal("0.000001"))
            lon = Decimal(str(first["lon"])).quantize(Decimal("0.000001"))
        except (KeyError, ArithmeticError, ValueError):
            return None
        return GeoPoint(lat, lon, str(first.get("display_name", ""))[:255])


class FakeGeocoder:
    def __init__(self, points: dict[str, GeoPoint] | None = None) -> None:
        self.points = points or {}
        self.calls: list[str] = []

    async def geocode(self, address: str, country: str | None) -> GeoPoint | None:
        self.calls.append(address)
        return self.points.get(address)
