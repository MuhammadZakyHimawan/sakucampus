from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.core.constants import AUDIT_TELEGRAM_SECRET_INVALID
from app.models import SecurityEvent, TelegramLinkToken
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
            allow_insecure_telegram_webhook=True,
        ),
    )


def _update(
    text: str,
    *,
    telegram_user_id: int = 111_222_333,
    username: str | None = "andi_tg",
    chat_id: int | None = None,
    update_id: int = 1,
) -> dict:
    sender = {"id": telegram_user_id}
    if username is not None:
        sender["username"] = username

    return {
        "update_id": update_id,
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
        json=_update(f"/start {token}", telegram_user_id=999_888_777, update_id=2),
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
        json=_update(f"/start {token}", telegram_user_id=555_444_333, update_id=2),
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
            allow_insecure_telegram_webhook=False,
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


def _capture_replies(monkeypatch) -> list[str]:
    replies: list[str] = []

    async def fake_send_message(chat_id: int, text: str) -> None:
        replies.append(text)

    monkeypatch.setattr(telegram_service, "send_message", fake_send_message)
    return replies


def test_chat_transaction_triggers_rule_engine_notifications(client, auth, monkeypatch):
    replies = _capture_replies(monkeypatch)
    account = auth()
    _link(client, account["headers"])

    settings = client.patch(
        "/api/v1/settings/finance",
        headers=account["headers"],
        json={"minBalance": 2_000_000},
    )
    assert settings.status_code == 200, settings.text

    response = client.post(
        "/api/v1/telegram/webhook",
        json=_update("makan ayam 20rb", update_id=2),
    )
    assert response.status_code == 200, response.text

    notifications = client.get("/api/v1/notifications", headers=account["headers"])
    assert notifications.status_code == 200, notifications.text
    assert any(item["type"] == "balance" for item in notifications.json())
    assert any("Tercatat" in text for text in replies)
    assert any("Saldo mulai menipis" in text for text in replies)


def test_webhook_requires_secret_when_insecure_mode_disabled(client, monkeypatch):
    monkeypatch.setattr(
        telegram_service,
        "get_settings",
        lambda: SimpleNamespace(
            telegram_bot_token=None,
            telegram_bot_username=None,
            telegram_webhook_secret=None,
            telegram_link_token_minutes=15,
            environment="development",
            allow_insecure_telegram_webhook=False,
        ),
    )

    response = client.post("/api/v1/telegram/webhook", json=_update("/help"))

    assert response.status_code == 503


def test_webhook_rejects_malformed_payload(client):
    response = client.post(
        "/api/v1/telegram/webhook",
        json={"update_id": "bukan-angka", "message": {}},
    )

    assert response.status_code == 422


def test_webhook_checks_secret_before_payload(client, monkeypatch):
    monkeypatch.setattr(
        telegram_service,
        "get_settings",
        lambda: SimpleNamespace(
            telegram_bot_token=None,
            telegram_bot_username=None,
            telegram_webhook_secret="rahasia-webhook",
            telegram_link_token_minutes=15,
            environment="production",
            allow_insecure_telegram_webhook=False,
        ),
    )

    malformed = {"update_id": "bukan-angka", "message": {}}
    rejected = client.post("/api/v1/telegram/webhook", json=malformed)
    accepted = client.post(
        "/api/v1/telegram/webhook",
        json=malformed,
        headers={"X-Telegram-Bot-Api-Secret-Token": "rahasia-webhook"},
    )

    assert rejected.status_code == 403
    assert accepted.status_code == 422


def test_chat_message_creates_telegram_transaction(client, auth):
    account = auth()
    _link(client, account["headers"])

    response = client.post(
        "/api/v1/telegram/webhook",
        json=_update("makan ayam 20rb", update_id=2),
    )

    assert response.status_code == 200
    transactions = client.get("/api/v1/transactions", headers=account["headers"]).json()
    assert len(transactions) == 1
    assert transactions[0]["description"] == "makan ayam 20rb"
    assert transactions[0]["amount"] == 20_000
    assert transactions[0]["category"] == "Kebutuhan Primer"
    assert transactions[0]["source"] == "telegram"


def test_chat_message_of_unlinked_user_is_not_recorded(client, auth, monkeypatch):
    replies = _capture_replies(monkeypatch)
    account = auth()

    client.post("/api/v1/telegram/webhook", json=_update("makan ayam 20rb"))

    assert client.get("/api/v1/transactions", headers=account["headers"]).json() == []
    assert len(replies) == 1
    assert "belum terhubung" in replies[0]


def test_unparseable_chat_message_replies_with_format_hint(client, auth, monkeypatch):
    replies = _capture_replies(monkeypatch)
    account = auth()
    _link(client, account["headers"])

    client.post("/api/v1/telegram/webhook", json=_update("halo", update_id=2))

    assert len(replies) == 2
    assert "makan ayam 20rb" in replies[-1]
    assert client.get("/api/v1/transactions", headers=account["headers"]).json() == []


def test_duplicate_webhook_update_does_not_duplicate_transaction(client, auth):
    account = auth()
    _link(client, account["headers"])
    settings = client.patch(
        "/api/v1/settings/finance",
        headers=account["headers"],
        json={"minBalance": 2_000_000},
    )
    assert settings.status_code == 200, settings.text
    update = _update("uang saku 500rb", update_id=2)

    client.post("/api/v1/telegram/webhook", json=update)
    client.post("/api/v1/telegram/webhook", json=update)

    transactions = client.get("/api/v1/transactions", headers=account["headers"]).json()
    assert len(transactions) == 1
    notifications = client.get("/api/v1/notifications", headers=account["headers"]).json()
    assert sum(item["type"] == "balance" for item in notifications) == 1


def test_invalid_webhook_secret_is_rejected_and_audited(client, db_session, monkeypatch):
    monkeypatch.setattr(
        telegram_service,
        "get_settings",
        lambda: SimpleNamespace(
            telegram_bot_token=None,
            telegram_bot_username=None,
            telegram_webhook_secret="rahasia-webhook-yang-panjang",
            telegram_link_token_minutes=15,
            environment="test",
            allow_insecure_telegram_webhook=False,
        ),
    )

    response = client.post(
        "/api/v1/telegram/webhook",
        json=_update("/help"),
        headers={"X-Telegram-Bot-Api-Secret-Token": "salah"},
    )

    assert response.status_code == 403
    event = db_session.scalar(
        select(SecurityEvent).where(SecurityEvent.event_type == AUDIT_TELEGRAM_SECRET_INVALID)
    )
    assert event is not None
    assert event.outcome == "failure"
    assert event.details == {"reason": "invalid_or_missing_secret"}
