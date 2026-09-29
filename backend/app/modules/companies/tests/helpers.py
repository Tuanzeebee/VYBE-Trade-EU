from typing import Any

from httpx import AsyncClient

PASSWORD = "mat-khau-du-dai"  # noqa: S105 — mật khẩu giả cho test


async def login_as(client: AsyncClient, role: str, email: str) -> None:
    """Đăng ký (lần đầu) hoặc đăng nhập; cookie phiên nằm trong client."""
    r = await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": PASSWORD,
            "role": role,
            "preferred_language": "vi",
            "accept_terms": True,
        },
    )
    if r.status_code == 409:
        r = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code in (200, 201), r.text


def company_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "legal_name": "Công ty TNHH Nông Sản Việt",
        "registration_number": "0314892345",
        "tax_id": "0314892345",
        "business_type": "TNHH",
        "country": "VN",
        "industry_sector": "agriculture",
        "founded_year": 2018,
        "address": "720A Điện Biên Phủ, TP. Hồ Chí Minh",
        "website": "https://vietagri-export.vn",
        "contact_email": "contact@vietagri-export.vn",
        "description_vi": "Gạo và cà phê xuất khẩu.",
        "description_en": "Exporter of rice and coffee.",
        "export_markets": ["EU", "JP"],
        "languages_spoken": ["vi", "en"],
    }
    body.update(overrides)
    return body


def buyer_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "legal_name": "Global Foods Trading GmbH",
        "country": "DE",
        "industry_sector": "food_beverage",
        "business_type": "Importer",
        "website": "https://globalfoods.example.de",
        "contact_email": "sourcing@globalfoods.example.de",
        "vat_number": "DE123456789",
        "company_size": "51_200",
        "procurement_estimate": "500k_2m",
        "sourcing_categories": ["agriculture", "spices"],
    }
    body.update(overrides)
    return body
