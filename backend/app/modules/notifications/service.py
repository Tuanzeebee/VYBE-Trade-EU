"""Thông báo email (H2): dựng thư song ngữ từ mẫu Jinja, giao qua NotificationChannel.

Mẫu ở templates/{loại}.{vi|en}.{txt|html}.j2; dòng đầu của .txt.j2 là "Subject: …".
Link luôn tuyệt đối (public_base_url + ngôn ngữ người nhận). Nội dung người dùng nhập escape ở HTML.
"""

import logging
import uuid
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.channels import NotificationChannel
from app.core.config import get_settings
from app.modules.auth import service as auth
from app.modules.companies import service as companies

log = logging.getLogger(__name__)

TEMPLATES = Path(__file__).parent / "templates"
LANGUAGES = ("vi", "en")
DEFAULT_LANGUAGE = "vi"

_env = Environment(
    loader=FileSystemLoader(TEMPLATES),
    autoescape=select_autoescape(enabled_extensions=("html.j2",), default=False),
    undefined=StrictUndefined,  # thiếu biến trong context là lỗi, không gửi thư thiếu chữ
    keep_trailing_newline=True,
)


class EmailType(StrEnum):
    message = "message"
    rfq = "rfq"
    verification_status = "verification_status"
    new_match = "new_match"
    expiry_alert = "expiry_alert"


# Trang đích cho từng loại thư (đường dẫn sau /{ngôn ngữ}).
PATHS: dict[EmailType, str] = {
    EmailType.verification_status: "/exporter?tab=verification",
    EmailType.expiry_alert: "/exporter?tab=verification",
    EmailType.rfq: "/exporter?tab=rfq",
    EmailType.message: "/exporter?tab=notifications",
    EmailType.new_match: "/suppliers",
}


@dataclass(frozen=True)
class RenderedEmail:
    subject: str
    text: str
    html: str
    link: str


def absolute_link(language: str, path: str) -> str:
    return f"{get_settings().public_base_url.rstrip('/')}/{language}{path}"


def render_email(email_type: EmailType, language: str, context: dict[str, Any]) -> RenderedEmail:
    lang = language if language in LANGUAGES else DEFAULT_LANGUAGE
    link = absolute_link(lang, PATHS[email_type])
    values = {**context, "link": link}
    raw_text = _env.get_template(f"{email_type.value}.{lang}.txt.j2").render(values)
    first, _, body = raw_text.partition("\n")
    subject = " ".join(first.removeprefix("Subject:").split())  # một dòng: chặn chèn header
    html = _env.get_template(f"{email_type.value}.{lang}.html.j2").render(values)
    return RenderedEmail(subject=subject, text=body.lstrip("\n"), html=html, link=link)


async def deliver(
    session: AsyncSession, payload: dict[str, Any], channel: NotificationChannel
) -> None:
    """Giao một thư theo payload {type, company_id | user_id, context}.

    Người nhận không còn (xóa tài khoản) hoặc công ty không tồn tại thì bỏ qua, không lỗi."""
    email_type = EmailType(payload["type"])
    context = dict(payload.get("context", {}))
    user_id: uuid.UUID | None
    if "company_id" in payload:
        company_id = uuid.UUID(payload["company_id"])
        user_id = await companies.get_owner_user_id(session, company_id)
        summaries = await companies.get_company_summaries(session, [company_id])
        if company_id in summaries:
            context.setdefault("company_name", summaries[company_id].legal_name)
    else:
        user_id = uuid.UUID(payload["user_id"])
    contact = await auth.get_contact(session, user_id) if user_id else None
    if contact is None:
        log.info("Bỏ qua thư %s: không có người nhận", email_type.value)
        return
    mail = render_email(email_type, contact.preferred_language, context)
    await channel.send(contact.email, mail.subject, mail.text, mail.html)
