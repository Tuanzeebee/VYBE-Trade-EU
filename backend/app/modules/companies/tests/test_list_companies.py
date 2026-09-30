import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.schemas import CompanyFilters
from app.modules.companies.service import list_companies, slugify
from app.modules.companies.tests.helpers import company_body, login_as


@pytest.fixture
async def three_companies(api_client: AsyncClient) -> None:
    rows = [
        ("rice@x.vn", company_body(legal_name="Gạo Mekong", export_markets=["EU", "FR"])),
        (
            "fish@x.vn",
            company_body(
                legal_name="Thủy sản Cà Mau",
                industry_sector="seafood",
                export_markets=["DE"],
                languages_spoken=["vi", "ja"],
            ),
        ),
        (
            "tea@x.vn",
            company_body(legal_name="Trà Lâm Đồng", country="LA", export_markets=["EU"]),
        ),
    ]
    for email, body in rows:
        await login_as(api_client, "exporter", email)
        assert (await api_client.post("/api/me/company", json=body)).status_code == 201


async def _names(session: AsyncSession, **filters: str) -> list[str]:
    result = await list_companies(session, CompanyFilters.model_validate(filters))
    return sorted(c.legal_name for c in result)


@pytest.mark.usefixtures("three_companies")
@pytest.mark.parametrize(
    ("filters", "expected"),
    [
        ({}, ["Gạo Mekong", "Thủy sản Cà Mau", "Trà Lâm Đồng"]),
        ({"market": "EU"}, ["Gạo Mekong", "Trà Lâm Đồng"]),
        ({"market": "DE"}, ["Thủy sản Cà Mau"]),
        ({"country": "LA"}, ["Trà Lâm Đồng"]),
        ({"industry": "seafood"}, ["Thủy sản Cà Mau"]),
        ({"language": "ja"}, ["Thủy sản Cà Mau"]),
        ({"country": "VN", "market": "EU"}, ["Gạo Mekong"]),
        ({"market": "KR"}, []),
    ],
)
async def test_list_companies_filters(
    db_session: AsyncSession, filters: dict[str, str], expected: list[str]
) -> None:
    assert await _names(db_session, **filters) == expected


@pytest.mark.parametrize(
    ("name", "slug"),
    [
        ("Công ty TNHH Nông Sản Việt", "cong-ty-tnhh-nong-san-viet"),
        ("  Đồng Tháp  Export!!  ", "dong-thap-export"),
        ("!!!", "company"),
    ],
)
def test_slugify(name: str, slug: str) -> None:
    assert slugify(name) == slug
