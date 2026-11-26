from datetime import date, timedelta
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.core.constants import ACCESS_TOKEN_COOKIE, CSRF_COOKIE
from app.services import telegram_service


def _transaction_payload() -> dict:
    return {
        "description": "Makan ayam geprek",
        "amount": 25000,
        "type": "expense",
        "category": "Kebutuhan Primer",
        "date": date.today().isoformat(),
        "source": "manual",
        "note": "Uji integrasi",
    }


def test_registration_creates_persisted_session(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Andi Pratama",
            "email": "andi@example.com",
            "password": "demo1234",
        },
    )

    assert response.status_code == 201, response.json()
    body = response.json()
    assert body["user"]["email"] == "andi@example.com"
    assert response.cookies.get(ACCESS_TOKEN_COOKIE) is not None
    assert response.cookies.get(CSRF_COOKIE) is not None

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["id"] == body["user"]["id"]


def test_mutation_requires_allowed_origin_and_csrf(client: TestClient, auth) -> None:
    account = auth()
    payload = _transaction_payload()

    bad_origin = client.post(
        "/api/v1/transactions",
        json=payload,
        headers={"Origin": "http://evil.example", "X-CSRF-Token": "wrong"},
    )
    assert bad_origin.status_code == 403

    missing_csrf = client.post(
        "/api/v1/transactions",
        json=payload,
        headers={"Origin": "http://localhost:5173"},
    )
    assert missing_csrf.status_code == 403

    valid = client.post(
        "/api/v1/transactions",
        json=payload,
        headers=account["session_headers"],
    )
    assert valid.status_code == 201, valid.json()
    assert valid.json()["description"] == payload["description"]


def test_finance_flow_persists_in_postgres(client: TestClient, auth) -> None:
    account = auth()
    today = date.today()

    transaction = client.post(
        "/api/v1/transactions",
        json=_transaction_payload(),
        headers=account["session_headers"],
    )
    assert transaction.status_code == 201, transaction.json()

    budget = client.post(
        "/api/v1/budgets",
        json={
            "category": "Kebutuhan Primer",
            "limit": 500000,
            "periodStart": today.isoformat(),
            "periodEnd": (today + timedelta(days=30)).isoformat(),
        },
        headers=account["session_headers"],
    )
    assert budget.status_code == 201, budget.json()

    goal = client.post(
        "/api/v1/goals",
        json={
            "name": "Dana Darurat",
            "targetAmount": 500000,
            "deadline": (today + timedelta(days=30)).isoformat(),
        },
        headers=account["session_headers"],
    )
    assert goal.status_code == 201, goal.json()

    contribution = client.post(
        f"/api/v1/goals/{goal.json()['id']}/contributions",
        json={"amount": 50000},
        headers=account["session_headers"],
    )
    assert contribution.status_code == 200, contribution.json()
    assert contribution.json()["savedAmount"] == 50000

    transactions = client.get("/api/v1/transactions")
    budgets = client.get("/api/v1/budgets")
    goals = client.get("/api/v1/goals")

    assert len(transactions.json()) == 1
    assert len(budgets.json()) == 1
    assert len(goals.json()) == 1


def test_logout_revokes_existing_session(client: TestClient, auth) -> None:
    account = auth()
    bearer = {"Authorization": f"Bearer {account['token']}"}

    before = client.get("/api/v1/auth/me", headers=bearer)
    assert before.status_code == 200

    logout = client.post("/api/v1/auth/logout", headers=account["session_headers"])
    assert logout.status_code == 204

    after = client.get("/api/v1/auth/me", headers=bearer)
    assert after.status_code == 401


def test_telegram_webhook_secret_is_enforced(
    client: TestClient,
    monkeypatch,
) -> None:
    secret = "e2e-webhook-secret-1234"
    monkeypatch.setattr(
        telegram_service,
        "get_settings",
        lambda: SimpleNamespace(
            telegram_bot_token=None,
            telegram_bot_username=None,
            telegram_webhook_secret=secret,
            telegram_link_token_minutes=15,
            allow_insecure_telegram_webhook=False,
            environment="test",
        ),
    )

    rejected = client.post(
        "/api/v1/telegram/webhook",
        json={},
        headers={"X-Telegram-Bot-Api-Secret-Token": "wrong"},
    )
    assert rejected.status_code == 403

    accepted = client.post(
        "/api/v1/telegram/webhook",
        json={},
        headers={"X-Telegram-Bot-Api-Secret-Token": secret},
    )
    assert accepted.status_code == 422
