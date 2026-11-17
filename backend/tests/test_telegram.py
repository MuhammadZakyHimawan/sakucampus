from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.models import TelegramLinkToken
from app.services import telegram_service


@pytest.fixture(autouse=True)
def telegram_settings(monkeypatch):
    monkeypatch.setattr(
        telegram_service,
        "get_settings",
        lambda: SimpleNamespace(
            telegram_bot_token=None,
            telegram_bot_username=None,
            telegram_webhook_secret=None,
            telegram_link_token_minutes=15,
            environment="test",
        ),
    )


def _update(
    text: str,
    *,
    telegram_user_id: int = 111_222_333,
    username: str | None = "andi_tg",
    chat_id: int | None = None,
) -> dict:
    sender = {"id": telegram_user_id}
    if username is not None:
        sender["username"] = username

    return {
        "update_id": 1,
        "message": {
            "message_id": 10,
            "text": text,
            "chat": {"id": chat_id if chat_id is not None else telegram_user_id},
            "from": sender,
        },
    }


def _link(client, headers: dict, *, telegram_user_id: int = 111_222_333) -> None:
    token_response = client.post("/api/v1/telegram/link-token", headers=headers)
    assert token_response.status_code == 201
    token = token_response.json()["token"]

    webhook_response = client.post(
        "/api/v1/telegram/webhook",
        json=_update(f"/start {token}", telegram_user_id=telegram_user_id),
    )
    assert webhook_response.status_code == 200
    assert webhook_response.json() == {"ok": True}


def test_telegram_status_defaults_to_disconnected(client, auth):
    account = auth()

    response = client.get("/api/v1/telegram/status", headers=account["headers"])

    assert response.status_code == 200
    assert response.json() == {
        "connected": False,
        "username": None,
        "linkedAt": None,
        "botUsername": None,
        "simulated": True,
    }


def test_create_link_token_stores_only_the_hash(client, auth, db_session):
    account = auth()

    response = client.post("/api/v1/telegram/link-token", headers=account["headers"])

    assert response.status_code == 201
    body = response.json()
    assert len(body["token"]) >= 32
    assert body["deepLink"] is None
    assert body["simulated"] is True

    token = db_session.scalar(select(TelegramLinkToken))
    assert token is not None
    assert token.token_hash != body["token"]
    assert len(token.token_hash) == 64


def test_link_token_builds_deep_link_when_bot_is_configured(client, auth, monkeypatch):
    monkeypatch.setattr(
        telegram_service,
        "get_settings",
        lambda: SimpleNamespace(
            telegram_bot_token=None,
            telegram_bot_username="sakucampus_bot",
            telegram_webhook_secret=None,
            telegram_link_token_minutes=15,
            environment="test",
        ),
    )
    account = auth()

    response = client.post("/api/v1/telegram/link-token", headers=account["headers"])

    assert response.status_code == 201
    body = response.json()
    assert body["deepLink"] == f"https://t.me/sakucampus_bot?start={body['token']}"
    assert body["botUsername"] == "sakucampus_bot"


def test_webhook_links_account_with_one_time_token(client, auth):
    account = auth()
    token = client.post(
        "/api/v1/telegram/link-token",
        headers=account["headers"],
    ).json()["token"]

    response = client.post(
        "/api/v1/telegram/webhook",
        json=_update(f"/start {token}"),
    )

    assert response.status_code == 200
    status = client.get("/api/v1/telegram/status", headers=account["headers"]).json()
    assert status["connected"] is True
    assert status["username"] == "@andi_tg"
    assert status["linkedAt"] is not None


def test_link_token_cannot_be_reused_by_another_user(client, auth):
    first = auth("andi@example.com")
    second = auth("budi@example.com")
    token = client.post(
        "/api/v1/telegram/link-token",
        headers=first["headers"],
    ).json()["token"]

    client.post("/api/v1/telegram/webhook", json=_update(f"/start {token}"))
    client.post(
        "/api/v1/telegram/webhook",
        json=_update(f"/start {token}", telegram_user_id=999_888_777),
    )

    second_status = client.get("/api/v1/telegram/status", headers=second["headers"]).json()
    assert second_status["connected"] is False


def test_expired_link_token_is_rejected(client, auth, db_session):
    account = auth()
    token = client.post(
        "/api/v1/telegram/link-token",
        headers=account["headers"],
    ).json()["token"]
    stored = db_session.scalar(select(TelegramLinkToken))
    assert stored is not None
    stored.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db_session.commit()

    client.post("/api/v1/telegram/webhook", json=_update(f"/start {token}"))

    status = client.get("/api/v1/telegram/status", headers=account["headers"]).json()
    assert status["connected"] is False


def test_telegram_cannot_be_linked_to_two_users(client, auth):
    first = auth("andi@example.com")
    second = auth("budi@example.com")
    _link(client, first["headers"], telegram_user_id=555_444_333)

    token = client.post(
        "/api/v1/telegram/link-token",
        headers=second["headers"],
    ).json()["token"]
    client.post(
        "/api/v1/telegram/webhook",
        json=_update(f"/start {token}", telegram_user_id=555_444_333),
    )

    assert (
        client.get("/api/v1/telegram/status", headers=first["headers"]).json()["connected"] is True
    )
    assert (
        client.get("/api/v1/telegram/status", headers=second["headers"]).json()["connected"]
        is False
    )


def test_unlink_removes_telegram_account(client, auth):
    account = auth()
    _link(client, account["headers"])

    response = client.delete("/api/v1/telegram/unlink", headers=account["headers"])

    assert response.status_code == 200
    assert response.json()["connected"] is False
    assert response.json()["username"] is None


def test_webhook_requires_configured_secret(client, monkeypatch):
    monkeypatch.setattr(
        telegram_service,
        "get_settings",
        lambda: SimpleNamespace(
            telegram_bot_token=None,
            telegram_bot_username=None,
            telegram_webhook_secret="rahasia-webhook",
            telegram_link_token_minutes=15,
            environment="production",
        ),
    )

    rejected = client.post("/api/v1/telegram/webhook", json=_update("/help"))
    accepted = client.post(
        "/api/v1/telegram/webhook",
        json=_update("/help"),
        headers={"X-Telegram-Bot-Api-Secret-Token": "rahasia-webhook"},
    )

    assert rejected.status_code == 403
    assert accepted.status_code == 200


def test_webhook_requires_secret_outside_development(client, monkeypatch):
    monkeypatch.setattr(
        telegram_service,
        "get_settings",
        lambda: SimpleNamespace(
            telegram_bot_token=None,
            telegram_bot_username=None,
            telegram_webhook_secret=None,
            telegram_link_token_minutes=15,
            environment="production",
        ),
    )

    response = client.post("/api/v1/telegram/webhook", json=_update("/help"))

    assert response.status_code == 503
