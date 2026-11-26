from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

TelegramMode = Literal["polling", "webhook", "disabled"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: str = "development"
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    telegram_bot_token: str | None = None
    telegram_bot_username: str | None = None
    telegram_mode: TelegramMode = "disabled"
    telegram_webhook_secret: str | None = None
    telegram_webhook_url: str | None = None

    nlp_model_path: str = "ml/artifacts/category_classifier.joblib"

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        url = make_url(value)
        if url.drivername in {"postgres", "postgresql"}:
            url = url.set(drivername="postgresql+psycopg2")
        if (
            url.drivername.startswith("postgresql")
            and url.host
            and (url.host.endswith(".supabase.com") or url.host.endswith(".supabase.co"))
            and "sslmode" not in url.query
        ):
            query = dict(url.query)
            query["sslmode"] = "require"
            url = url.set(query=query)
        return url.render_as_string(hide_password=False)

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return value

    @field_validator("access_token_expire_minutes")
    @classmethod
    def validate_token_expiry(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be positive")
        return value

    @field_validator(
        "telegram_bot_token",
        "telegram_bot_username",
        "telegram_webhook_secret",
        "telegram_webhook_url",
        mode="before",
    )
    @classmethod
    def empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("telegram_mode", mode="before")
    @classmethod
    def normalize_telegram_mode(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().lower()
            return normalized or "disabled"
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def effective_telegram_mode(self) -> TelegramMode:
        if not self.telegram_bot_token:
            return "disabled"
        return self.telegram_mode


@lru_cache
def get_settings() -> Settings:
    return Settings()
