"""Hàm thuần chống mạo danh (I11): chuẩn hoá định danh, gom cụm, tín hiệu, quyền sở hữu."""

import datetime as dt
import uuid
from dataclasses import replace

import pytest

from app.modules.verification.identity import (
    CheckFact,
    CompanyIdentity,
    Identifier,
    RegistryFacts,
    clusters,
    domain_of,
    hash_name,
    identifiers,
    normalize,
    normalize_phone,
    ownership_proven,
    signals,
)

A, B, C = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()


def company(company_id: uuid.UUID, **over: object) -> CompanyIdentity:
    base: dict[str, object] = {
        "company_id": company_id,
        "tax_id": None,
        "website": None,
        "contact_email": None,
        "login_email": None,
        "phone": None,
        "founded_year": None,
        "file_hashes": (),
        "representative_hash": None,
    }
    base.update(over)
    return CompanyIdentity(**base)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("0912 345 678", "84912345678"),
        ("+84 912-345-678", "84912345678"),
        ("0084912345678", "84912345678"),
        ("+33 6 12 34 56 78", "33612345678"),
        ("123", None),
        (None, None),
    ],
)
def test_normalize_phone(raw: str | None, expected: str | None) -> None:
    assert normalize_phone(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("https://www.VietAgri-Export.vn/about", "vietagri-export.vn"),
        ("vietagri-export.vn", "vietagri-export.vn"),
        ("Contact@VietAgri-Export.vn", "vietagri-export.vn"),
        ("http://localhost:3000", None),
        ("", None),
        (None, None),
    ],
)
def test_domain_of(raw: str | None, expected: str | None) -> None:
    assert domain_of(raw) == expected


def test_normalize_by_type() -> None:
    assert normalize("tax_id", " 0314-892-345 ") == "0314892345"
    assert normalize("domain", "https://www.x.vn") == "x.vn"
    assert normalize("phone", "0912345678") == "84912345678"
    assert normalize("file_sha256", "ABC") == "abc"


def test_hash_name_ignores_accents_case_and_spaces() -> None:
    assert hash_name("Nguyễn  Văn Đức") == hash_name("nguyen van duc")
    assert hash_name("Nguyễn Văn Đức") != hash_name("Nguyễn Văn Đạt")


# ── Gom cụm: 5/5 ca (điện thoại, domain, MST, hash file, người đại diện) ─────────────────────
REP = hash_name("Trần Thị B")


@pytest.mark.parametrize(
    ("over_a", "over_b", "shared"),
    [
        ({"phone": "0912345678"}, {"phone": "+84 912 345 678"}, Identifier("phone", "84912345678")),
        (
            {"website": "https://vietagri.vn"},
            {"contact_email": "sales@vietagri.vn"},
            Identifier("domain", "vietagri.vn"),
        ),
        ({"tax_id": "0314892345"}, {"tax_id": "0314-892-345"}, Identifier("tax_id", "0314892345")),
        (
            {"file_hashes": ("f" * 64,)},
            {"file_hashes": ("f" * 64,)},
            Identifier("file_sha256", "f" * 64),
        ),
        (
            {"representative_hash": REP},
            {"representative_hash": REP},
            Identifier("representative", REP),
        ),
    ],
    ids=["phone", "domain", "tax_id", "file", "representative"],
)
def test_clusters_group_companies_sharing_an_identifier(
    over_a: dict[str, object], over_b: dict[str, object], shared: Identifier
) -> None:
    result = clusters([company(A, **over_a), company(B, **over_b), company(C)])
    assert [(c.identifier, c.company_ids) for c in result] == [(shared, frozenset({A, B}))]


def test_free_email_domains_never_cluster() -> None:
    result = clusters(
        [
            company(A, contact_email="a@gmail.com", login_email="x@gmail.com"),
            company(B, contact_email="b@gmail.com"),
        ]
    )
    assert result == []


def test_same_company_twice_is_not_a_cluster() -> None:
    assert clusters([company(A, website="x.vn", contact_email="info@x.vn")]) == []


