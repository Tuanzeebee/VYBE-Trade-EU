import uuid
from dataclasses import dataclass

from app.core.events import Event


@dataclass(frozen=True)
class ProfileViewed(Event):
    """Buyer đã xác minh, không ẩn danh, vừa xem hồ sơ (U9): seller thấy thông báo trong ứng dụng.

    Lượt xem ẩn danh (khách, công ty chưa xác minh, buyer bật ẩn danh) không phát sự kiện này.
    """

    company_id: uuid.UUID
    viewer_company_id: uuid.UUID
    viewer_name: str
    viewer_country: str
