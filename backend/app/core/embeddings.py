"""Mô hình nhúng văn bản thành vector (AGENTS.md §5.5): nghiệp vụ chỉ gọi interface EmbeddingModel.

Nhà cung cấp và số chiều thật là quyết định Q5 (chưa chốt). Hiện dùng FakeEmbedding xác định (băm)
để truy xuất và test chạy được; đổi số chiều cần migration tạo lại cột vector và nạp lại corpus.
"""

import hashlib
import math
import re
import unicodedata
from typing import Protocol

import httpx

from app.core.config import get_settings

EMBEDDING_DIM = 1024  # Q5 chưa chốt: giả định phổ biến của mô hình đa ngữ; đổi ở đây và ở migration


class EmbeddingModel(Protocol):
    dimension: int

    async def embed(self, texts: list[str]) -> list[list[float]]: ...


_WORD = re.compile(r"\w+", re.UNICODE)


def _fold(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower().replace("đ", "d"))
    return "".join(c for c in decomposed if not unicodedata.combining(c))


class FakeEmbedding:
    """Túi từ băm vào `dimension` chiều rồi chuẩn hóa L2. Xác định; chung từ thì gần nhau."""

    def __init__(self, dimension: int = EMBEDDING_DIM) -> None:
        self.dimension = dimension

    def _one(self, text: str) -> list[float]:
        vector = [0.0] * self.dimension
        for word in _WORD.findall(_fold(text)):
            digest = hashlib.md5(word.encode("utf-8"), usedforsecurity=False).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimension
            vector[index] += 1.0
        norm = math.sqrt(sum(x * x for x in vector))
        if norm == 0:
            vector[0] = 1.0  # văn bản không có từ: vector cố định thay vì chia cho 0
            return vector
        return [x / norm for x in vector]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._one(t) for t in texts]


class OllamaEmbedding:
    """Nhúng bằng Ollama cục bộ (mặc định bge-m3, 1024 chiều, đa ngữ). Dữ liệu không rời máy."""

    BATCH = 16

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float = 120.0,
        dimension: int = EMBEDDING_DIM,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.dimension = dimension
        self._model = model
        self._client = client or httpx.AsyncClient(base_url=base_url, timeout=timeout)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), self.BATCH):
            response = await self._client.post(
                "/api/embed",
                json={"model": self._model, "input": texts[start : start + self.BATCH]},
            )
            response.raise_for_status()
            vectors.extend(response.json()["embeddings"])
        if len(vectors) != len(texts) or any(len(v) != self.dimension for v in vectors):
            raise ValueError(
                f"Ollama model {self._model} không trả vector {self.dimension} chiều; "
                "đổi số chiều cần migration và nạp lại corpus"
            )
        return vectors


def get_embedding_model() -> EmbeddingModel:
    """Chọn theo EMBEDDING_BACKEND: fake (mặc định) hoặc ollama."""
    settings = get_settings()
    if settings.embedding_backend == "ollama":
        return OllamaEmbedding(
            settings.ollama_base_url, settings.ollama_embed_model, settings.ollama_timeout_seconds
        )
    if settings.embedding_backend != "fake":
        raise ValueError(f"EMBEDDING_BACKEND không hợp lệ: {settings.embedding_backend}")
    return FakeEmbedding()
