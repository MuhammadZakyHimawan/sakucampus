import pytest
from pydantic import ValidationError

from app.config import Environment, Settings

BASE_SETTINGS = {
    "environment": Environment.DEVELOPMENT,
    "database_url": "sqlite+pysqlite:///:memory:",
    "jwt_secret": "test-secret-with-at-least-thirty-two-characters",
}


def build_settings(**overrides):
    return Settings(_env_file=None, **{**BASE_SETTINGS, **overrides})


def test_settings_defaults_are_production_safe():
    settings = build_settings()

    assert settings.environment is Environment.DEVELOPMENT
    assert settings.access_token_expire_minutes == 60
    assert settings.jwt_algorithm == "HS256"
    assert settings.allow_insecure_telegram_webhook is False


def test_cors_helpers_normalize_origins_and_hosts():
    settings = build_settings(cors_origins="https://App.Contoh.Id/, http://localhost:5173/")

    assert settings.cors_origin_list == ["https://App.Contoh.Id", "http://localhost:5173"]
    assert settings.cors_origin_set == {"https://app.contoh.id", "http://localhost:5173"}
    assert settings.allowed_hosts == ["app.contoh.id", "localhost"]


def test_test_environment_allows_testclient_host():
    settings = build_settings(environment=Environment.TEST)

    assert "testserver" in settings.allowed_hosts


def test_telegram_blank_values_become_none_and_username_is_normalized():
    settings = build_settings(telegram_bot_token="  ", telegram_bot_username="@sakucampus_bot")

    assert settings.telegram_bot_token is None
    assert settings.telegram_bot_username == "sakucampus_bot"


@pytest.mark.parametrize(
    "overrides",
    [
        {"jwt_secret": "short"},
        {"jwt_algorithm": "RS256"},
        {"access_token_expire_minutes": 0},
        {"telegram_link_token_minutes": -1},
        {"cors_origins": "not-a-url"},
        {"cors_origins": "https://contoh.id/path"},
    ],
)
def test_invalid_settings_are_rejected(overrides):
    with pytest.raises(ValidationError):
        build_settings(**overrides)


def test_production_requires_safe_values():
    with pytest.raises(ValidationError):
        build_settings(environment="production", jwt_secret="CHANGE_ME-secret-1234567890")

    with pytest.raises(ValidationError):
        build_settings(
            environment="production",
            cors_origins="http://contoh.id",
            telegram_webhook_secret="rahasia-webhook-panjang",
        )

    with pytest.raises(ValidationError):
        build_settings(
            environment="production",
            telegram_webhook_secret="rahasia-webhook-panjang",
            allow_insecure_telegram_webhook=True,
        )

    with pytest.raises(ValidationError):
        build_settings(environment="production", telegram_webhook_secret="pendek")


def test_production_accepts_https_and_webhook_secret():
    settings = build_settings(
        environment="production",
        cors_origins="https://sakucampus.id",
        telegram_webhook_secret="rahasia-webhook-panjang",
    )

    assert settings.environment is Environment.PRODUCTION
    assert settings.cors_origin_list == ["https://sakucampus.id"]
