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
    # đây là mặc định tạm; buyer chưa xác minh thấp hơn.
    rfq_daily_limit_verified: int = 20
    rfq_daily_limit_unverified: int = 5
    # Email (H2): dev dùng Mailpit; nhà cung cấp thật do Q5 chốt; link thư dựng từ public_base_url
    email_backend: str = "smtp"  # smtp | fake
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    email_from: str = "noreply@evfta.eu"
    public_base_url: str = "http://localhost:3000"
    # Origin của frontend được gọi API kèm cookie
    cors_origins: list[str] = ["http://localhost:3000"]

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
        if problems:
            raise ValueError("Cấu hình không an toàn ngoài môi trường dev: " + "; ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
