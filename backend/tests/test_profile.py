def test_update_profile(client, auth):
    account = auth()

    response = client.patch(
        "/api/v1/auth/me",
        json={"name": "Andi Baru", "email": "andi.baru@example.com"},
        headers=account["headers"],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Andi Baru"
    assert body["email"] == "andi.baru@example.com"

    me = client.get("/api/v1/auth/me", headers=account["headers"]).json()
    assert me["name"] == "Andi Baru"
    assert me["email"] == "andi.baru@example.com"


def test_update_profile_rejects_duplicate_email(client, auth):
    first = auth("andi@example.com")
    auth("budi@example.com")

    response = client.patch(
        "/api/v1/auth/me",
        json={"email": "budi@example.com"},
        headers=first["headers"],
    )

    assert response.status_code == 409


def test_change_password(client, auth):
    account = auth()

    wrong_current = client.post(
        "/api/v1/auth/change-password",
        json={"currentPassword": "salah1234", "newPassword": "baru1234"},
        headers=account["headers"],
    )
    assert wrong_current.status_code == 400

    changed = client.post(
        "/api/v1/auth/change-password",
        json={"currentPassword": "demo1234", "newPassword": "baru1234"},
        headers=account["headers"],
    )
    assert changed.status_code == 204

    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": "andi@example.com", "password": "demo1234"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": "andi@example.com", "password": "baru1234"},
    )
    assert new_login.status_code == 200
