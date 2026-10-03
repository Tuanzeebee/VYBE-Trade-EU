"""Job dịch mô tả sản phẩm sang ngôn ngữ còn thiếu (U3). Lỗi dịch → để trống, không dịch giả."""

import uuid

from procrastinate import RetryStrategy

from app.core.db import get_sessionmaker
from app.core.translation import get_translation_service
from app.jobs.app import app
from app.modules.companies.product_service import translate_missing_description


@app.task(name="translate_product", retry=RetryStrategy(max_attempts=3, wait=60))
async def translate_product(product_id: str) -> None:
    async with get_sessionmaker()() as session:
        await translate_missing_description(
            session, get_translation_service(), uuid.UUID(product_id)
        )
