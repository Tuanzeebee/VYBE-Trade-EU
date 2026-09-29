"""Mô hình hội thoại LLM (AGENTS.md §5.5): nghiệp vụ chỉ gọi interface ChatModel.

Nhà cung cấp thật là quyết định Q5 (chưa chốt). Hiện dùng FakeChatModel xác định: trích dẫn đoạn đầu
tiên trong prompt. Test tiêm bản giả có kịch bản (bịa trích dẫn, làm theo chỉ dẫn chèn, lỗi...).
"""

import json
import re
from collections.abc import Callable
from typing import Protocol


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


def get_chat_model() -> ChatModel:
    """Nhà cung cấp thật sẽ chọn theo cấu hình khi Q5 chốt; hiện chỉ có bản giả."""
    return FakeChatModel()
