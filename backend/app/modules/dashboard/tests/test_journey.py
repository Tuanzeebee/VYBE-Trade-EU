"""N1: hành trình seller — hàm thuần, không DB."""

from decimal import Decimal

import pytest

from app.modules.dashboard.journey import (
    JourneyState,
    build_steps,
    next_step,
    track_progress,
)


def state(**kw: object) -> JourneyState:
    base: dict[str, object] = {
        "has_company": True,
        "completeness_score": Decimal("80"),
        "product_count": 1,
        "verification_status": "verified",
        "gtm_report_count": 1,
        "tariff_runs": 1,
        "origin_runs": 1,
        "rfq_total": 1,
    }
    base.update(kw)
    return JourneyState(**base)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("overrides", "expected"),
    [
        ({"has_company": False, "completeness_score": Decimal("0"), "product_count": 0}, "company"),
        ({"completeness_score": Decimal("59.99")}, "company"),
        ({"product_count": 0}, "products"),
        ({"verification_status": "unverified"}, "evidence"),
        ({"verification_status": "rejected"}, "evidence"),
        ({"verification_status": "pending"}, "verification"),
        ({"gtm_report_count": 0}, "market"),
        ({"tariff_runs": 0}, "tariff"),
        ({"origin_runs": 0}, "origin"),
        ({"rfq_total": 0}, "requests"),
        ({}, None),
    ],
)
def test_next_step_is_first_unfinished(overrides: dict[str, object], expected: str | None) -> None:
    assert next_step(state(**overrides)) == expected


def test_no_company_always_points_at_company_even_if_other_signals_set() -> None:
    assert next_step(state(has_company=False)) == "company"


def test_services_step_is_never_the_next_step_and_never_done() -> None:
    steps = {s.key: s for s in build_steps(state())}
    assert steps["services"].done is False
    assert next_step(state()) is None


def test_track_progress_counts_per_track() -> None:
    steps = build_steps(state(product_count=0, tariff_runs=0))
    assert track_progress(steps, "product") == (3, 4)
    assert track_progress(steps, "sales") == (3, 5)


def test_steps_keep_a_fixed_order() -> None:
    assert [s.key for s in build_steps(state())] == [
        "company", "products", "evidence", "verification",
        "market", "tariff", "origin", "requests", "services",
    ]  # fmt: skip
