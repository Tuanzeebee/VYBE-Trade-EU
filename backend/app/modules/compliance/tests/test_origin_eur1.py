"""Máy tính xuất xứ Chương 3/7/8 → bản nháp EUR.1 (C5): chỉ sinh khi RoO = pass và là lần chạy của
chính công ty (AGENTS.md §6.6). Dữ liệu SYNTHETIC; seed 20 mã nạp trong test."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compliance.seed import load_seed
from app.modules.compliance.tests import test_documents_api as docs
from app.modules.compliance.tests.test_seed_loader import SEED_DIR, VERSION

# Fixture dùng chung với test_documents_api (đăng ký theo tên trong module này).
exporter = docs.exporter
queued_jobs = docs.queued_jobs
URL = docs.URL
body = docs.body

SHRIMP = "03061792"


async def origin(client: AsyncClient, **answers: object) -> dict[str, object]:
    res = await client.post(
        "/api/public/origin",
        json={"hs_code": SHRIMP, "transit_third_country": False, **answers},
    )
    assert res.status_code == 200, res.text
    return res.json()  # type: ignore[no-any-return]


async def test_passed_origin_check_can_request_a_draft(
    api_client: AsyncClient, db_session: AsyncSession, exporter: uuid.UUID, queued_jobs: list[str]
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await origin(api_client, sourcing="FARMED_IN_VN")
    assert out["status"] == "pass"
    res = await api_client.post(URL, json=body(out["check_id"], goods_description="Frozen shrimps"))
    assert res.status_code in (200, 201, 202), res.text
    assert len(queued_jobs) == 1


@pytest.mark.parametrize(
    "answers",
    [
        {"sourcing": "IMPORTED"},  # fail
        {},  # inconclusive: thiếu câu trả lời
    ],
)
async def test_failed_or_inconclusive_origin_check_cannot_request_a_draft(
    api_client: AsyncClient,
    db_session: AsyncSession,
    exporter: uuid.UUID,
    queued_jobs: list[str],
    answers: dict[str, object],
) -> None:
    await load_seed(db_session, SEED_DIR, VERSION)
    out = await origin(api_client, **answers)
    assert out["status"] in ("fail", "inconclusive")
    res = await api_client.post(URL, json=body(out["check_id"]))
    assert res.status_code == 409 or res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "roo_not_passed"
    assert queued_jobs == []
