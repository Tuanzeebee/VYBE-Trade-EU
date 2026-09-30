"""Kênh gửi thông báo (AGENTS.md §5.5): nghiệp vụ chỉ gọi interface, không gọi nhà cung cấp.

SmtpEmailChannel dùng smtplib chuẩn (dev → Mailpit ở localhost:1025); FakeChannel dùng trong test.
Nhà cung cấp email thật (SES/Resend…) là quyết định Q5 — thay bằng một lớp khác cùng Protocol.
"""

import asyncio
import smtplib
from email.message import EmailMessage
from functools import lru_cache
from typing import Protocol

from app.core.config import get_settings


class NotificationChannel(Protocol):
    async def send(self, to: str, subject: str, text: str, html: str) -> None: ...


def _no_header_breaks(*values: str) -> None:
    """Chặn chèn header qua xuống dòng trong địa chỉ hoặc chủ đề."""
    if any("\r" in v or "\n" in v for v in values):
        raise ValueError("header values cannot contain line breaks")


class SmtpEmailChannel:
    def __init__(self, host: str, port: int, sender: str) -> None:
        self.host, self.port, self.sender = host, port, sender

    def _build(self, to: str, subject: str, text: str, html: str) -> EmailMessage:
        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = to
        message["Subject"] = subject
        message.set_content(text)
        message.add_alternative(html, subtype="html")
        return message

    async def send(self, to: str, subject: str, text: str, html: str) -> None:
        _no_header_breaks(to, subject)
        message = self._build(to, subject, text, html)

        def _send() -> None:
            with smtplib.SMTP(self.host, self.port, timeout=10) as smtp:
                smtp.send_message(message)

        await asyncio.to_thread(_send)  # smtplib chặn luồng nên chạy ở thread riêng


class FakeChannel:
    """Ghi lại thư thay vì gửi (test)."""

    def __init__(self) -> None:
        self.sent: list[tuple[str, str, str, str]] = []

    async def send(self, to: str, subject: str, text: str, html: str) -> None:
        _no_header_breaks(to, subject)
        self.sent.append((to, subject, text, html))


@lru_cache
def get_channel() -> NotificationChannel:
    settings = get_settings()
    if settings.email_backend == "fake":
        return FakeChannel()
    return SmtpEmailChannel(settings.smtp_host, settings.smtp_port, settings.email_from)
