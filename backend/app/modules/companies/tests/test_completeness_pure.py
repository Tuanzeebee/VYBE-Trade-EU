"""Hàm thuần tính điểm hoàn thiện hồ sơ (B3): không DB, không HTTP — test theo bảng ca."""

from decimal import Decimal

import pytest

from app.modules.companies.completeness import (
    CompanyFacts,
    ProductFacts,
    WeightRow,
    build_facts,
    compute_score,
    is_valid_vat_or_eori,
    is_valid_vn_tax_id,
)


def row(key: str, weight: str, *, group: str = "g", enabled: bool = True) -> WeightRow:
    return WeightRow(key, group, Decimal(weight), enabled)


# ── compute_score ────────────────────────────────────────────────────────────


def test_all_enabled_facts_true_gives_exactly_100() -> None:
    rows = [row("a", "60"), row("b", "40")]
    result = compute_score({"a": True, "b": True}, rows)
    assert result.score == Decimal("100.00")
    assert result.missing == ()


def test_disabled_rows_leave_the_denominator() -> None:
    """Mẫu số chỉ gồm dòng ĐANG BẬT — hồ sơ đủ mọi thứ hiện có phải ra 100%, không phải 80%."""
    rows = [row("a", "80"), row("logo", "5", enabled=False), row("evidence", "15", enabled=False)]
    assert compute_score({"a": True}, rows).score == Decimal("100.00")
    # dòng tắt có fact True cũng không được cộng
    assert compute_score({"a": True, "logo": True, "evidence": True}, rows).score == Decimal(
        "100.00"
    )


def test_enabling_a_row_changes_the_denominator() -> None:
    facts = {"a": True, "logo": False}
    off = [row("a", "80"), row("logo", "20", enabled=False)]
    on = [row("a", "80"), row("logo", "20", enabled=True)]
    assert compute_score(facts, off).score == Decimal("100.00")
    assert compute_score(facts, on).score == Decimal("80.00")


@pytest.mark.parametrize(
    ("facts", "expected"),
    [
        ({}, "0.00"),
        ({"a": True}, "50.00"),
        ({"b": True}, "30.00"),
        ({"a": True, "b": True}, "80.00"),
        ({"a": True, "b": True, "c": True}, "100.00"),
        ({"c": True}, "20.00"),
        ({"unknown": True}, "0.00"),
    ],
)
def test_partial_scores(facts: dict[str, bool], expected: str) -> None:
    rows = [row("a", "50"), row("b", "30"), row("c", "20")]
    assert compute_score(facts, rows).score == Decimal(expected)


def test_no_enabled_rows_scores_zero_without_dividing_by_zero() -> None:
    assert compute_score({"a": True}, []).score == Decimal("0.00")
    assert compute_score({"a": True}, [row("a", "10", enabled=False)]).score == Decimal("0.00")
    assert compute_score({"a": True}, [row("a", "0")]).score == Decimal("0.00")


def test_score_is_rounded_half_up_to_two_decimals_and_stays_decimal() -> None:
    rows = [row("a", "1"), row("b", "1"), row("c", "1")]
    result = compute_score({"a": True}, rows)
    assert result.score == Decimal("33.33")
    assert isinstance(result.score, Decimal)
    assert compute_score({"a": True, "b": True}, rows).score == Decimal("66.67")
    half = [row("a", "1"), row("b", "7999")]  # 1/8000 = 0.0125% → 0.01 (làm tròn nửa lên)
    assert compute_score({"a": True}, half).score == Decimal("0.01")


def test_missing_sorted_by_weight_desc_then_key_and_only_enabled() -> None:
    rows = [
        row("z", "5", group="x"),
        row("a", "5", group="y"),
        row("big", "30", group="x"),
        row("done", "20"),
        row("off", "50", enabled=False),
    ]
    result = compute_score({"done": True}, rows)
    assert [m.field_key for m in result.missing] == ["big", "a", "z"]
    assert next((m.field_key, m.group_key, m.weight) for m in result.missing) == (
        "big",
        "x",
        Decimal("30"),
    )


