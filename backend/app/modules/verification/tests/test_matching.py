"""So khớp nội bộ bằng quy tắc (I8) — không LLM. Dữ liệu SYNTHETIC."""

import datetime as dt
from dataclasses import replace

import pytest

from app.modules.verification.matching import (
    CertificateClaims,
    CompanyRecord,
    Finding,
    IssuerContact,
    consistency_findings,
    issuer_email_draft,
    normalize_company_name,
    overall,
    same_address,
    same_name,
)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Công ty TNHH Nông Sản Việt", "nong san viet"),
        ("CÔNG TY CỔ PHẦN Nông Sản Việt", "nong san viet"),
        ("Công ty TNHH MTV Nông Sản Việt", "nong san viet"),
        ("Nong San Viet Co., Ltd.", "nong san viet"),
        ("Nong San Viet JSC", "nong san viet"),
        ("Công ty TNHH Thành Công", "thanh cong"),  # không cắt chữ giữa tên
        ("Global Foods Trading GmbH", "global foods trading"),
    ],
)
def test_normalize_company_name(raw: str, expected: str) -> None:
    assert normalize_company_name(raw) == expected


def test_same_name_ignores_legal_form_and_accents() -> None:
    assert same_name("CÔNG TY TNHH NÔNG SẢN VIỆT", "Nong San Viet Co., Ltd")
    assert not same_name("Công ty TNHH Nông Sản Việt", "Công ty TNHH Nông Sản Miền Tây")


def test_same_address_tolerates_small_differences() -> None:
    assert same_address(
        "720A Điện Biên Phủ, P.22, Bình Thạnh, TP.HCM", "720A Dien Bien Phu P22 Binh Thanh TPHCM"
    )
    assert not same_address("720A Điện Biên Phủ, TP.HCM", "12 Nguyễn Huệ, Quận 1, TP.HCM")


COMPANY = CompanyRecord(
    legal_name="Công ty TNHH Nông Sản Việt",
    address="720A Điện Biên Phủ, TP. Hồ Chí Minh",
    website="https://vietagri-export.vn",
    contact_email="contact@vietagri-export.vn",
    registered_name="CÔNG TY TNHH NÔNG SẢN VIỆT",
    registered_address=None,
    sold_categories=frozenset({"agriculture"}),
    tax_id_shared=False,
    certificate_duplicated=False,
)
CERT = CertificateClaims(
    holder_name="Nong San Viet Co., Ltd",
    holder_address="720A Dien Bien Phu, Ho Chi Minh City",
    scope_categories=frozenset({"agriculture", "seafood"}),
)


def results(cert: CertificateClaims, company: CompanyRecord) -> dict[str, str]:
    return {f.rule: f.result for f in consistency_findings(cert, company)}


def test_all_consistent_is_match() -> None:
    found = results(CERT, COMPANY)
    assert set(found.values()) == {"match"}
    assert overall(consistency_findings(CERT, COMPANY)) == "match"


# ── 5/5 ca cờ theo "Xong khi" (+ trùng số chứng nhận) ─────────────────────────────────────
@pytest.mark.parametrize(
    ("cert_over", "company_over", "rule"),
    [
        ({"holder_name": "Công ty TNHH Thủy Sản Mekong"}, {}, "name"),
        ({"holder_address": "12 Nguyễn Huệ, Quận 1, Hà Nội"}, {}, "address"),
        ({"scope_categories": frozenset({"seafood"})}, {}, "scope"),
        ({}, {"tax_id_shared": True}, "duplicate_tax_id"),
        ({}, {"contact_email": "sales@other-trading.vn"}, "domain"),
        ({}, {"certificate_duplicated": True}, "duplicate_certificate"),
    ],
    ids=["name", "address", "scope", "duplicate_tax_id", "domain", "duplicate_certificate"],
)
def test_each_mismatch_is_flagged(
    cert_over: dict[str, object], company_over: dict[str, object], rule: str
) -> None:
    cert = replace(CERT, **cert_over)  # type: ignore[arg-type]
    company = replace(COMPANY, **company_over)  # type: ignore[arg-type]
    found = results(cert, company)
    assert found[rule] == "mismatch"
    assert [r for r, v in found.items() if v == "mismatch"] == [rule]
    assert overall(consistency_findings(cert, company)) == "mismatch"


def test_name_must_also_match_registry_when_known() -> None:
    company = replace(COMPANY, registered_name="Công ty TNHH Một Tên Khác")
    assert results(CERT, company)["name"] == "mismatch"


def test_address_matches_registry_address_when_profile_differs() -> None:
    company = replace(
        COMPANY,
        address="Văn phòng đại diện Hà Nội",
        registered_address="720A Điện Biên Phủ, TP.HCM",
    )
    cert = replace(CERT, holder_address="720A Dien Bien Phu, TP HCM")
    assert results(cert, company)["address"] == "match"


def test_missing_data_is_unchecked_not_match() -> None:
    cert = CertificateClaims(holder_name=None, holder_address=None, scope_categories=None)
    company = replace(COMPANY, website=None)
    found = results(cert, company)
    assert found["name"] == found["address"] == found["scope"] == found["domain"] == "unchecked"
    assert overall([Finding("name", "unchecked"), Finding("scope", "unchecked")]) == "unchecked"


def test_scope_unchecked_when_company_sells_nothing_yet() -> None:
    assert results(CERT, replace(COMPANY, sold_categories=frozenset()))["scope"] == "unchecked"


# ── Email xác nhận: địa chỉ luôn lấy từ bảng tổ chức cấp ────────────────────────────────────
def test_issuer_email_goes_to_registered_contact_not_to_file() -> None:
    draft = issuer_email_draft(
        IssuerContact(name="SGS Vietnam", contact_email="certcheck@sgs.com"),
        certificate_number="VN-123",
        issuer_on_file="SGS (verify@sgs-check.fake)",
        holder="Công ty TNHH Nông Sản Việt",
        issued_at=dt.date(2026, 1, 1),
        expires_at=dt.date(2029, 1, 1),
    )
    assert draft.to == "certcheck@sgs.com"
    assert "sgs-check.fake" not in draft.to
    assert "VN-123" in draft.subject
    assert "Công ty TNHH Nông Sản Việt" in draft.body and "2029-01-01" in draft.body
