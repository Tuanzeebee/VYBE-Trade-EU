"""Dịch máy (AGENTS.md §5.5): nghiệp vụ chỉ gọi interface TranslationService.

Nhà cung cấp thật (DeepL) là quyết định Q5, chưa chốt. Cho tới lúc đó bản mặc định là
UnavailableTranslation: luôn báo không dịch được, tin nhắn vẫn gửi bằng bản gốc (F3: lỗi dịch
không được chặn gửi) và người nhận thấy đúng là chưa có bản dịch — không dịch giả.
Test tiêm FakeTranslation.
"""

from collections.abc import Callable
from typing import Protocol


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


def get_translation_service() -> TranslationService:
    """Nhà cung cấp thật sẽ chọn theo cấu hình khi Q5 chốt."""
    return UnavailableTranslation()
