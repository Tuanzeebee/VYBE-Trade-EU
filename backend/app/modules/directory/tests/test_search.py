"""E1, E2: danh bạ công khai chỉ trả công ty đã xác minh; tìm và lọc."""

import datetime as dt
import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.companies.tests.helpers import company_body, login_as, product_body

pytestmark = pytest.mark.usefixtures("hs_seeded")

URL = "/api/public/suppliers"


async def make_company(
    client: AsyncClient,
    session: AsyncSession,
    email: str,
    *,
    status: str = "verified",
    products: list[dict[str, Any]] | None = None,
    **company: Any,
) -> dict[str, Any]:
    await login_as(client, "exporter", email)
    created = (await client.post("/api/me/company", json=company_body(**company))).json()
    for body in products if products is not None else [product_body()]:
        assert (await client.post("/api/exporter/products", json=body)).status_code == 201
    await session.execute(
        text("UPDATE companies SET verification_status = :s, verified_at = now() WHERE id = :id"),
        {"s": status, "id": created["id"]},
    )
    await client.post("/api/auth/logout")
    assert isinstance(created, dict)
    return created


async def names(client: AsyncClient, **params: Any) -> list[str]:
    r = await client.get(URL, params=params)
    assert r.status_code == 200, r.text
    return [item["legal_name"] for item in r.json()["items"]]


# ── E1: chỉ công ty đã xác minh ─────────────────────────────────────────────
@pytest.mark.parametrize("status", ["unverified", "pending", "rejected"])
async def test_unverified_pending_rejected_never_listed(
    api_client: AsyncClient, db_session: AsyncSession, status: str
) -> None:
    await make_company(api_client, db_session, "a@x.vn", legal_name="Đã xác minh")
    await make_company(api_client, db_session, "b@x.vn", legal_name="Chưa đạt", status=status)
    assert await names(api_client) == ["Đã xác minh"]
    # Cả tìm kiếm theo tên lẫn theo mã HS cũng không lộ công ty chưa xác minh.
    assert await names(api_client, q="Chưa đạt") == []
    assert await names(api_client, hs="1006") == ["Đã xác minh"]


