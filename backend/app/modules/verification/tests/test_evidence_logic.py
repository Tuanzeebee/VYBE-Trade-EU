"""Hàm thuần của bằng chứng (C6): hạn dùng và điều kiện EVFTA-verified. Không đụng DB."""

import datetime as dt

import pytest

from app.modules.verification.logic import (
    EvidenceFact,
    add_months,
    checklist_state,
    evidence_expiry,
    is_evfta_verified,
    is_valid,
)

D = dt.date
TODAY = D(2026, 10, 15)


def ev(
    type_code: str = "a", status: str = "approved", expires: dt.date | None = None
) -> EvidenceFact:
    return EvidenceFact(type_code=type_code, approval_status=status, expires_at=expires)


# ── add_months / hạn 12 tháng của bằng chứng xuất xứ ────────────────────────
@pytest.mark.parametrize(
    ("start", "months", "expected"),
    [
        (D(2026, 1, 15), 12, D(2027, 1, 15)),
        (D(2026, 1, 31), 1, D(2026, 2, 28)),  # cuối tháng ngắn hơn
        (D(2028, 1, 31), 1, D(2028, 2, 29)),  # năm nhuận
        (D(2028, 2, 29), 12, D(2029, 2, 28)),  # 29/2 + 12 tháng
        (D(2026, 11, 30), 3, D(2027, 2, 28)),
        (D(2026, 12, 31), 6, D(2027, 6, 30)),
        (D(2026, 5, 10), 0, D(2026, 5, 10)),
    ],
)
def test_add_months(start: dt.date, months: int, expected: dt.date) -> None:
    assert add_months(start, months) == expected


def test_origin_evidence_expires_after_12_months() -> None:
    assert evidence_expiry(D(2026, 3, 10), 12, None) == D(2027, 3, 10)


def test_type_validity_overrides_client_supplied_expiry() -> None:
    """Loại có validity_months: hạn do hệ thống tính, không tin ngày client gửi."""
    assert evidence_expiry(D(2026, 3, 10), 12, D(2099, 1, 1)) == D(2027, 3, 10)


def test_type_without_validity_uses_supplied_expiry_or_none() -> None:
    assert evidence_expiry(D(2026, 3, 10), None, D(2028, 6, 1)) == D(2028, 6, 1)
    assert evidence_expiry(D(2026, 3, 10), None, None) is None


# ── is_valid ────────────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    ("status", "expires", "expected"),
    [
        ("approved", None, True),
        ("approved", TODAY + dt.timedelta(days=1), True),
        ("approved", TODAY, False),  # ngày hết hạn đã hết hiệu lực (loại trừ)
        ("approved", TODAY - dt.timedelta(days=1), False),
        ("pending", None, False),
        ("rejected", None, False),
    ],
)
def test_is_valid(status: str, expires: dt.date | None, expected: bool) -> None:
    assert is_valid(ev(status=status, expires=expires), TODAY) is expected


# ── is_evfta_verified ───────────────────────────────────────────────────────
def test_evfta_verified_requires_proven_ownership() -> None:
    have = [ev("a")]
    assert is_evfta_verified("verified", have, {"a"}, TODAY, ownership_proven=False) is False
    assert is_evfta_verified("verified", have, {"a"}, TODAY, ownership_proven=True) is True


def test_evfta_verified_requires_all_required_valid() -> None:
    have = [ev("a"), ev("b")]
    assert is_evfta_verified("verified", have, {"a", "b"}, TODAY, ownership_proven=True) is True
    assert (
        is_evfta_verified("verified", have, {"a", "b", "c"}, TODAY, ownership_proven=True) is False
    )


def test_extra_evidence_does_not_matter() -> None:
    assert (
        is_evfta_verified("verified", [ev("a"), ev("z")], {"a"}, TODAY, ownership_proven=True)
        is True
    )


@pytest.mark.parametrize("status", ["unverified", "pending", "rejected"])
def test_only_verified_companies_can_be_evfta_verified(status: str) -> None:
    assert is_evfta_verified(status, [ev("a")], {"a"}, TODAY, ownership_proven=True) is False


def test_no_required_rules_means_not_evfta_verified() -> None:
    """Không có dữ liệu bắt buộc thì KHÔNG được coi là 'đủ' (an toàn: không tự nâng mức)."""
    assert is_evfta_verified("verified", [ev("a")], set(), TODAY, ownership_proven=True) is False


def test_expired_or_unapproved_evidence_does_not_count() -> None:
    assert (
        is_evfta_verified("verified", [ev("a", expires=TODAY)], {"a"}, TODAY, ownership_proven=True)
        is False
    )
    assert (
        is_evfta_verified(
            "verified", [ev("a", status="pending")], {"a"}, TODAY, ownership_proven=True
        )
        is False
    )


def test_one_valid_among_several_of_same_type_is_enough() -> None:
    have = [
        ev("a", expires=TODAY - dt.timedelta(days=5)),
        ev("a", expires=TODAY + dt.timedelta(days=5)),
    ]
    assert is_evfta_verified("verified", have, {"a"}, TODAY, ownership_proven=True) is True


def test_expired_evidence_downgrades_level() -> None:
    """Hôm nay còn hạn, ngày mai hết hạn → hàm cho kết quả khác nhau (job dùng để hạ mức)."""
    have = [ev("a", expires=TODAY + dt.timedelta(days=1))]
    assert is_evfta_verified("verified", have, {"a"}, TODAY, ownership_proven=True) is True
    assert (
        is_evfta_verified(
            "verified", have, {"a"}, TODAY + dt.timedelta(days=1), ownership_proven=True
        )
        is False
    )


# ── checklist ───────────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    ("items", "expected"),
    [
        ([], "missing"),
        ([ev("a", "approved")], "approved"),
        ([ev("a", "approved", TODAY)], "expired"),
        ([ev("a", "pending")], "pending"),
        ([ev("a", "rejected")], "rejected"),
        ([ev("a", "rejected"), ev("a", "pending")], "pending"),
        ([ev("a", "pending"), ev("a", "approved")], "approved"),
        ([ev("a", "approved", TODAY), ev("a", "pending")], "pending"),
        ([ev("a", "approved", TODAY), ev("a", "rejected")], "expired"),
        ([ev("b", "approved")], "missing"),  # bằng chứng loại khác không tính
    ],
)
def test_checklist_state(items: list[EvidenceFact], expected: str) -> None:
    assert checklist_state("a", items, TODAY) == expected
