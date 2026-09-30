"""J8: ngoài môi trường dev không được chạy với mặc định dev."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings

SAFE = {
    "env": "prod",
    "database_url": "postgresql+asyncpg://app:s3cret-x@db.eu:5432/evfta",
    "s3_access_key": "AKIA-real",
    "s3_secret_key": "real-secret",
    "cookie_secure": True,
    "cors_origins": ["https://evfta.eu"],
}


def make(**over: object) -> Settings:
    return Settings(_env_file=None, **{**SAFE, **over})  # type: ignore[arg-type]


def test_dev_may_use_the_dev_defaults() -> None:
    assert Settings(_env_file=None, env="dev").s3_secret_key == "devkey"  # noqa: S105


def test_a_fully_configured_production_starts() -> None:
    assert make().env == "prod"


@pytest.mark.parametrize(
    ("over", "needle"),
    [
        ({"s3_secret_key": "devkey"}, "S3"),
        ({"s3_access_key": "devkey"}, "S3"),
        ({"database_url": "postgresql+asyncpg://evfta:evfta@db:5432/evfta"}, "DATABASE_URL"),
        ({"cookie_secure": False}, "COOKIE_SECURE"),
        ({"cors_origins": ["http://evfta.eu"]}, "CORS_ORIGINS"),
    ],
)
def test_each_unsafe_default_stops_startup(over: dict[str, object], needle: str) -> None:
    with pytest.raises(ValidationError, match=needle):
        make(**over)


def test_every_problem_is_reported_at_once() -> None:
    with pytest.raises(ValidationError) as info:
        Settings(_env_file=None, env="staging")
    text = str(info.value)
    assert all(word in text for word in ("S3", "DATABASE_URL"))
