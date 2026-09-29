from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.completeness import CompanyFacts, build_facts
from app.modules.companies.tests.helpers import (
    buyer_body,
    company_body,
    login_as,
    product_body,
)

pytestmark = pytest.mark.usefixtures("hs_seeded")

# group, weight, is_enabled — bảng trọng số đã được PO duyệt (B3)
EXPORTER_WEIGHTS = {
    "tax_id": ("legal", "10", True),
    "business_model": ("legal", "5", True),
    "founded_year": ("legal", "3", True),
    "address": ("legal", "7", True),
    "description_en": ("intro", "10", True),
    "description_vi": ("intro", "6", True),
    "website": ("intro", "4", True),
    "logo": ("intro", "5", False),
    "industry_sector": ("capability", "5", True),
    "export_markets": ("capability", "5", True),
    "foreign_language": ("capability", "5", True),
    "product_hs": ("products", "10", True),
    "product_image": ("products", "5", True),
    "product_description": ("products", "3", True),
    "product_price": ("products", "2", True),
    "evidence": ("evidence", "15", True),  # bật ở C6 (migration 0015)
}
BUYER_WEIGHTS = {
    "sourcing_categories": ("needs", "30", True),
    "vat_or_eori": ("legal", "21", True),
    "company_size": ("profile", "12", True),
    "procurement_estimate": ("needs", "12", True),
    "business_type": ("profile", "10", True),
    "website": ("profile", "10", True),
    "logo": ("profile", "5", False),
}
LONG = "Gạo thơm hạt dài xuất khẩu " * 8  # > 150 ký tự


async def _weights(session: AsyncSession, company_type: str) -> dict[str, tuple[str, str, bool]]:
    rows = await session.execute(
        text(
            "SELECT field_key, group_key, weight::text, is_enabled FROM completeness_weights "
            "WHERE company_type = :t"
        ),
        {"t": company_type},
    )
    return {k: (g, str(Decimal(w).quantize(Decimal(1))), e) for k, g, w, e in rows}


async def test_seeded_weights_match_the_approved_table(db_session: AsyncSession) -> None:
    assert await _weights(db_session, "exporter") == EXPORTER_WEIGHTS
    assert await _weights(db_session, "buyer") == BUYER_WEIGHTS


@pytest.mark.parametrize("table", [EXPORTER_WEIGHTS, BUYER_WEIGHTS])
def test_weights_sum_to_100_when_everything_is_enabled(
    table: dict[str, tuple[str, str, bool]],
) -> None:
    assert sum(Decimal(w) for _, w, _ in table.values()) == Decimal(100)


async def test_every_weight_row_has_a_fact_so_no_dead_rows(db_session: AsyncSession) -> None:
    for company_type in ("exporter", "buyer"):
        blank = {
            "type": company_type, "country": "DE", "tax_id": None, "business_type": None,
            "founded_year": None, "address": None, "description_vi": None,
            "description_en": None, "website": None, "logo_key": None, "industry_sector": None,
            "company_size": None, "procurement_estimate": None, "vat_number": None,
            "eori_number": None, "export_markets": (), "languages": (),
            "sourcing_categories": (),
        }  # fmt: skip
        facts = build_facts(CompanyFacts(**blank), [])  # type: ignore[arg-type]
        assert set(await _weights(db_session, company_type)) == set(facts), company_type


async def _create_exporter(client: AsyncClient, email: str = "exp@x.vn", **over: object) -> None:
    await login_as(client, "exporter", email)
    r = await client.post("/api/me/company", json=company_body(**over))
    assert r.status_code == 201, r.text


async def _completeness(client: AsyncClient) -> dict[str, object]:
    r = await client.get("/api/me/company/completeness")
    assert r.status_code == 200, r.text
    body: dict[str, object] = r.json()
    return body


def _missing(body: dict[str, object]) -> list[str]:
    return [m["field"] for m in body["missing"]]  # type: ignore[attr-defined]


async def _stored_score(client: AsyncClient) -> str:
    return str((await client.get("/api/me/company")).json()["profile_completeness_score"])


@pytest.fixture
async def evidence_row_disabled(db_session: AsyncSession) -> None:
    """Các phép tính dưới đây kiểm CƠ CHẾ trên nền 80 điểm (trước C6). Dòng 'evidence' được bật từ
    migration 0015 nên tắt lại trong test; hành vi khi bật có test riêng ở module verification."""
    await db_session.execute(
        text("UPDATE completeness_weights SET is_enabled = false WHERE field_key = 'evidence'")
    )


