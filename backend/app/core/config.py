from functools import lru_cache

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
    # Origin của frontend được gọi API kèm cookie
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
