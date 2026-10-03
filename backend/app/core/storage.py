"""Storage S3-compatible. Bucket private; chỉ phát file qua pre-signed URL ngắn hạn."""

from functools import lru_cache
from typing import Any, Protocol

import boto3
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings

PRESIGN_SECONDS = 600  # 10 phút, trong khoảng 5–15 phút của kế hoạch


class Storage(Protocol):
    async def ping(self) -> None: ...
    async def presign_get(self, key: str) -> str: ...
    async def presign_put(self, key: str, content_type: str) -> str: ...
    async def put(self, key: str, data: bytes, content_type: str) -> None: ...
    async def get(self, key: str) -> bytes: ...


class S3Storage:
    def __init__(self) -> None:
        s = get_settings()
        self._bucket = s.s3_bucket
        self._client: Any = boto3.client(
            "s3",
            endpoint_url=s.s3_endpoint_url,
            region_name=s.s3_region,
            aws_access_key_id=s.s3_access_key,
            aws_secret_access_key=s.s3_secret_key,
        )

    async def ping(self) -> None:
        await run_in_threadpool(self._client.head_bucket, Bucket=self._bucket)

    async def presign_get(self, key: str) -> str:
        url: str = await run_in_threadpool(
            self._client.generate_presigned_url,
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=PRESIGN_SECONDS,
        )
        return url

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        """Ghi file từ phía server (PDF hệ thống sinh); file người dùng tải lên dùng presign_put."""
        await run_in_threadpool(
            self._client.put_object,
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    async def get(self, key: str) -> bytes:
        """Đọc file từ phía server (job AI đọc chứng nhận, U24) — không phát cho trình duyệt."""
        response = await run_in_threadpool(self._client.get_object, Bucket=self._bucket, Key=key)
        body: bytes = await run_in_threadpool(response["Body"].read)
        return body

    async def presign_put(self, key: str, content_type: str) -> str:
        url: str = await run_in_threadpool(
            self._client.generate_presigned_url,
            "put_object",
            Params={"Bucket": self._bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=PRESIGN_SECONDS,
        )
        return url


@lru_cache
def get_storage() -> Storage:
    return S3Storage()
