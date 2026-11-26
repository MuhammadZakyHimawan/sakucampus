from sqlalchemy import select

from app.core.constants import (
    AUDIT_LOGIN_FAILED,
    AUDIT_LOGIN_SUCCESS,
    AUDIT_LOGOUT,
    AUDIT_PASSWORD_CHANGED,
    AUDIT_REGISTER,
    CSRF_HEADER,
)
from app.models import SecurityEvent

ORIGIN_HEADERS = {"Origin": "http://localhost:5173"}


def events_of_type(db_session, event_type):
    return list(
        db_session.scalars(select(SecurityEvent).where(SecurityEvent.event_type == event_type))
    )


def test_successful_auth_flow_writes_audit_events(client, db_session):
    assert (
        client.post(
            "/api/v1/auth/register",
            json={"name": "Andi", "email": "andi@example.com", "password": "demo1234"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "andi@example.com", "password": "demo1234"},
        ).status_code
        == 200
    )

    logged_out = client.post(
        "/api/v1/auth/logout",
        headers={**ORIGIN_HEADERS, CSRF_HEADER: client.cookies.get("sakucampus_csrf_token")},
    )
    assert logged_out.status_code == 204

    assert len(events_of_type(db_session, AUDIT_REGISTER)) == 1
    assert len(events_of_type(db_session, AUDIT_LOGIN_SUCCESS)) == 1
    assert len(events_of_type(db_session, AUDIT_LOGOUT)) == 1
    assert all(event.outcome == "success" for event in events_of_type(db_session, AUDIT_LOGOUT))


def test_failed_login_and_password_change_write_audit_events(client, db_session):
    assert (
        client.post(
            "/api/v1/auth/register",
            json={"name": "Andi", "email": "andi@example.com", "password": "demo1234"},
        ).status_code
        == 201
    )

    failed_login = client.post(
        "/api/v1/auth/login",
        json={"email": "andi@example.com", "password": "salah1234"},
    )
    assert failed_login.status_code == 401
    failed_events = events_of_type(db_session, AUDIT_LOGIN_FAILED)
    assert len(failed_events) == 1
    assert failed_events[0].outcome == "failure"

    failed_change = client.post(
        "/api/v1/auth/change-password",
        json={"currentPassword": "salah1234", "newPassword": "baru12345"},
        headers={**ORIGIN_HEADERS, CSRF_HEADER: client.cookies.get("sakucampus_csrf_token")},
    )
    assert failed_change.status_code == 400
    password_events = events_of_type(db_session, AUDIT_PASSWORD_CHANGED)
    assert len(password_events) == 1
    assert password_events[0].outcome == "failure"


def test_audit_event_contains_request_context(client, db_session):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Andi", "email": "andi@example.com", "password": "demo1234"},
        headers={"X-Request-ID": "req-audit-123", "User-Agent": "pytest"},
    )
    assert response.status_code == 201

    event = events_of_type(db_session, AUDIT_REGISTER)[0]
    assert event.outcome == "success"
    assert event.request_id == "req-audit-123"
    assert event.user_agent == "pytest"
    assert event.user_id is not None
