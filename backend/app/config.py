from enum import StrEnum
from functools import lru_cache
from urllib.parse import urlparse

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: Environment = Environment.DEVELOPMENT
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    telegram_bot_token: str | None = None
    telegram_bot_username: str | None = None
    telegram_webhook_secret: str | None = None
    telegram_link_token_minutes: int = 15
    allow_insecure_telegram_webhook: bool = False

    @field_validator(
        "telegram_bot_token",
        "telegram_bot_username",
        "telegram_webhook_secret",
        mode="before",
    )
    @classmethod
    def blank_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("telegram_bot_username")
    @classmethod
    def normalize_bot_username(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.lstrip("@")
        return normalized or None

    @field_validator("jwt_algorithm")
    @classmethod
    def validate_jwt_algorithm(cls, value: str) -> str:
        normalized = value.upper()

        if normalized not in {"HS256", "HS384", "HS512"}:
            raise ValueError("JWT_ALGORITHM must be HS256, HS384, or HS512")

        return normalized

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

    @field_validator("telegram_link_token_minutes")
    @classmethod
    def validate_link_token_minutes(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("TELEGRAM_LINK_TOKEN_MINUTES must be positive")
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: str) -> str:
        origins = [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]

        if not origins:
            raise ValueError("CORS_ORIGINS must contain at least one origin")

        for origin in origins:
            parsed = urlparse(origin)

            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("CORS_ORIGINS must contain valid URLs")
            if parsed.path not in {"", "/"}:
                raise ValueError("CORS_ORIGINS must not contain paths")

        return ",".join(origins)

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.environment is Environment.PRODUCTION:
            if "CHANGE_ME" in self.jwt_secret.upper():
                raise ValueError("JWT_SECRET must be replaced in production")
            if any(origin.startswith("http://") for origin in self.cors_origin_list):
                raise ValueError("CORS_ORIGINS must use HTTPS in production")
            if self.allow_insecure_telegram_webhook:
                raise ValueError("Insecure Telegram webhook mode is forbidden in production")
            if self.telegram_webhook_secret is None or len(self.telegram_webhook_secret) < 16:
                raise ValueError("TELEGRAM_WEBHOOK_SECRET must be at least 16 characters")

        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()
        ]

    @property
    def cors_origin_set(self) -> set[str]:
        return {origin.lower() for origin in self.cors_origin_list}

    @property
    def allowed_hosts(self) -> list[str]:
        hosts: list[str] = []

        for origin in self.cors_origin_list:
            host = urlparse(origin).hostname

            if host is not None and host not in hosts:
                hosts.append(host)

        if self.environment is Environment.TEST and "testserver" not in hosts:
            hosts.append("testserver")

        return hosts


@lru_cache
def get_settings() -> Settings:
    return Settings()