async def test_directory_excludes_hidden_expired_inactive(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Review Focus 5: bị ẩn, hết hạn, sản phẩm tắt/chưa duyệt đều biến mất khỏi danh bạ."""
    ok = await make_company(api_client, db_session, "ok@x.vn", legal_name="Còn hiệu lực")
    hidden = await make_company(api_client, db_session, "h@x.vn", legal_name="Bị ẩn")
    expired = await make_company(api_client, db_session, "e@x.vn", legal_name="Hết hạn")
    no_product = await make_company(api_client, db_session, "n@x.vn", legal_name="Sản phẩm tắt")
    await db_session.execute(
        text("UPDATE companies SET is_hidden = true WHERE id = :id"), {"id": hidden["id"]}
    )
    await db_session.execute(
        text("UPDATE companies SET expires_at = now() - interval '1 day' WHERE id = :id"),
        {"id": expired["id"]},
    )
    await db_session.execute(
        text("UPDATE products SET is_active = false WHERE company_id = :id"),
        {"id": no_product["id"]},
    )
    assert ok["id"]
    assert await names(api_client, q="Gạo") == ["Còn hiệu lực"]
    assert await names(api_client) == [
        "Còn hiệu lực",
        "Sản phẩm tắt",
    ]  # công ty vẫn hiện, sản phẩm thì không


async def test_buyers_are_not_listed(api_client: AsyncClient, db_session: AsyncSession) -> None:
    from app.modules.companies.tests.helpers import buyer_body

    await login_as(api_client, "buyer", "buyer@x.de")
    created = (await api_client.post("/api/me/company", json=buyer_body())).json()
    await db_session.execute(
        text("UPDATE companies SET verification_status = 'verified' WHERE id = :id"),
        {"id": created["id"]},
    )
    await api_client.post("/api/auth/logout")
    assert await names(api_client) == []


async def test_card_never_leaks_private_fields(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_company(api_client, db_session, "a@x.vn")
    item = (await api_client.get(URL)).json()["items"][0]
    for private in ("id", "tax_id", "contact_email", "address", "owner_user_id", "is_hidden"):
        assert private not in item
    assert set(item) >= {
        "slug",
        "legal_name",
        "country",
        "industry_sector",
        "verification_level",
        "description_vi",
        "description_en",
        "product_names",
        "categories",
    }


# ── E2: tìm và lọc ──────────────────────────────────────────────────────────
async def seed_two(client: AsyncClient, session: AsyncSession) -> None:
    await make_company(
        client,
        session,
        "rice@x.vn",
        legal_name="Nông Sản Lúa Vàng",
        products=[product_body(name="Gạo thơm Jasmine", hs_code="1006.30")],
    )
    await make_company(
        client,
        session,
        "coffee@x.vn",
        legal_name="Cà Phê Tây Nguyên",
        country="VN",
        products=[product_body(name="Cà phê nhân Robusta", hs_code="0901.11")],
    )


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("gạo", ["Nông Sản Lúa Vàng"]),  # tên sản phẩm, có dấu
        ("gao", ["Nông Sản Lúa Vàng"]),  # không dấu
        ("rice", ["Nông Sản Lúa Vàng"]),  # tên HS tiếng Anh
        ("1006", ["Nông Sản Lúa Vàng"]),  # tiền tố mã HS
        ("cà phê", ["Cà Phê Tây Nguyên"]),
        ("lúa vàng", ["Nông Sản Lúa Vàng"]),  # tên công ty
        ("khong-co-gi", []),
    ],
)
async def test_search_matches_company_product_and_hs(
    api_client: AsyncClient, db_session: AsyncSession, q: str, expected: list[str]
) -> None:
    await seed_two(api_client, db_session)
    assert await names(api_client, q=q) == expected


async def test_empty_query_lists_all_verified(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed_two(api_client, db_session)
    assert await names(api_client) == ["Cà Phê Tây Nguyên", "Nông Sản Lúa Vàng"]
    assert await names(api_client, q="   ") == ["Cà Phê Tây Nguyên", "Nông Sản Lúa Vàng"]


async def test_filter_hs_and_country(api_client: AsyncClient, db_session: AsyncSession) -> None:
    await seed_two(api_client, db_session)
    await make_company(
        api_client,
        db_session,
        "th@x.vn",
        legal_name="Rice Thailand",
        country="TH",
        products=[product_body(name="Jasmine rice", hs_code="1006.30")],
    )
    assert await names(api_client, hs="1006.30") == ["Nông Sản Lúa Vàng", "Rice Thailand"]
    assert await names(api_client, hs="100630", country="TH") == ["Rice Thailand"]
    assert await names(api_client, country="VN") == ["Cà Phê Tây Nguyên", "Nông Sản Lúa Vàng"]


async def test_filter_by_product_category(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed_two(api_client, db_session)
    category = (await api_client.get("/api/public/hs-codes", params={"q": "1006.30"})).json()[0][
        "category"
    ]
    assert await names(api_client, category=category, q="gạo") == ["Nông Sản Lúa Vàng"]
    assert await names(api_client, category="khong-ton-tai") == []


async def test_like_wildcards_in_query_are_literal(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed_two(api_client, db_session)
    assert await names(api_client, q="%") == []
    assert await names(api_client, q="_") == []


async def test_pagination(api_client: AsyncClient, db_session: AsyncSession) -> None:
    for i in range(3):
        await make_company(api_client, db_session, f"c{i}@x.vn", legal_name=f"Công ty {i}")
    first = (await api_client.get(URL, params={"page_size": 2})).json()
    assert (first["total"], first["page"], len(first["items"])) == (3, 1, 2)
    second = (await api_client.get(URL, params={"page_size": 2, "page": 2})).json()
    assert [i["legal_name"] for i in second["items"]] == ["Công ty 2"]
    assert (await api_client.get(URL, params={"page": 0})).status_code == 422
    assert (await api_client.get(URL, params={"page_size": 500})).status_code == 422


async def test_search_by_approved_certificate(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    """Chỉ chứng nhận đã duyệt, còn hạn và thuộc loại đã duyệt mới lọc/tìm được."""
    await seed_two(api_client, db_session)
    rows = (
        await db_session.execute(text("SELECT id, legal_name FROM companies ORDER BY legal_name"))
    ).all()
    by_name = {r.legal_name: r.id for r in rows}
    await db_session.execute(
        text(
            'INSERT INTO evidence_types (code, name_vi, name_en, "group", is_active, '
            "reviewed_by, reviewed_at) VALUES ('haccp', 'HACCP', 'HACCP', 'quality', true, "
            ":r, now()), ('eur1_issued', 'EUR.1 đã cấp', 'Issued EUR.1', 'origin', true, :r, now()), "
            "('draft_cert', 'Chứng nhận nháp', 'Draft certificate', 'quality', true, NULL, NULL)"
        ),
        {"r": reviewer_id},
    )
    today = dt.date.today()

    async def evidence(company: str, type_code: str, status: str, expires: dt.date | None) -> None:
        await db_session.execute(
            text(
                "INSERT INTO evidences (company_id, type_code, file_key, issued_at, expires_at, "
                "approval_status) VALUES (:c, :t, 'k', :i, :e, CAST(:s AS evidence_approval_status))"
            ),
            {
                "c": by_name[company],
                "t": type_code,
                "i": today - dt.timedelta(days=30),
                "e": expires,
                "s": status,
            },
        )

    await evidence("Nông Sản Lúa Vàng", "haccp", "approved", today + dt.timedelta(days=90))
    await evidence("Cà Phê Tây Nguyên", "haccp", "pending", None)  # chưa duyệt
    assert await names(api_client, cert="haccp") == ["Nông Sản Lúa Vàng"]
    assert await names(api_client, q="HACCP") == ["Nông Sản Lúa Vàng"]

    await db_session.execute(
        text("UPDATE evidences SET expires_at = :d WHERE type_code = 'haccp'"),
        {"d": today - dt.timedelta(days=1)},
    )
    assert await names(api_client, cert="haccp") == []  # hết hạn thì không còn

    await evidence("Cà Phê Tây Nguyên", "eur1_issued", "approved", None)
    assert await names(api_client, cert="eur1_issued") == []  # nhóm origin không công khai
    await evidence("Cà Phê Tây Nguyên", "draft_cert", "approved", None)
    assert await names(api_client, cert="draft_cert") == []  # loại chưa được luật TM duyệt


async def test_filter_options_list_categories_and_public_certificates(
    api_client: AsyncClient, db_session: AsyncSession, reviewer_id: uuid.UUID
) -> None:
    await db_session.execute(
        text(
            'INSERT INTO evidence_types (code, name_vi, name_en, "group", is_active, '
            "reviewed_by, reviewed_at) VALUES ('haccp', 'HACCP', 'HACCP', 'quality', true, :r, now()), "
            "('eur1_issued', 'EUR.1', 'EUR.1', 'origin', true, :r, now()), "
            "('draft', 'Nháp', 'Draft', 'quality', true, NULL, NULL)"
        ),
        {"r": reviewer_id},
    )
    body = (await api_client.get(f"{URL}/filters")).json()
    assert [c["code"] for c in body["certificates"]] == ["haccp"]
    assert body["categories"] and all(isinstance(c, str) for c in body["categories"])


async def test_search_is_read_only_and_public(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    await seed_two(api_client, db_session)
    assert (await api_client.get(URL)).status_code == 200  # không cần phiên
    assert (await api_client.get(URL, params={"q": "x" * 200})).status_code == 422


@pytest.mark.slow
async def test_search_under_2s_with_500_companies(
    api_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Xong khi E2: tìm dưới 2 giây với 500 công ty (mỗi công ty 2 sản phẩm)."""
    import time

    await db_session.execute(
        text(
            "INSERT INTO users (id, email, password_hash, role, preferred_language, "
            "consent_accepted_at, consent_version, failed_login_count) "
            "SELECT gen_random_uuid(), 'seed' || g || '@x.vn', 'x', 'exporter', 'vi', now(), 'v1', 0 "
            "FROM generate_series(1, 500) g"
        )
    )
    await db_session.execute(
        text(
            "INSERT INTO companies (id, owner_user_id, type, slug, legal_name, country, "
            "verification_status, verified_at) "
            "SELECT gen_random_uuid(), u.id, 'exporter', 'seed-' || row_number() OVER (), "
            "'Công ty Xuất Khẩu Số ' || row_number() OVER (), "
            "(ARRAY['VN','TH','ID'])[1 + (row_number() OVER ())::int % 3], 'verified', now() "
            "FROM users u WHERE u.email LIKE 'seed%@x.vn'"
        )
    )
    await db_session.execute(
        text(
            "INSERT INTO products (id, company_id, hs_code, name) "
            "SELECT gen_random_uuid(), c.id, h.code, 'Sản phẩm ' || h.code || ' ' || c.slug "
            "FROM companies c CROSS JOIN (SELECT code FROM hs_codes ORDER BY code LIMIT 2) h "
            "WHERE c.slug LIKE 'seed-%'"
        )
    )
    await db_session.execute(text("ANALYZE companies"))
    await db_session.execute(text("ANALYZE products"))
    for params in ({}, {"q": "xuất khẩu"}, {"q": "gạo", "country": "VN"}, {"hs": "10"}):
        started = time.perf_counter()
        r = await api_client.get(URL, params=params)
        elapsed = time.perf_counter() - started
        assert r.status_code == 200, r.text
        assert elapsed < 2.0, f"{params}: {elapsed:.2f}s"
    assert (await api_client.get(URL)).json()["total"] == 500