def test_score_never_exceeds_100_or_goes_negative() -> None:
    rows = [row("a", "10"), row("b", "10")]
    for facts in ({}, {"a": True}, {"a": True, "b": True}):
        assert Decimal("0") <= compute_score(facts, rows).score <= Decimal("100")


# ── mã số thuế ───────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("value", "ok"),
    [
        ("0312345678", True),
        ("0312345678-001", True),
        ("0312 345 678", True),
        (" 0312345678 ", True),
        ("0312345678001", True),
        ("031234567", False),
        ("03123456789", False),
        ("031234567890", False),
        ("03123456789012", False),
        ("abcdefghij", False),
        ("031234567a", False),
        ("", False),
        (None, False),
    ],
)
def test_vn_tax_id_is_10_or_13_digits_ignoring_dash_and_spaces(value: str | None, ok: bool) -> None:
    assert is_valid_vn_tax_id(value) is ok


# ── VAT / EORI ───────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("country", "vat", "eori", "ok"),
    [
        ("DE", "DE123456789", None, True),
        ("DE", "de123456789", None, True),
        ("DE", "DE 123 456 789", None, True),
        ("DE", "DE.123.456.789", None, True),
        ("DE", None, "DE123456789012345", True),
        ("NL", "NL123456789B01", None, True),
        ("DE", "FR123456789", None, False),
        ("DE", None, "FR123456789", False),
        ("DE", "DE1", None, False),
        ("DE", "DE", None, False),
        ("DE", None, "DE" + "1" * 16, False),
        ("DE", "123456789", None, False),
        ("DE", "DE12345!678", None, False),
        ("DE", "", "", False),
        ("DE", None, None, False),
        ("DE", "  ", None, False),
        ("GR", "EL123456789", None, True),
        ("GR", "GR123456789", None, True),
        ("GR", None, "GR123456789012", True),
        ("GR", None, "EL123456789012", False),
        ("DE", "EL123456789", None, False),
        ("FR", "XX", "FR123456789", True),
    ],
)
def test_vat_or_eori_prefix_must_match_company_country(
    country: str, vat: str | None, eori: str | None, ok: bool
) -> None:
    assert is_valid_vat_or_eori(country, vat, eori) is ok


# ── build_facts ──────────────────────────────────────────────────────────────

LONG = "x" * 150


def exporter(**over: object) -> CompanyFacts:
    base: dict[str, object] = {
        "type": "exporter",
        "country": "VN",
        "tax_id": None,
        "business_type": None,
        "founded_year": None,
        "address": None,
        "description_vi": None,
        "description_en": None,
        "website": None,
        "logo_key": None,
        "industry_sector": None,
        "company_size": None,
        "procurement_estimate": None,
        "vat_number": None,
        "eori_number": None,
        "export_markets": (),
        "languages": (),
        "sourcing_categories": (),
        "evidence_count": 0,
    }
    base.update(over)
    return CompanyFacts(**base)  # type: ignore[arg-type]


def buyer(**over: object) -> CompanyFacts:
    return exporter(type="buyer", country="DE", **over)


def test_empty_exporter_has_no_fact_true_except_nothing() -> None:
    facts = build_facts(exporter(), [])
    assert set(facts) == {
        "tax_id",
        "business_model",
        "founded_year",
        "address",
        "description_en",
        "description_vi",
        "website",
        "logo",
        "industry_sector",
        "export_markets",
        "foreign_language",
        "product_hs",
        "product_image",
        "product_description",
        "product_price",
        "evidence",
    }
    assert not any(facts.values())


def test_auto_filled_fields_do_not_appear_as_facts() -> None:
    """legal_name, country, contact_email, registration_number không thể làm tăng điểm."""
    for facts in (build_facts(exporter(), []), build_facts(buyer(), [])):
        assert {"legal_name", "country", "contact_email", "registration_number"}.isdisjoint(facts)


@pytest.mark.parametrize(
    ("text", "ok"),
    [("x" * 149, False), ("x" * 150, True), (" " * 200, False), ("  " + "x" * 149 + "  ", False),
     ("  " + "x" * 150 + "  ", True), ("a", False), (None, False)],
)  # fmt: skip
def test_company_descriptions_need_150_chars_after_trim(text: str | None, ok: bool) -> None:
    facts = build_facts(exporter(description_en=text, description_vi=text), [])
    assert facts["description_en"] is ok
    assert facts["description_vi"] is ok


