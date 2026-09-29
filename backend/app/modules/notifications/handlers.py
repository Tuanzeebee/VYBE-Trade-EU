"""Phản ứng với event: xếp thư vào hàng đợi job (không gửi trực tiếp trong request)."""

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from app.core.events import subscribe
from app.modules.verification.events import VerificationStatusChanged

log = logging.getLogger(__name__)

Enqueuer = Callable[[dict[str, Any]], Awaitable[None]]

# Quyết định có gửi email cho doanh nghiệp (nộp yêu cầu và đồng bộ mức không cần email).
NOTIFY_DECISIONS = ("approve", "reject", "request_info", "expire")


async def _defer_send_email(payload: dict[str, Any]) -> None:
    """Đẩy job send_email vào Procrastinate. Lỗi hàng đợi không được làm hỏng request gốc."""
    try:
        from app.jobs.send_email import send_email

        await send_email.defer_async(payload=payload)
    except Exception:
        log.exception("Không xếp được job gửi email %s", payload.get("type"))


_enqueue: Enqueuer = _defer_send_email


def set_enqueuer(enqueuer: Enqueuer) -> Enqueuer:
    """Thay bộ xếp hàng (test dùng bản ghi trong bộ nhớ). Trả về bộ cũ để khôi phục."""
    global _enqueue
    previous, _enqueue = _enqueue, enqueuer
    return previous


async def on_verification_status_changed(event: VerificationStatusChanged) -> None:
    if event.decision not in NOTIFY_DECISIONS:
        return
    await _enqueue(
        {
            "type": "verification_status",
            "company_id": str(event.company_id),
            "context": {"outcome": event.decision, "reason": event.reason},
        }
    )


def register() -> None:
    subscribe(VerificationStatusChanged, on_verification_status_changed)
