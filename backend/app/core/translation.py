"""Dịch máy (AGENTS.md §5.5): nghiệp vụ chỉ gọi interface TranslationService.

Nhà cung cấp thật (DeepL) là quyết định Q5, chưa chốt. Cho tới lúc đó bản mặc định là
UnavailableTranslation: luôn báo không dịch được, tin nhắn vẫn gửi bằng bản gốc (F3: lỗi dịch
không được chặn gửi) và người nhận thấy đúng là chưa có bản dịch — không dịch giả.
Test tiêm FakeTranslation.
"""

import json
from collections.abc import Callable
from typing import TYPE_CHECKING, Protocol

import httpx

from app.core.config import get_settings

if TYPE_CHECKING:
    from app.core.chat import ChatModel


class TranslationError(Exception):
    """Không dịch được (nhà cung cấp lỗi, chưa cấu hình, quá hạn mức...)."""


class TranslationService(Protocol):
    name: str

    async def translate(self, text: str, source: str, target: str) -> str: ...


class UnavailableTranslation:
    name = "unavailable"

    async def translate(self, text: str, source: str, target: str) -> str:
        raise TranslationError("No translation provider configured")


class FakeTranslation:
    """Dịch xác định cho test: "[en] nội dung". `responder` thay hành vi; ghi lại mọi lời gọi."""

    name = "fake-translation"

    def __init__(self, responder: Callable[[str, str, str], str] | None = None) -> None:
        self.responder = responder
        self.calls: list[tuple[str, str, str]] = []

    async def translate(self, text: str, source: str, target: str) -> str:
        self.calls.append((text, source, target))
        if self.responder is not None:
            return self.responder(text, source, target)
        return f"[{target}] {text}"


_LANG_NAMES = {"vi": "Vietnamese", "en": "English"}
_TRANSLATE_SYSTEM = (
    "You translate B2B product and company descriptions for a Vietnam–international trade "
    "platform. Translate faithfully; do not add claims, certifications, numbers or prices that "
    "are not in the source. Keep product names and codes unchanged. "
    'Reply only with JSON: {"translation": "..."}.'
)


class ChatTranslation:
    """Dịch bằng ChatModel (U3; mặc định Ollama cục bộ). Đầu ra JSON, lỗi → TranslationError."""

    def __init__(self, model: "ChatModel") -> None:
        self._model = model
        self.name = f"chat:{model.name}"

    async def translate(self, text: str, source: str, target: str) -> str:
        lines = [
            f"Source language: {_LANG_NAMES.get(source, source)}",
            f"Target language: {_LANG_NAMES.get(target, target)}",
            "<text>",
            text,
            "</text>",
        ]
        user = "\n".join(lines)
        try:
            raw = await self._model.complete(_TRANSLATE_SYSTEM, user)
            translated = json.loads(raw).get("translation", "")
        except Exception as exc:  # mạng, JSON hỏng, model trả sai định dạng
            raise TranslationError(str(exc)) from exc
        if not isinstance(translated, str) or not translated.strip():
            raise TranslationError("empty translation")
        return translated


class DeepLTranslation:
    """DeepL API qua httpx (AGENTS.md §2: không thêm SDK). Bật khi TRANSLATION_BACKEND=deepl."""

    name = "deepl"

    def __init__(
        self, api_key: str, base_url: str, client: httpx.AsyncClient | None = None
    ) -> None:
        self._client = client or httpx.AsyncClient(base_url=base_url, timeout=20.0)
        self._key = api_key

    async def translate(self, text: str, source: str, target: str) -> str:
        try:
            response = await self._client.post(
                "/v2/translate",
                headers={"Authorization": f"DeepL-Auth-Key {self._key}"},
                data={
                    "text": text,
                    "source_lang": source.upper(),
                    "target_lang": "EN-GB" if target == "en" else target.upper(),
                },
            )
            response.raise_for_status()
            return str(response.json()["translations"][0]["text"])
        except Exception as exc:
            raise TranslationError(str(exc)) from exc


def get_translation_service() -> TranslationService:
    """Chọn theo TRANSLATION_BACKEND: unavailable (mặc định), chat (ChatModel đang cấu hình) hoặc
    deepl (cần DEEPL_API_KEY)."""
    settings = get_settings()
    if settings.translation_backend == "chat":
        from app.core.chat import get_chat_model

        return ChatTranslation(get_chat_model())
    if settings.translation_backend == "deepl":
        if not settings.deepl_api_key:
            return UnavailableTranslation()
        return DeepLTranslation(settings.deepl_api_key, settings.deepl_api_url)
    return UnavailableTranslation()
