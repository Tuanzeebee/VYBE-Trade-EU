"""Bản Ollama (chạy cục bộ) của EmbeddingModel và ChatModel: kiểm bằng transport giả, không cần Ollama."""

import json

import httpx
import pytest

from app.core import chat, embeddings
from app.core.chat import FakeChatModel, OllamaChatModel
from app.core.config import Settings
from app.core.embeddings import EMBEDDING_DIM, FakeEmbedding, OllamaEmbedding


def _client(handler: httpx.MockTransport) -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url="http://ollama.test", transport=handler)


async def test_embedding_chia_lo_va_tra_dung_thu_tu() -> None:
    requests: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        requests.append(body)
        assert request.url.path == "/api/embed"
        # vector mỗi văn bản mang chỉ số đầu vào để kiểm thứ tự
        return httpx.Response(
            200,
            json={"embeddings": [[float(t.split("-")[1])] + [0.0] * 3 for t in body["input"]]},
        )

    model = OllamaEmbedding(
        "http://ollama.test", "bge-m3", dimension=4, client=_client(httpx.MockTransport(handler))
    )
    texts = [f"t-{i}" for i in range(OllamaEmbedding.BATCH + 3)]
    vectors = await model.embed(texts)
    assert [v[0] for v in vectors] == [float(i) for i in range(len(texts))]
    assert [len(r["input"]) for r in requests] == [OllamaEmbedding.BATCH, 3]  # type: ignore[arg-type]
    assert requests[0]["model"] == "bge-m3"


async def test_embedding_sai_so_chieu_bi_tu_choi() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"embeddings": [[0.1, 0.2]]})

    model = OllamaEmbedding(
        "http://ollama.test", "m", dimension=4, client=_client(httpx.MockTransport(handler))
    )
    with pytest.raises(ValueError, match="4 chiều"):
        await model.embed(["a"])


async def test_embedding_loi_http_duoc_nem_ra() -> None:
    model = OllamaEmbedding(
        "http://ollama.test",
        "m",
        dimension=4,
        client=_client(httpx.MockTransport(lambda r: httpx.Response(500))),
    )
    with pytest.raises(httpx.HTTPStatusError):
        await model.embed(["a"])


async def test_chat_gui_system_user_ep_json_va_tra_noi_dung() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.update(json.loads(request.content))
        assert request.url.path == "/api/chat"
        return httpx.Response(200, json={"message": {"role": "assistant", "content": '{"a": 1}'}})

    model = OllamaChatModel(
        "http://ollama.test", "qwen2.5:7b", client=_client(httpx.MockTransport(handler))
    )
    assert await model.complete("SYS", "USER") == '{"a": 1}'
    assert model.name == "ollama:qwen2.5:7b"
    assert seen["format"] == "json"
    assert seen["stream"] is False
    assert seen["messages"] == [
        {"role": "system", "content": "SYS"},
        {"role": "user", "content": "USER"},
    ]


def test_mac_dinh_van_la_ban_gia(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(_env_file=None)
    monkeypatch.setattr(chat, "get_settings", lambda: settings)
    monkeypatch.setattr(embeddings, "get_settings", lambda: settings)
    assert isinstance(chat.get_chat_model(), FakeChatModel)
    assert isinstance(embeddings.get_embedding_model(), FakeEmbedding)


def test_chon_ollama_theo_cau_hinh(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(_env_file=None, chat_backend="ollama", embedding_backend="ollama")
    monkeypatch.setattr(chat, "get_settings", lambda: settings)
    monkeypatch.setattr(embeddings, "get_settings", lambda: settings)
    assert isinstance(chat.get_chat_model(), OllamaChatModel)
    model = embeddings.get_embedding_model()
    assert isinstance(model, OllamaEmbedding)
    assert model.dimension == EMBEDDING_DIM


def test_backend_khong_hop_le_bi_tu_choi(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(_env_file=None, chat_backend="x", embedding_backend="y")
    monkeypatch.setattr(chat, "get_settings", lambda: settings)
    monkeypatch.setattr(embeddings, "get_settings", lambda: settings)
    with pytest.raises(ValueError, match="CHAT_BACKEND"):
        chat.get_chat_model()
    with pytest.raises(ValueError, match="EMBEDDING_BACKEND"):
        embeddings.get_embedding_model()
