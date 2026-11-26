import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import get_settings


class InvalidTokenError(Exception):
    """Raised when a bearer token cannot be trusted."""


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: uuid.UUID, token_version: int = 0) -> tuple[str, int]:
    settings = get_settings()
    lifetime = timedelta(minutes=settings.access_token_expire_minutes)
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + lifetime).timestamp()),
        "type": "access",
        "ver": token_version,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int(lifetime.total_seconds())


def decode_access_token(token: str) -> tuple[uuid.UUID, int]:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp", "iat", "type", "ver"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise InvalidTokenError("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidTokenError("Token is invalid") from exc

    if payload.get("type") != "access":
        raise InvalidTokenError("Token type is invalid")

    try:
        token_version = int(payload["ver"])
        if token_version < 0:
            raise ValueError
    except (TypeError, ValueError) as exc:
        raise InvalidTokenError("Token version is invalid") from exc

    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except (TypeError, ValueError) as exc:
        raise InvalidTokenError("Token subject is invalid") from exc

    return user_id, token_version