@pytest.mark.parametrize(
    ("text", "ok"), [("x" * 9, False), ("x" * 10, True), ("   x   ", False), (None, False)]
)
def test_address_needs_10_chars(text: str | None, ok: bool) -> None:
    assert build_facts(exporter(address=text), [])["address"] is ok


@pytest.mark.parametrize(
    ("value", "ok"),
    [
        ("manufacturer", True),
        ("trader", True),
        ("both", True),
        ("TNHH", False),
        ("", False),
        (None, False),
    ],
)
def test_exporter_business_model_must_be_a_known_value(value: str | None, ok: bool) -> None:
    assert build_facts(exporter(business_type=value), [])["business_model"] is ok


def test_founded_year_website_logo_industry() -> None:
    facts = build_facts(
        exporter(
            founded_year=2016,
            website="https://a.vn",
            logo_key="logos/x.png",
            industry_sector="seafood",
        ),
        [],
    )
    assert (facts["founded_year"], facts["website"], facts["logo"], facts["industry_sector"]) == (
        True,
    ) * 4


def test_export_markets_and_foreign_language() -> None:
    assert build_facts(exporter(export_markets=("EU",)), [])["export_markets"] is True
    assert build_facts(exporter(export_markets=()), [])["export_markets"] is False
    assert build_facts(exporter(languages=("vi",)), [])["foreign_language"] is False
    assert build_facts(exporter(languages=("vi", "en")), [])["foreign_language"] is True
    assert build_facts(exporter(languages=("ja",)), [])["foreign_language"] is True


def test_product_facts_need_only_one_product_to_qualify() -> None:
    plain = ProductFacts(has_image=False, description_length=0, has_price=False)
    facts = build_facts(exporter(), [plain])
    assert facts["product_hs"] is True
    assert (facts["product_image"], facts["product_description"], facts["product_price"]) == (
        False,
    ) * 3
    rich = [plain, ProductFacts(has_image=True, description_length=30, has_price=True)]
    facts = build_facts(exporter(), rich)
    assert (facts["product_image"], facts["product_description"], facts["product_price"]) == (
        True,
    ) * 3


def test_product_description_needs_30_chars() -> None:
    short = ProductFacts(has_image=False, description_length=29, has_price=False)
    assert build_facts(exporter(), [short])["product_description"] is False


def test_no_products_means_no_product_facts() -> None:
    facts = build_facts(exporter(), [])
    assert facts["product_hs"] is False


def test_evidence_fact_follows_count() -> None:
    assert build_facts(exporter(evidence_count=0), [])["evidence"] is False
    assert build_facts(exporter(evidence_count=1), [])["evidence"] is True


def test_exporter_tax_id_uses_format_check() -> None:
    assert build_facts(exporter(tax_id="0312345678"), [])["tax_id"] is True
    assert build_facts(exporter(tax_id="123"), [])["tax_id"] is False


def test_buyer_facts() -> None:
    empty = build_facts(buyer(), [])
    assert set(empty) == {
        "sourcing_categories",
        "vat_or_eori",
        "company_size",
        "procurement_estimate",
        "business_type",
        "website",
        "logo",
    }
    assert not any(empty.values())
    full = build_facts(
        buyer(
            sourcing_categories=("agriculture",),
            vat_number="DE123456789",
            company_size="51_200",
            procurement_estimate="500k_2m",
            business_type="Nhà nhập khẩu",
            website="https://x.de",
            logo_key="logos/x.png",
        ),
        [],
    )
    assert all(full.values())


def test_buyer_products_are_ignored() -> None:
    facts = build_facts(buyer(), [ProductFacts(True, 100, True)])
    assert "product_hs" not in facts


def test_buyer_eori_alone_counts_and_wrong_country_prefix_does_not() -> None:
    assert build_facts(buyer(eori_number="DE123456789012"), [])["vat_or_eori"] is True
    assert build_facts(buyer(vat_number="FR123456789"), [])["vat_or_eori"] is False
