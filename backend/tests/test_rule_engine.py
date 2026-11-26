from datetime import date
from uuid import UUID

from fastapi.testclient import TestClient

from app.core.security import create_access_token


def _register(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Andi Pratama",
            "email": "andi@example.com",
            "password": "demo1234",
        },
    )
    assert response.status_code == 201, response.text
    token, _ = create_access_token(UUID(response.json()["user"]["id"]))
    client.cookies.clear()
    return {"Authorization": f"Bearer {token}"}


def _expense(category: str, amount: int, day: int) -> dict:
    return {
        "description": f"Pengeluaran {day}",
        "amount": amount,
        "type": "expense",
        "category": category,
        "date": date.today().replace(day=day).isoformat(),
        "source": "manual",
    }


def test_rule_engine_creates_deduplicated_notifications(client: TestClient) -> None:
    headers = _register(client)
    today = date.today()

    settings_response = client.patch(
        "/api/v1/settings/finance",
        headers=headers,
        json={"minBalance": 2_000_000},
    )
    assert settings_response.status_code == 200, settings_response.text

    budget_response = client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category": "Gaya Hidup",
            "limit": 100_000,
            "periodStart": today.replace(day=1).isoformat(),
            "periodEnd": today.isoformat(),
        },
    )
    assert budget_response.status_code == 201, budget_response.text

    first = client.post(
        "/api/v1/transactions",
        headers=headers,
        json=_expense("Gaya Hidup", 90_000, min(today.day, 2)),
    )
    assert first.status_code == 201, first.text

    notifications = client.get("/api/v1/notifications", headers=headers)
    assert notifications.status_code == 200, notifications.text
    types = {item["type"] for item in notifications.json()}
    assert {"budget", "balance"}.issubset(types)

    second = client.post(
        "/api/v1/transactions",
        headers=headers,
        json=_expense("Gaya Hidup", 10_000, min(today.day, 3)),
    )
    assert second.status_code == 201, second.text

    notifications = client.get("/api/v1/notifications", headers=headers)
    assert notifications.status_code == 200, notifications.text
    items = notifications.json()
    assert len(items) == 3
    assert sum(item["type"] == "balance" for item in items) == 1
    assert {item["title"] for item in items if item["type"] == "budget"} == {
        "Anggaran Gaya Hidup hampir habis",
        "Anggaran Gaya Hidup terlampaui",
    }


def test_rule_engine_tracks_goal_milestones(client: TestClient) -> None:
    headers = _register(client)

    goal_response = client.post(
        "/api/v1/goals",
        headers=headers,
        json={
            "name": "Liburan",
            "targetAmount": 100_000,
            "deadline": date.today().isoformat(),
        },
    )
    assert goal_response.status_code == 201, goal_response.text
    goal_id = goal_response.json()["id"]

    first = client.post(
        f"/api/v1/goals/{goal_id}/contributions",
        headers=headers,
        json={"amount": 80_000, "note": "Setoran pertama"},
    )
    assert first.status_code == 200, first.text

    notifications = client.get("/api/v1/notifications", headers=headers)
    assert notifications.status_code == 200, notifications.text
    goal_notifications = [item for item in notifications.json() if item["type"] == "goal"]
    assert len(goal_notifications) == 1
    assert "80%" in goal_notifications[0]["title"]

    second = client.post(
        f"/api/v1/goals/{goal_id}/contributions",
        headers=headers,
        json={"amount": 10_000, "note": "Setoran kedua"},
    )
    assert second.status_code == 200, second.text

    notifications = client.get("/api/v1/notifications", headers=headers)
    assert notifications.status_code == 200, notifications.text
    goal_notifications = [item for item in notifications.json() if item["type"] == "goal"]
    assert len(goal_notifications) == 1


def test_rule_engine_respects_notification_flags(client: TestClient) -> None:
    headers = _register(client)

    settings_response = client.patch(
        "/api/v1/settings/finance",
        headers=headers,
        json={
            "minBalance": 2_000_000,
            "notifyBudget": False,
            "notifyBalance": False,
            "notifyGoal": False,
        },
    )
    assert settings_response.status_code == 200, settings_response.text

    transaction = client.post(
        "/api/v1/transactions",
        headers=headers,
        json=_expense("Gaya Hidup", 90_000, min(date.today().day, 2)),
    )
    assert transaction.status_code == 201, transaction.text

    notifications = client.get("/api/v1/notifications", headers=headers)
    assert notifications.status_code == 200, notifications.text
    assert notifications.json() == []