def test_identifiers_collects_every_type() -> None:
    ids = identifiers(
        company(
            A,
            tax_id="0314892345",
            website="https://x.vn",
            login_email="me@gmail.com",
            phone="0912345678",
            file_hashes=("a" * 64,),
            representative_hash=REP,
        )
    )
    assert ids == {
        Identifier("tax_id", "0314892345"),
        Identifier("domain", "x.vn"),
        Identifier("phone", "84912345678"),
        Identifier("file_sha256", "a" * 64),
        Identifier("representative", REP),
    }


# ── Tín hiệu: chỉ xếp ưu tiên, không quyết định ──────────────────────────────────────────────
def codes(**kwargs: object) -> set[str]:
    return {s.code for s in signals(**kwargs)}  # type: ignore[arg-type]


CLEAN = company(
    A, website="https://x.vn", contact_email="info@x.vn", phone="0912345678", founded_year=2015
)
ACTIVE = RegistryFacts(
    founded_year=2015,
    tax_status="active",
    name_changed_recently=False,
    representative_changed_recently=False,
    legal_representative_hash=None,
)


def test_clean_company_has_no_signal() -> None:
    assert codes(company=CLEAN, registry=ACTIVE, shared=[], blocked=False) == set()


def test_foreign_phone_is_never_a_signal() -> None:
    foreign = company(A, website="https://x.vn", contact_email="info@x.vn", phone="+33612345678")
    assert codes(company=foreign, registry=None, shared=[], blocked=False) == set()


@pytest.mark.parametrize(
    ("over", "registry", "expected"),
    [
        ({"contact_email": "x.export@gmail.com"}, None, {"free_email"}),
        ({"contact_email": "info@other.vn"}, None, {"email_domain_mismatch"}),
        ({"contact_email": "info@mail.x.vn"}, None, set()),
        ({}, {"tax_status": "inactive"}, {"tax_inactive"}),
        ({"founded_year": 2010}, {"founded_year": 2025}, {"founded_mismatch"}),
        ({"founded_year": 2025}, {"founded_year": 2024}, set()),
        ({}, {"name_changed_recently": True}, {"name_changed_recently"}),
        ({}, {"representative_changed_recently": True}, {"representative_changed_recently"}),
    ],
)
def test_signals_from_company_and_registry(
    over: dict[str, object], registry: dict[str, object] | None, expected: set[str]
) -> None:
    facts = None if registry is None else replace(ACTIVE, **registry)  # type: ignore[arg-type]
    subject = replace(CLEAN, **over)  # type: ignore[arg-type]
    assert codes(company=subject, registry=facts, shared=[], blocked=False) == expected


def test_shared_identifiers_and_blocklist_signals_with_severity() -> None:
    result = signals(
        company=CLEAN,
        registry=None,
        shared=[Identifier("tax_id", "1"), Identifier("phone", "2"), Identifier("phone", "3")],
        blocked=True,
    )
    assert [(s.code, s.severity) for s in result] == [
        ("blocklisted", "high"),
        ("shared_tax_id", "high"),
        ("shared_phone", "medium"),
    ]


# ── Quyền sở hữu: lần gọi lại mới nhất quyết định ───────────────────────────────────────────
T0 = dt.datetime(2026, 10, 1, tzinfo=dt.UTC)


@pytest.mark.parametrize(
    ("checks", "expected"),
    [
        ([], False),
        ([CheckFact("phone_callback", "match", T0)], True),
        ([CheckFact("email_domain", "match", T0)], False),
        (
            [
                CheckFact("phone_callback", "match", T0),
                CheckFact("phone_callback", "mismatch", T0 + dt.timedelta(hours=1)),
            ],
            False,
        ),
        (
            [
                CheckFact("phone_callback", "mismatch", T0),
                CheckFact("phone_callback", "match", T0 + dt.timedelta(hours=1)),
            ],
            True,
        ),
    ],
)
def test_ownership_proven_uses_latest_phone_callback(
    checks: list[CheckFact], expected: bool
) -> None:
    assert ownership_proven(checks) is expected