@pytest.mark.usefixtures("evidence_row_disabled")
async def test_default_exporter_scores_44_of_80(api_client: AsyncClient) -> None:
    """MST 10 + mô hình 5 + năm 3 + địa chỉ 7 + web 4 + năng lực 15 = 44/80."""
    await _create_exporter(api_client)
    body = await _completeness(api_client)
    assert body["score"] == "55.00"
    assert _missing(body) == [
        "description_en",
        "product_hs",
        "description_vi",
        "product_image",
        "product_description",
        "product_price",
    ]
    assert await _stored_score(api_client) == "55.00"


@pytest.mark.usefixtures("evidence_row_disabled")
async def test_new_company_with_only_a_name_starts_at_zero(api_client: AsyncClient) -> None:
    """Trường tự điền/bắt buộc khi tạo không được tặng điểm."""
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.post("/api/me/company", json={"legal_name": "A"})).status_code == 201
    body = await _completeness(api_client)
    assert body["score"] == "0.00"
    assert len(_missing(body)) == 14  # 16 dòng − 2 dòng tắt (logo, bằng chứng)
    assert "logo" not in _missing(body)
    assert "evidence" not in _missing(body)
    assert await _stored_score(api_client) == "0.00"


@pytest.mark.usefixtures("evidence_row_disabled")
async def test_missing_items_carry_group_and_weight(api_client: AsyncClient) -> None:
    await _create_exporter(api_client)
    first = (await _completeness(api_client))["missing"][0]  # type: ignore[index]
    assert first == {"field": "description_en", "group": "intro", "weight": "10.00"}


@pytest.mark.parametrize(("length", "counts"), [(149, False), (150, True)])
async def test_description_threshold_through_the_api(
    api_client: AsyncClient, length: int, counts: bool
) -> None:
    await _create_exporter(api_client)
    r = await api_client.patch("/api/me/company", json={"description_en": "x" * length})
    assert r.status_code == 200
    assert ("description_en" not in _missing(await _completeness(api_client))) is counts


async def test_padding_with_spaces_does_not_count(api_client: AsyncClient) -> None:
    await _create_exporter(api_client)
    await api_client.patch("/api/me/company", json={"description_en": " " * 300 + "a"})
    assert "description_en" in _missing(await _completeness(api_client))


@pytest.mark.usefixtures("evidence_row_disabled")
async def test_products_raise_the_score_step_by_step_and_it_is_stored(
    api_client: AsyncClient,
) -> None:
    await _create_exporter(api_client)
    assert await _stored_score(api_client) == "55.00"
    key = (
        await api_client.post(
            "/api/uploads/presign", json={"purpose": "product_image", "content_type": "image/png"}
        )
    ).json()["key"]

    plain = product_body(price_min=None, price_max=None, description_vi=None, description_en=None)
    pid = (await api_client.post("/api/exporter/products", json=plain)).json()["id"]
    assert (await _completeness(api_client))["score"] == "67.50"  # +10 (có sản phẩm kèm HS)
    assert await _stored_score(api_client) == "67.50"

    await api_client.patch(f"/api/exporter/products/{pid}", json={"price_min": "480"})
    assert (await _completeness(api_client))["score"] == "70.00"  # +2

    await api_client.patch(f"/api/exporter/products/{pid}", json={"description_vi": "y" * 30})
    assert (await _completeness(api_client))["score"] == "73.75"  # +3

    await api_client.patch(f"/api/exporter/products/{pid}", json={"image_keys": [key]})
    assert (await _completeness(api_client))["score"] == "80.00"  # +5
    assert await _stored_score(api_client) == "80.00"

    await api_client.patch("/api/me/company", json={"description_en": LONG, "description_vi": LONG})
    body = await _completeness(api_client)
    assert body["score"] == "100.00"
    assert body["missing"] == []


async def test_short_product_description_and_no_price_do_not_count(api_client: AsyncClient) -> None:
    await _create_exporter(api_client)
    body = product_body(
        price_min=None, price_max=None, description_vi="y" * 29, description_en=None
    )
    await api_client.post("/api/exporter/products", json=body)
    missing = _missing(await _completeness(api_client))
    assert "product_description" in missing
    assert "product_price" in missing
    assert "product_hs" not in missing


@pytest.mark.usefixtures("evidence_row_disabled")
async def test_only_active_products_count_and_deleting_lowers_the_score(
    api_client: AsyncClient,
) -> None:
    await _create_exporter(api_client)
    pid = (await api_client.post("/api/exporter/products", json=product_body())).json()["id"]
    with_product = (await _completeness(api_client))["score"]
    assert with_product != "55.00"
    await api_client.patch(f"/api/exporter/products/{pid}", json={"is_active": False})
    assert (await _completeness(api_client))["score"] == "55.00"
    assert await _stored_score(api_client) == "55.00"
    await api_client.patch(f"/api/exporter/products/{pid}", json={"is_active": True})
    assert (await _completeness(api_client))["score"] == with_product
    await api_client.delete(f"/api/exporter/products/{pid}")
    assert (await _completeness(api_client))["score"] == "55.00"
    assert await _stored_score(api_client) == "55.00"


