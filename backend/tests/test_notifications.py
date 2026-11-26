import uuid

from app.models import Notification


def _register(client, email: str) -> tuple[uuid.UUID, dict[str, str]]:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Notif User", "email": email, "password": "Password123"},
    )
    assert response.status_code == 201
    body = response.json()
    return uuid.UUID(body["user"]["id"]), {"Authorization": f"Bearer {body['accessToken']}"}


def test_notifications_list_read_and_delete(client, db_session):
    user_id, headers = _register(client, "notifa@example.com")

    n1 = Notification(
        user_id=user_id,
        type="budget",
        severity="warning",
        rule_code="BUDGET_WARNING",
        title="Anggaran mendekati batas",
        message="Anggaran Gaya Hidup sudah 80%.",
        link="/budgets",
        is_read=False,
    )
    n2 = Notification(
        user_id=user_id,
        type="balance",
        severity="critical",
        rule_code="LOW_BALANCE",
        title="Saldo rendah",
        message="Saldo berada di bawah batas minimum.",
        link="/dashboard",
        is_read=False,
    )
    db_session.add_all([n1, n2])
    db_session.commit()

    listed = client.get("/api/v1/notifications", headers=headers)
    assert listed.status_code == 200
    items = listed.json()
    assert len(items) == 2
    assert all(item["read"] is False for item in items)
    assert {"warning", "critical"} == {item["severity"] for item in items}
    assert all("date" in item for item in items)

    marked = client.patch(f"/api/v1/notifications/{n1.id}/read", headers=headers)
    assert marked.status_code == 200
    assert marked.json()["read"] is True

    unread = client.get("/api/v1/notifications", headers=headers, params={"unread_only": True})
    assert unread.status_code == 200
    assert len(unread.json()) == 1
    assert unread.json()[0]["id"] == str(n2.id)

    read_all = client.post("/api/v1/notifications/read-all", headers=headers)
    assert read_all.status_code == 204
    assert (
        client.get("/api/v1/notifications", headers=headers, params={"unread_only": True}).json()
        == []
    )

    deleted = client.delete(f"/api/v1/notifications/{n1.id}", headers=headers)
    assert deleted.status_code == 204
    assert len(client.get("/api/v1/notifications", headers=headers).json()) == 1


def test_notifications_multi_user_isolation(client, db_session):
    user_a_id, _ = _register(client, "na@example.com")
    _, headers_b = _register(client, "nb@example.com")

    notif = Notification(
        user_id=user_a_id,
        type="info",
        severity="normal",
        title="Info User A",
        message="Pesan khusus User A",
        is_read=False,
    )
    db_session.add(notif)
    db_session.commit()

    assert client.get("/api/v1/notifications", headers=headers_b).json() == []
    assert (
        client.patch(f"/api/v1/notifications/{notif.id}/read", headers=headers_b).status_code == 404
    )
    assert client.delete(f"/api/v1/notifications/{notif.id}", headers=headers_b).status_code == 404
