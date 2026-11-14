from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import select

from app.config import get_settings
from app.models import FinanceSettings, User

REGISTER_PAYLOAD = {
    "name": "Andi Pratama",
    "email": "andi@example.com",
    "password": "demo1234",
}


def register(client, **overrides):
    payload = {**REGISTER_PAYLOAD, **overrides}
    return client.post("/api/v1/auth/register", json=payload)


def login(client, email=REGISTER_PAYLOAD["email"], password=REGISTER_PAYLOAD["password"]):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_register_returns_token_and_camel_case_user(client, db_session):
    response = register(client)

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"accessToken", "tokenType", "expiresIn", "user"}
    assert body["tokenType"] == "Bearer"
    assert body["expiresIn"] == 3600
    assert body["accessToken"]
    assert body["user"] == {
        "id": body["user"]["id"],
        "name": "Andi Pratama",
        "email": "andi@example.com",
        "currency": "IDR",
        "initialBalance": 0,
        "minBalance": 0,
        "avatarUrl": None,
    }

    user = db_session.scalar(select(User).where(User.email == "andi@example.com"))
    settings = db_session.get(FinanceSettings, user.id)
    assert settings is not None
    assert settings.initial_balance == 0
    assert settings.period == "30d"


def test_register_hashes_password(client, db_session):
    response = register(client)
    assert response.status_code == 201

    user = db_session.scalar(select(User).where(User.email == "andi@example.com"))
    assert user.password_hash != REGISTER_PAYLOAD["password"]
    assert user.password_hash.startswith("$2")


def test_register_rejects_duplicate_email_case_insensitively(client):
    assert register(client).status_code == 201

    response = register(client, email="ANDI@EXAMPLE.COM")

    assert response.status_code == 409
    assert response.json()["detail"] == "Email sudah terdaftar"


def test_register_validates_name_email_and_password(client):
    assert register(client, name="   ").status_code == 422
    assert register(client, email="bukan-email").status_code == 422
    assert register(client, password="pendek").status_code == 422
    assert register(client, password="tanpaangka").status_code == 422
    assert register(client, password="12345678").status_code == 422


def test_login_success_is_case_insensitive(client):
    assert register(client).status_code == 201

    response = login(client, email="ANDI@EXAMPLE.COM")

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "andi@example.com"
    assert body["accessToken"]


def test_login_rejects_wrong_password_and_unknown_email(client):
    assert register(client).status_code == 201

    wrong_password = login(client, password="salah1234")
    unknown_email = login(client, email="tidak@example.com")

    assert wrong_password.status_code == 401
    assert wrong_password.json()["detail"] == "Email atau password salah"
    assert unknown_email.status_code == 401
    assert unknown_email.json()["detail"] == "Email atau password salah"


def test_me_requires_valid_bearer_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert (
        client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid"}).status_code
        == 401
    )

    token = register(client).json()["accessToken"]
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] == "andi@example.com"


def test_me_rejects_expired_token(client):
    assert register(client).status_code == 201
    settings = get_settings()
    now = datetime.now(UTC)
    expired_token = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000000",
            "iat": int((now - timedelta(hours=2)).timestamp()),
            "exp": int((now - timedelta(hours=1)).timestamp()),
            "type": "access",
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401


def test_logout_returns_no_content_with_token(client):
    assert client.post("/api/v1/auth/logout").status_code == 401

    token = register(client).json()["accessToken"]
    response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 204
    assert response.content == b""
