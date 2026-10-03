"""U3: nhà cung cấp dịch máy chọn theo cấu hình; lỗi nào cũng thành TranslationError (không dịch giả)."""

import json

import httpx
import pytest

from app.core.chat import FakeChatModel
from app.core.config import get_settings
from app.core.translation import (
    ChatTranslation,
    DeepLTranslation,
    TranslationError,
    UnavailableTranslation,
    get_translation_service,
)


async def test_chat_translation_reads_json_answer() -> None:
    model = FakeChatModel(lambda system, user: json.dumps({"translation": "Fresh durian."}))
    assert await ChatTranslation(model).translate("Sầu riêng tươi.", "vi", "en") == "Fresh durian."
    system, user = model.calls[0]
    assert "do not add claims" in system
    assert "Source language: Vietnamese" in user and "Sầu riêng tươi." in user


@pytest.mark.parametrize("answer", ["not json", json.dumps({"translation": ""}), json.dumps({})])
async def test_chat_translation_errors_on_bad_answer(answer: str) -> None:
    model = FakeChatModel(lambda system, user: answer)
    with pytest.raises(TranslationError):
        await ChatTranslation(model).translate("x", "vi", "en")


async def test_deepl_translation_posts_form_and_reads_result() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"translations": [{"text": "Fresh durian."}]})

    client = httpx.AsyncClient(
        base_url="https://deepl.test", transport=httpx.MockTransport(handler)
    )
    result = await DeepLTranslation("k", "https://deepl.test", client).translate("x", "vi", "en")
    assert result == "Fresh durian."
    assert seen[0].headers["Authorization"] == "DeepL-Auth-Key k"
    assert b"target_lang=EN-GB" in seen[0].content


async def test_deepl_http_error_is_translation_error() -> None:
    client = httpx.AsyncClient(
        base_url="https://deepl.test",
        transport=httpx.MockTransport(lambda request: httpx.Response(456)),
    )
    with pytest.raises(TranslationError):
        await DeepLTranslation("k", "https://deepl.test", client).translate("x", "vi", "en")


def test_backend_is_chosen_by_config(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "translation_backend", "unavailable")
    assert isinstance(get_translation_service(), UnavailableTranslation)
    monkeypatch.setattr(settings, "translation_backend", "chat")
    assert isinstance(get_translation_service(), ChatTranslation)
    monkeypatch.setattr(settings, "translation_backend", "deepl")
    monkeypatch.setattr(settings, "deepl_api_key", None)
    assert isinstance(get_translation_service(), UnavailableTranslation)  # thiếu khóa → không dịch
    monkeypatch.setattr(settings, "deepl_api_key", "k")
    assert isinstance(get_translation_service(), DeepLTranslation)
