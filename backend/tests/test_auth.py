from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from sqlalchemy import select

from app.config import get_settings
from app.core.constants import ACCESS_TOKEN_COOKIE, CSRF_COOKIE, CSRF_HEADER
from app.core.security import create_access_token
from app.models import FinanceSettings, User

REGISTER_PAYLOAD = {
    "name": "Andi Pratama",
    "email": "andi@example.com",
    "password": "demo1234",
}
ORIGIN_HEADERS = {"Origin": "http://localhost:5173"}


def register(client, **overrides):
    payload = {**REGISTER_PAYLOAD, **overrides}
    return client.post("/api/v1/auth/register", json=payload)


def login(client, email=REGISTER_PAYLOAD["email"], password=REGISTER_PAYLOAD["password"]):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_register_sets_session_cookies_and_camel_case_user(client, db_session):
    response = register(client)

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"expiresIn", "user"}
    assert body["expiresIn"] == 3600
    assert body["user"] == {
        "id": body["user"]["id"],
        "name": "Andi Pratama",
        "email": "andi@example.com",
        "currency": "IDR",
        "initialBalance": 0,
        "minBalance": 0,
        "avatarUrl": None,
    }

    assert response.cookies.get(ACCESS_TOKEN_COOKIE)
    assert response.cookies.get(CSRF_COOKIE)
    set_cookie_headers = response.headers.get_list("set-cookie")
    assert any("HttpOnly" in value for value in set_cookie_headers)
    assert any("SameSite=lax" in value for value in set_cookie_headers)

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


def test_login_success_sets_session_cookies(client):
    assert register(client).status_code == 201

    response = login(client, email="ANDI@EXAMPLE.COM")

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "andi@example.com"
    assert response.cookies.get(ACCESS_TOKEN_COOKIE)
    assert response.cookies.get(CSRF_COOKIE)


def test_login_rejects_wrong_password_and_unknown_email(client):
    assert register(client).status_code == 201

    wrong_password = login(client, password="salah1234")
    unknown_email = login(client, email="tidak@example.com")

    assert wrong_password.status_code == 401
    assert wrong_password.json()["detail"] == "Email atau password salah"
    assert unknown_email.status_code == 401
    assert unknown_email.json()["detail"] == "Email atau password salah"


def test_me_accepts_session_cookie_and_bearer_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert (
        client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid"}).status_code
        == 401
    )

    registered = register(client)
    assert registered.status_code == 201
    assert client.get("/api/v1/auth/me").status_code == 200

    client.cookies.clear()
    token, _ = create_access_token(UUID(registered.json()["user"]["id"]))
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "andi@example.com"


def test_me_rejects_expired_token(client):
    assert register(client).status_code == 201
    client.cookies.clear()
    settings = get_settings()
    now = datetime.now(UTC)
    expired_token = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000000",
            "iat": int((now - timedelta(hours=2)).timestamp()),
            "exp": int((now - timedelta(hours=1)).timestamp()),
            "type": "access",
            "ver": 0,
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401


def test_mutating_requests_require_matching_csrf_token(client):
    assert register(client).status_code == 201
    payload = {
        "currentPassword": "salah1234",
        "newPassword": "baru12345",
    }

    assert client.post("/api/v1/auth/change-password", json=payload).status_code == 403

    missing_origin = client.post(
        "/api/v1/auth/change-password",
        json=payload,
        headers={CSRF_HEADER: client.cookies.get(CSRF_COOKIE)},
    )
    assert missing_origin.status_code == 403
    assert missing_origin.json()["detail"] == "Origin tidak valid"

    untrusted_origin = client.post(
        "/api/v1/auth/change-password",
        json=payload,
        headers={
            "Origin": "https://jahat.example",
            CSRF_HEADER: client.cookies.get(CSRF_COOKIE),
        },
    )
    assert untrusted_origin.status_code == 403
    assert untrusted_origin.json()["detail"] == "Origin tidak valid"

    mismatch = client.post(
        "/api/v1/auth/change-password",
        json=payload,
        headers={**ORIGIN_HEADERS, CSRF_HEADER: "token-salah"},
    )
    assert mismatch.status_code == 403

    accepted = client.post(
        "/api/v1/auth/change-password",
        json=payload,
        headers={**ORIGIN_HEADERS, CSRF_HEADER: client.cookies.get(CSRF_COOKIE)},
    )
    assert accepted.status_code == 400


def test_logout_clears_session_cookies(client):
    registered = register(client)
    assert registered.status_code == 201
    assert client.get("/api/v1/auth/me").status_code == 200

    response = client.post(
        "/api/v1/auth/logout",
        headers={**ORIGIN_HEADERS, CSRF_HEADER: client.cookies.get(CSRF_COOKIE)},
    )

    assert response.status_code == 204
    assert response.content == b""
    assert client.get("/api/v1/auth/me").status_code == 401


def test_bearer_token_takes_precedence_over_session_cookie(client):
    registered = register(client)
    stale_token, _ = create_access_token(
        UUID(registered.json()["user"]["id"]),
        token_version=99,
    )

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {stale_token}"},
    )

    assert response.status_code == 401


def test_logout_revokes_existing_bearer_token(client):
    register(client)
    old_token = client.cookies.get(ACCESS_TOKEN_COOKIE)

    logged_out = client.post(
        "/api/v1/auth/logout",
        headers={**ORIGIN_HEADERS, CSRF_HEADER: client.cookies.get(CSRF_COOKIE)},
    )
    assert logged_out.status_code == 204

    client.cookies.clear()
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {old_token}"},
    )

    assert response.status_code == 401


def test_change_password_rotates_session_and_rejects_old_token(client):
    register(client)
    old_token = client.cookies.get(ACCESS_TOKEN_COOKIE)
    payload = {
        "currentPassword": "demo1234",
        "newPassword": "baru12345",
    }

    response = client.post(
        "/api/v1/auth/change-password",
        json=payload,
        headers={**ORIGIN_HEADERS, CSRF_HEADER: client.cookies.get(CSRF_COOKIE)},
    )

    assert response.status_code == 204
    new_token = response.cookies.get(ACCESS_TOKEN_COOKIE)
    assert new_token is not None
    assert new_token != old_token
    assert client.get("/api/v1/auth/me").status_code == 200

    client.cookies.clear()
    assert (
        client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {old_token}"},
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {new_token}"},
        ).status_code
        == 200
    )