@pytest.mark.usefixtures("evidence_row_disabled")
async def test_removing_a_field_lowers_the_score(api_client: AsyncClient) -> None:
    await _create_exporter(api_client)
    await api_client.patch("/api/me/company", json={"export_markets": []})
    body = await _completeness(api_client)
    assert "export_markets" in _missing(body)
    assert body["score"] == "48.75"  # (44 − 5) / 80


async def test_business_model_must_be_a_known_value_for_exporters(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    for bad in ("TNHH", "Công ty cổ phần", "x"):
        r = await api_client.post("/api/me/company", json=company_body(business_type=bad))
        assert r.status_code == 422, bad
    assert (
        await api_client.post("/api/me/company", json=company_body(business_type="both"))
    ).status_code == 201
    for good in ("manufacturer", "trader"):
        r = await api_client.patch("/api/me/company", json={"business_type": good})
        assert r.status_code == 200
        assert r.json()["business_type"] == good
    assert (
        await api_client.patch("/api/me/company", json={"business_type": "TNHH"})
    ).status_code == 422


async def test_buyer_business_type_stays_free_text(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    r = await api_client.post("/api/me/company", json=buyer_body(business_type="Nhà nhập khẩu"))
    assert r.status_code == 201


async def test_buyer_full_profile_is_100_and_stored(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    await api_client.post("/api/me/company", json=buyer_body())
    body = await _completeness(api_client)
    assert body["score"] == "100.00"  # 95/95: logo tắt nên không phải là 95%
    assert body["missing"] == []
    assert await _stored_score(api_client) == "100.00"


async def test_buyer_eori_counts_like_vat_and_prefix_must_match_country(
    api_client: AsyncClient,
) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    await api_client.post("/api/me/company", json=buyer_body(vat_number=None))
    assert (await _completeness(api_client))["score"] == "77.89"  # thiếu VAT/EORI: 74/95
    r = await api_client.patch("/api/me/company", json={"eori_number": "DE123456789012345"})
    assert r.status_code == 200
    assert r.json()["eori_number"] == "DE123456789012345"
    assert (await _completeness(api_client))["score"] == "100.00"
    await api_client.patch("/api/me/company", json={"eori_number": "FR123456789012"})
    assert (await _completeness(api_client))["score"] == "77.89"  # sai tiền tố nước
    await api_client.patch("/api/me/company", json={"vat_number": "DE123456789"})
    assert (await _completeness(api_client))["score"] == "100.00"


async def test_buyer_missing_list_is_ordered_by_weight(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    await api_client.post("/api/me/company", json={"legal_name": "B", "country": "DE"})
    body = await _completeness(api_client)
    assert body["score"] == "0.00"
    assert _missing(body) == [
        "sourcing_categories",
        "vat_or_eori",
        "company_size",
        "procurement_estimate",
        "business_type",
        "website",
    ]


async def test_exporter_cannot_send_eori(api_client: AsyncClient) -> None:
    await login_as(api_client, "exporter", "exp@x.vn")
    r = await api_client.post("/api/me/company", json=company_body(eori_number="VN123456789"))
    assert r.status_code == 422
    await api_client.post("/api/me/company", json=company_body())
    r = await api_client.patch("/api/me/company", json={"eori_number": "VN123456789"})
    assert r.status_code == 422


async def test_response_has_no_verification_signal(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Điểm hoàn thiện ≠ xác minh: không lẫn trong cùng phản hồi và không phụ thuộc nhau."""
    await _create_exporter(api_client)
    before = await _completeness(api_client)
    assert set(before) == {"score", "missing"}
    assert all(set(m) == {"field", "group", "weight"} for m in before["missing"])  # type: ignore[attr-defined]
    await db_session.execute(
        text("UPDATE companies SET verification_status = 'verified', verified_at = now()")
    )
    assert await _completeness(api_client) == before


@pytest.mark.usefixtures("evidence_row_disabled")
async def test_weights_are_data_not_code(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_exporter(api_client)
    assert (await _completeness(api_client))["score"] == "55.00"
    await db_session.execute(
        text(
            "UPDATE completeness_weights SET is_enabled = true "
            "WHERE company_type = 'exporter' AND field_key = 'logo'"
        )
    )
    body = await _completeness(api_client)
    assert body["score"] == "51.76"  # 44/85
    assert "logo" in _missing(body)
    await db_session.execute(
        text(
            "UPDATE completeness_weights SET weight = 20 "
            "WHERE company_type = 'exporter' AND field_key = 'tax_id'"
        )
    )
    assert (await _completeness(api_client))["score"] == "56.84"  # (44 + 10) / (85 + 10)
