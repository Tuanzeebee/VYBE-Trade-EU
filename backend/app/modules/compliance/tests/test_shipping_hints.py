"""N6a: benchmark cước/bảo hiểm — chỉ dòng đã duyệt và còn hạn mới lộ ra."""

import datetime as dt
import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compliance.benchmarks import usable
from app.modules.compliance.models import FreightBenchmark, InsuranceBenchmark

URL = "/api/public/shipping-hints"
TODAY = dt.datetime.now(dt.UTC).date()


@dataclass
class Row:
    reviewed_by: object | None
    valid_from: dt.date
    valid_until: dt.date


D = dt.date


@pytest.mark.parametrize(
    ("row", "shown"),
    [
        (Row("u", D(2026, 10, 1), D(2026, 12, 31)), True),
        (Row(None, D(2026, 10, 1), D(2026, 12, 31)), False),  # chưa duyệt
        (Row("u", D(2026, 1, 1), D(2026, 9, 30)), False),  # quá hạn
        (Row("u", D(2026, 10, 5), D(2026, 12, 31)), False),  # chưa hiệu lực
        (Row("u", D(2026, 10, 4), D(2026, 10, 4)), True),  # biên: đúng hôm nay
    ],
)
def test_usable_requires_review_and_validity(row: Row, shown: bool) -> None:
    assert (usable([row], D(2026, 10, 4)) == [row]) is shown


def freight(reviewer: uuid.UUID | None, **over: Any) -> FreightBenchmark:
    fields: dict[str, Any] = {
        "origin_port": "Cat Lai",
        "dest_country": "DE",
        "container_type": "40HC",
        "cargo_class": "dry",
        "price_low": Decimal("2500.00"),
        "price_typical": Decimal("3000.00"),
        "price_high": Decimal("3500.00"),
        "currency": "USD",
        "valid_from": TODAY - dt.timedelta(days=5),
        "valid_until": TODAY + dt.timedelta(days=25),
        "source": "SYNTHETIC test",
    }
    if reviewer is not None:
        fields["reviewed_by"] = reviewer
        fields["reviewed_at"] = dt.datetime.now(dt.UTC)
    fields.update(over)
    return FreightBenchmark(**fields)


async def test_hints_empty_when_nothing_reviewed(api_client: AsyncClient) -> None:
    r = await api_client.get(URL, params={"dest_country": "DE", "cargo_class": "dry"})
    assert r.status_code == 200
    assert r.json() == {"freight": [], "insurance": None}


async def test_hints_show_only_reviewed_unexpired(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    db_session.add_all(
        [
            freight(reviewer_id),
            freight(None, container_type="20GP"),  # chưa duyệt → ẩn
            freight(reviewer_id, container_type="40GP", valid_until=TODAY - dt.timedelta(days=1)),
            freight(reviewer_id, dest_country="FR"),  # nước khác → ẩn
            InsuranceBenchmark(
                cargo_class="dry",
                rate_percent=Decimal("0.2000"),
                basis="cif",
                source="SYNTHETIC test",
                valid_from=TODAY - dt.timedelta(days=5),
                valid_until=TODAY + dt.timedelta(days=25),
                reviewed_by=reviewer_id,
                reviewed_at=dt.datetime.now(dt.UTC),
            ),
        ]
    )
    await db_session.flush()
    r = await api_client.get(URL, params={"dest_country": "DE", "cargo_class": "dry"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert [f["container_type"] for f in d["freight"]] == ["40HC"]
    assert Decimal(d["freight"][0]["price_typical"]) == Decimal("3000.00")
    assert d["freight"][0]["source"] == "SYNTHETIC test"
    assert d["insurance"]["basis"] == "cif"
    assert Decimal(d["insurance"]["rate_percent"]) == Decimal("0.2")


async def test_hints_validate_inputs(api_client: AsyncClient) -> None:
    assert (await api_client.get(URL, params={"dest_country": "Germany"})).status_code == 422
    r = await api_client.get(URL, params={"dest_country": "DE", "cargo_class": "gold"})
    assert r.status_code == 422
