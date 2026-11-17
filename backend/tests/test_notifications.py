from sqlalchemy import select

from app.models import Notification, User

NOTIFICATION_PAYLOAD = {
    "type": "budget",
    "title": "Anggaran hampir habis",
    "message": "Sisa anggaran gaya hidup tinggal sedikit.",
    "link": "/budgets",
    "is_read": False,
}


def create_notification(db_session, email="andi@example.com", **overrides):
    user = db_session.scalar(select(User).where(User.email == email))
    notification = Notification(
        user_id=user.id,
        **{**NOTIFICATION_PAYLOAD, **overrides},
    )
    db_session.add(notification)
    db_session.commit()
    db_session.refresh(notification)
    return notification


def test_list_notifications_returns_frontend_shape(client, auth, db_session):
    account = auth()
    create_notification(db_session)

    response = client.get("/api/v1/notifications", headers=account["headers"])

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["type"] == "budget"
    assert body[0]["read"] is False
    assert body[0]["link"] == "/budgets"
    assert body[0]["date"]


def test_unread_filter_and_mark_read(client, auth, db_session):
    account = auth()
    first = create_notification(db_session, title="Pertama")
    create_notification(db_session, title="Kedua", is_read=True)

    unread = client.get(
        "/api/v1/notifications",
        params={"unreadOnly": "true"},
        headers=account["headers"],
    )
    assert [item["title"] for item in unread.json()] == ["Pertama"]

    marked = client.patch(
        f"/api/v1/notifications/{first.id}/read",
        headers=account["headers"],
    )
    assert marked.status_code == 200
    assert marked.json()["read"] is True

    read_all = client.patch("/api/v1/notifications/read-all", headers=account["headers"])
    assert read_all.status_code == 200
    assert "updated" in read_all.json()


def test_delete_notification(client, auth, db_session):
    account = auth()
    notification = create_notification(db_session)

    response = client.delete(
        f"/api/v1/notifications/{notification.id}",
        headers=account["headers"],
    )

    assert response.status_code == 204
    assert client.get("/api/v1/notifications", headers=account["headers"]).json() == []


def test_notification_isolation_between_users(client, auth, db_session):
    auth("andi@example.com")
    second = auth("budi@example.com")
    notification = create_notification(db_session)

    assert client.get("/api/v1/notifications", headers=second["headers"]).json() == []
    assert (
        client.patch(
            f"/api/v1/notifications/{notification.id}/read",
            headers=second["headers"],
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/v1/notifications/{notification.id}",
            headers=second["headers"],
        ).status_code
        == 404
    )
