"""Mô hình hội thoại LLM (AGENTS.md §5.5): nghiệp vụ chỉ gọi interface ChatModel.

Nhà cung cấp thật là quyết định Q5 (chưa chốt). Mặc định FakeChatModel xác định; Ollama cục bộ
(CHAT_BACKEND=ollama) để thử miễn phí. FakeChatModel: trích dẫn đoạn đầu
tiên trong prompt. Test tiêm bản giả có kịch bản (bịa trích dẫn, làm theo chỉ dẫn chèn, lỗi...).
"""

import base64
import json
import re
from collections.abc import Callable
from typing import Protocol

import httpx

from app.core.config import get_settings


class ChatModel(Protocol):
    name: str

    async def complete(self, system: str, user: str) -> str: ...


_PASSAGE = re.compile(r'<passage id="([0-9a-f-]{36})"[^>]*>\n(.*?)\n</passage>', re.DOTALL)


class FakeChatModel:
    """Trả lời xác định. `responder(system, user)` thay hành vi mặc định; ghi lại mọi lời gọi."""

    name = "fake-chat"

    def __init__(self, responder: Callable[[str, str], str] | None = None) -> None:
        self.responder = responder
        self.calls: list[tuple[str, str]] = []

    async def complete(self, system: str, user: str) -> str:
        self.calls.append((system, user))
        if self.responder is not None:
            return self.responder(system, user)
        passages = _PASSAGE.findall(user)
        if not passages:
            return json.dumps({"answer": "", "citations": [], "self_assessment": "insufficient"})
        chunk_id, text = passages[0]
        return json.dumps(
            {
                "answer": f"Theo văn bản: {text[:200]}",
                "citations": [chunk_id],
                "self_assessment": "high",
            },
            ensure_ascii=False,
        )


class OllamaChatModel:
    """LLM chạy cục bộ qua Ollama. Ép đầu ra JSON (format=json) để khớp định dạng trợ lý cần."""

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float = 120.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.name = f"ollama:{model}"
        self._model = model
        self._client = client or httpx.AsyncClient(base_url=base_url, timeout=timeout)

    async def complete(self, system: str, user: str) -> str:
        response = await self._client.post(
            "/api/chat",
            json={
                "model": self._model,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
        )
        response.raise_for_status()
        return str(response.json()["message"]["content"])


def get_chat_model() -> ChatModel:
    """Chọn theo CHAT_BACKEND: fake (mặc định) hoặc ollama."""
    settings = get_settings()
    if settings.chat_backend == "ollama":
        return OllamaChatModel(
            settings.ollama_base_url, settings.ollama_chat_model, settings.ollama_timeout_seconds
        )
    if settings.chat_backend != "fake":
        raise ValueError(f"CHAT_BACKEND không hợp lệ: {settings.chat_backend}")
    return FakeChatModel()


class VisionModel(Protocol):
    """Model đọc ảnh (U24: chứng nhận dạng scan). Chỉ có khi cấu hình Ollama vision."""

    name: str

    async def read_image(self, system: str, user: str, image: bytes) -> str: ...


class OllamaVisionModel:
    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float = 120.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.name = f"ollama:{model}"
        self._model = model
        self._client = client or httpx.AsyncClient(base_url=base_url, timeout=timeout)

    async def read_image(self, system: str, user: str, image: bytes) -> str:
        response = await self._client.post(
            "/api/chat",
            json={
                "model": self._model,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0},
                "messages": [
                    {"role": "system", "content": system},
                    {
                        "role": "user",
                        "content": user,
                        "images": [base64.b64encode(image).decode("ascii")],
                    },
                ],
            },
        )
        response.raise_for_status()
        return str(response.json()["message"]["content"])


def get_vision_model() -> VisionModel | None:
    """Model đọc ảnh khi CHAT_BACKEND=ollama và có OLLAMA_VISION_MODEL; không thì None (bỏ qua)."""
    settings = get_settings()
    if settings.chat_backend == "ollama" and settings.ollama_vision_model:
        return OllamaVisionModel(
            settings.ollama_base_url, settings.ollama_vision_model, settings.ollama_timeout_seconds
        )
    return None
