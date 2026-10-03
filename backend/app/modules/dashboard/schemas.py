"""Dashboard (G1, G2, G3). Mỗi ô là một cặp {data, empty_hint_key}: chưa có dữ liệu thì `data` rỗng
hoặc None và `empty_hint_key` là khóa hướng dẫn để giao diện hiện lời nhắc thay vì để trống."""

import datetime as dt
import uuid

from pydantic import BaseModel


class MissingItem(BaseModel):
    field: str
    group: str


class CompletenessData(BaseModel):
    score: str
    missing: list[MissingItem]


class CompletenessTile(BaseModel):
    data: CompletenessData | None
    empty_hint_key: str | None = None


class ProfileViewsData(BaseModel):
    this_week: int
    previous_week: int


class ProfileViewerOut(BaseModel):
    """Một buyer đã xác minh (không ẩn danh) đã xem hồ sơ trong khoảng thời gian."""

    legal_name: str
    country: str
    business_type: str | None
    views: int
    last_viewed_at: dt.datetime


class ProfileViewersOut(BaseModel):
    """U9 "ai đã xem hồ sơ": tên chỉ hiện với buyer đã xác minh, không bật ẩn danh; còn lại đếm."""

    days: int
    total_views: int
    guest_views: int  # khách chưa đăng nhập
    anonymous_company_views: int  # công ty chưa xác minh, seller khác, hoặc buyer bật ẩn danh
    viewers: list[ProfileViewerOut]
    # U19: chưa có quyền "danh sách đầy đủ" → chỉ hiện FREE_VIEWERS buyer gần nhất, còn lại đếm.
    full: bool = True
    hidden_viewers: int = 0


class ProfileViewsTile(BaseModel):
    data: ProfileViewsData | None
    empty_hint_key: str | None = None


class RfqBrief(BaseModel):
    id: uuid.UUID
    counterpart_name: str
    product_name: str
    status: str
    created_at: dt.datetime


class RfqTileData(BaseModel):
    counts: dict[str, int]
    total: int
    new_this_week: int
    recent: list[RfqBrief]


class RfqTile(BaseModel):
    data: RfqTileData | None
    empty_hint_key: str | None = None


class VerificationData(BaseModel):
    status: str
    level: str
    expires_at: dt.datetime | None
    days_left: int | None  # đếm ngược tới hạn; None khi chưa có hạn


class VerificationTile(BaseModel):
    data: VerificationData | None
    empty_hint_key: str | None = None


class SavingsData(BaseModel):
    total_eur: str  # chuỗi thập phân, không qua float
    runs: int


class SavingsTile(BaseModel):
    data: SavingsData | None
    empty_hint_key: str | None = None


class QuestionBrief(BaseModel):
    id: uuid.UUID
    question: str
    confidence: str
    created_at: dt.datetime


class CopilotTile(BaseModel):
    data: list[QuestionBrief]
    empty_hint_key: str | None = None


class JourneyStepOut(BaseModel):
    key: str
    track: str  # "product" | "sales"
    done: bool


class JourneyOut(BaseModel):
    next_step: str | None
    steps: list[JourneyStepOut]
    product_done: int
    product_total: int
    sales_done: int
    sales_total: int


class ExporterDashboard(BaseModel):
    completeness: CompletenessTile
    profile_views: ProfileViewsTile
    rfqs: RfqTile
    verification: VerificationTile
    tariff_savings: SavingsTile
    copilot: CopilotTile
    journey: JourneyOut


class SupplierBrief(BaseModel):
    slug: str
    name: str
    country: str
    at: dt.datetime | None  # lúc xem (gần đây) hoặc lúc được xác minh (mới)


class SupplierListTile(BaseModel):
    data: list[SupplierBrief]
    empty_hint_key: str | None = None


class SavedSearchTile(BaseModel):
    """Tìm kiếm đã lưu là P1 (K1); chưa có thì ô hướng dẫn thay vì để trống."""

    data: list[str]
    empty_hint_key: str | None = None


class BuyerDashboard(BaseModel):
    saved_searches: SavedSearchTile
    rfqs_sent: RfqTile
    recently_viewed: SupplierListTile
    new_verified: SupplierListTile


class WeekStat(BaseModel):
    week_start: dt.date
    return_visits: int
    with_new_info: int
    ratio: str | None  # tỷ lệ 0–1 (4 chữ số thập phân); None khi tuần đó chưa có lượt quay lại


class ReturnVisitStats(BaseModel):
    weeks: list[WeekStat]
    overall_ratio: str | None
    target_ratio: str  # mục tiêu của spec §5.8
