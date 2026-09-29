import uuid

import pytest
from httpx import AsyncClient

from app.modules.companies.tests.helpers import company_body, login_as, product_body

pytestmark = pytest.mark.usefixtures("hs_seeded")


async def _exporter(client: AsyncClient, email: str = "exp@x.vn") -> str:
    await login_as(client, "exporter", email)
    return str((await client.post("/api/me/company", json=company_body())).json()["id"])


async def _presign(client: AsyncClient, content_type: str = "image/png") -> dict[str, str]:
    r = await client.post(
        "/api/uploads/presign", json={"purpose": "product_image", "content_type": content_type}
    )
    assert r.status_code == 200, r.text
    body: dict[str, str] = r.json()
    return body


async def test_presign_product_image_key_is_scoped_to_my_company(api_client: AsyncClient) -> None:
    company_id = await _exporter(api_client)
    presigned = await _presign(api_client, "image/webp")
    assert presigned["key"].startswith(f"products/{company_id}/")
    assert presigned["key"].endswith(".webp")
    assert presigned["upload_url"].endswith(presigned["key"])


async def test_presign_product_image_rejects_non_image(api_client: AsyncClient) -> None:
    await _exporter(api_client)
    r = await api_client.post(
        "/api/uploads/presign",
        json={"purpose": "product_image", "content_type": "application/pdf"},
    )
    assert r.status_code == 422


async def test_buyer_cannot_presign_product_image(api_client: AsyncClient) -> None:
    await login_as(api_client, "buyer", "buy@x.de")
    r = await api_client.post(
        "/api/uploads/presign", json={"purpose": "product_image", "content_type": "image/png"}
    )
    assert r.status_code == 403


async def test_product_keeps_images_in_order_with_urls(api_client: AsyncClient) -> None:
    await _exporter(api_client)
    keys = [(await _presign(api_client))["key"] for _ in range(3)]
    r = await api_client.post("/api/exporter/products", json=product_body(image_keys=keys))
    assert r.status_code == 201, r.text
    assert [i["key"] for i in r.json()["images"]] == keys
    assert [i["url"] for i in r.json()["images"]] == [f"https://fake/{k}" for k in keys]


async def test_patch_replaces_images_and_omitting_keeps_them(api_client: AsyncClient) -> None:
    await _exporter(api_client)
    a, b = (await _presign(api_client))["key"], (await _presign(api_client))["key"]
    pid = (
        await api_client.post("/api/exporter/products", json=product_body(image_keys=[a]))
    ).json()["id"]
    kept = await api_client.patch(f"/api/exporter/products/{pid}", json={"name": "Đổi tên"})
    assert [i["key"] for i in kept.json()["images"]] == [a]
    replaced = await api_client.patch(f"/api/exporter/products/{pid}", json={"image_keys": [b, a]})
    assert [i["key"] for i in replaced.json()["images"]] == [b, a]
    cleared = await api_client.patch(f"/api/exporter/products/{pid}", json={"image_keys": []})
    assert cleared.json()["images"] == []


@pytest.mark.parametrize(
    "bad_key",
    [
        f"products/{uuid.uuid4()}/x.png",  # công ty khác
        "logos/anything.png",
        "../products/x.png",
        "",
    ],
)
async def test_image_key_of_another_company_is_rejected(
    api_client: AsyncClient, bad_key: str
) -> None:
    await _exporter(api_client)
    r = await api_client.post("/api/exporter/products", json=product_body(image_keys=[bad_key]))
    assert r.status_code == 422, r.text


async def test_too_many_or_duplicate_images_rejected(api_client: AsyncClient) -> None:
    company_id = await _exporter(api_client)
    keys = [f"products/{company_id}/{i}.png" for i in range(11)]
    r = await api_client.post("/api/exporter/products", json=product_body(image_keys=keys))
    assert r.status_code == 422
    dup = [f"products/{company_id}/same.png"] * 2
    r = await api_client.post("/api/exporter/products", json=product_body(image_keys=dup))
    assert r.status_code == 422
