"""GET /api/exporter/evidence-requirements: bằng chứng cần có theo mã HS sản phẩm công ty đã khai
(bước Giấy phép và chứng nhận). Dữ liệu SYNTHETIC; seed 20 mã nạp trong test."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.schemas import HsCodeIn
from app.modules.catalog.service import upsert_hs_codes
from app.modules.companies.tests.helpers import company_body, login_as, product_body
from app.modules.compliance.seed import load_seed
from app.modules.compliance.tests.test_seed_loader import SEED_DIR, VERSION

URL = "/api/exporter/evidence-requirements"
DRAGON = "08109020"


@pytest.fixture
async def seeded(db_session: AsyncSession) -> AsyncSession:
    await load_seed(db_session, SEED_DIR, VERSION)
    return db_session


async def exporter_with(client: AsyncClient, *hs_codes: str) -> None:
    await login_as(client, "exporter", "exp@x.vn")
    assert (await client.post("/api/me/company", json=company_body())).status_code == 201
    for code in hs_codes:
        res = await client.post("/api/exporter/products", json=product_body(hs_code=code))
        assert res.status_code == 201, res.text


async def test_requires_a_session_and_the_exporter_role(api_client: AsyncClient) -> None:
    assert (await api_client.get(URL)).status_code == 401
    await login_as(api_client, "buyer", "buy@x.eu", "en")
    assert (await api_client.get(URL)).status_code == 403


async def test_company_without_products_gets_an_empty_list(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    await exporter_with(api_client)
    out = (await api_client.get(URL)).json()
    assert out["products"] == [] and out["review_state"] == "REVIEWED"
    assert out["disclaimer"] is None


async def test_lists_evidence_for_each_declared_product_code(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    await exporter_with(api_client, DRAGON, "03061792")
    out = (await api_client.get(URL, headers={"Accept-Language": "vi"})).json()
    by_hs = {p["hs_code"]: p for p in out["products"]}
    assert set(by_hs) == {DRAGON, "03061792"}
    dragon = {i["code"]: i for i in by_hs[DRAGON]["items"]}
    assert {"EUR1", "ORIGIN_DECLARATION", "PHYTO_CERT"} <= set(dragon)
    # chưa biết trị giá lô: hai nhánh EUR.1 / tự chứng nhận đều hiện, kèm điều kiện
    assert dragon["EUR1"]["conditions"] == ["CONSIGNMENT_GT_6000"]
    assert dragon["ORIGIN_DECLARATION"]["conditions"] == ["CONSIGNMENT_LE_6000"]
    assert out["eur1_threshold_eur"] == "6000"
    assert out["review_state"] == "UNREVIEWED" and out["disclaimer"].startswith("Lưu ý")
    assert by_hs[DRAGON]["name_vi"]
    blocks = [i["blocks"] for i in by_hs[DRAGON]["items"]]
    order = {"IMPORT": 0, "TARIFF_PREFERENCE": 1, "NONE": 2}
    assert blocks == sorted(blocks, key=order.__getitem__)


async def test_six_digit_product_code_merges_its_eight_digit_children(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    await upsert_hs_codes(
        seeded,
        [
            HsCodeIn(
                code="081090",
                name_vi="Quả khác",
                name_en="Other fruit",
                is_calculator_supported=True,
            )
        ],
    )
    await exporter_with(api_client, "081090")
    out = (await api_client.get(URL)).json()
    (product,) = out["products"]
    codes = [i["code"] for i in product["items"]]
    assert "PHYTO_CERT" in codes and len(codes) == len(set(codes))


async def test_does_not_leak_other_companies_products(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    await exporter_with(api_client, DRAGON)
    api_client.cookies.clear()
    await login_as(api_client, "exporter", "other@x.vn")
    assert (
        await api_client.post(
            "/api/me/company",
            json=company_body(tax_id="0314892346", registration_number="0314892346"),
        )
    ).status_code == 201
    assert (await api_client.get(URL)).json()["products"] == []


async def test_hidden_products_are_included_too(
    api_client: AsyncClient, seeded: AsyncSession
) -> None:
    """Sản phẩm chưa hiển thị công khai (is_active = false) vẫn là sản phẩm người bán đã khai: giấy tờ
    cần chuẩn bị phải hiện cho nó."""
    await login_as(api_client, "exporter", "exp@x.vn")
    assert (await api_client.post("/api/me/company", json=company_body())).status_code == 201
    res = await api_client.post(
        "/api/exporter/products", json=product_body(hs_code=DRAGON, is_active=False)
    )
    assert res.status_code == 201 and res.json()["is_active"] is False
    (product,) = (await api_client.get(URL)).json()["products"]
    assert product["hs_code"] == DRAGON and len(product["items"]) > 0
