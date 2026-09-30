from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "dev"
    database_url: str = "postgresql+asyncpg://evfta:evfta@localhost:5432/evfta"

    s3_endpoint_url: str | None = "http://localhost:8333"  # None = AWS thật
    s3_region: str = "eu-central-1"
    s3_bucket: str = "evfta-private"
    s3_access_key: str = "devkey"
    s3_secret_key: str = "devkey"  # noqa: S105 — chỉ mặc định cho S3 dev

    # Phiên đăng nhập (ADR-0002)
    session_days: int = 14
    cookie_secure: bool = True
    consent_version: str = "2026-09-29"
    # Hiệu lực xác minh kể từ ngày duyệt (mặc định 12 tháng, cần PO xác nhận)
    verification_valid_days: int = 365
    # RFQ (F1): giới hạn số RFQ một công ty buyer được gửi trong 24 giờ. Con số do PO chốt —
    # đây là mặc định tạm. U6/ADR-0004: buyer KHÔNG bị chặn sau xác minh; chưa xác minh chỉ có
    # hạn mức thấp hơn (0 = chặn hẳn, chỉ dùng khi PO yêu cầu).
    rfq_daily_limit_verified: int = 5
    rfq_daily_limit_unverified: int = 3
    # U7: số hội thoại trực tiếp MỚI một công ty được mở trong 24 giờ (chống spam; PO chốt con số).
    # Nhắn tiếp trong hội thoại đã có không bị tính.
    direct_conversation_daily_limit: int = 10
    # Email (H2): dev dùng Mailpit; nhà cung cấp thật do Q5 chốt; link thư dựng từ public_base_url
    email_backend: str = "smtp"  # smtp | fake
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    email_from: str = "noreply@evfta.eu"
    public_base_url: str = "http://localhost:3000"
    # Trợ lý AI (Q5 chưa chốt): fake = giả xác định; ollama = chạy cục bộ, miễn phí (thử đầu).
    chat_backend: str = "fake"  # fake | ollama
    embedding_backend: str = "fake"  # fake | ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "qwen2.5:7b"
    ollama_embed_model: str = "bge-m3"  # 1024 chiều, khớp EMBEDDING_DIM
    ollama_timeout_seconds: float = 120.0
    # Dịch máy (U3 mô tả sản phẩm một ngôn ngữ; F3 tin nhắn): unavailable | chat | deepl
    translation_backend: str = "unavailable"
    deepl_api_key: str | None = None
    deepl_api_url: str = "https://api-free.deepl.com"
    # Origin của frontend được gọi API kèm cookie
    cors_origins: list[str] = ["http://localhost:3000"]
    # Dữ liệu tuân thủ minh hoạ (AGENTS.md §6.2 ngoại lệ DEMO): chỉ staging/dev được bật. Khi bật,
    # dòng is_demo chưa duyệt được trả kèm data_status="demo_unreviewed". ENV=prod + bật → từ chối.
    demo_compliance_data: bool = False
    # Điểm tín nhiệm seller (ADR-0004): công khai trên hồ sơ khi bật; tắt thì chỉ owner và admin
    # thấy. Production giữ tắt cho tới khi pháp lý/GDPR duyệt.
    trust_score_public: bool = False

    @model_validator(mode="after")
    def _no_dev_defaults_outside_dev(self) -> "Settings":
        """Ngoài môi trường dev không được chạy với mặc định dev (J8): thiếu cấu hình thì dừng ngay
        thay vì âm thầm dùng khóa và mật khẩu ai cũng biết."""
        if self.env == "dev":
            return self
        problems = []
        if self.s3_secret_key == "devkey" or self.s3_access_key == "devkey":  # noqa: S105
            problems.append("S3_ACCESS_KEY/S3_SECRET_KEY còn là khóa dev")
        if "evfta:evfta@" in self.database_url:
            problems.append("DATABASE_URL còn là mật khẩu dev")
        if not self.cookie_secure:
            problems.append("COOKIE_SECURE phải bật")
        if any(o.startswith("http://") for o in self.cors_origins):
            problems.append("CORS_ORIGINS phải dùng https")
        if self.env == "prod" and self.demo_compliance_data:
            problems.append("DEMO_COMPLIANCE_DATA không được bật ở production (AGENTS.md §6.2)")
        if problems:
            raise ValueError("Cấu hình không an toàn ngoài môi trường dev: " + "; ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
