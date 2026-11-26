from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.constants import ACCESS_TOKEN_COOKIE
from app.core.security import InvalidTokenError, decode_access_token
from app.database import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah kedaluwarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    use_bearer = credentials is not None and credentials.scheme.lower() == "bearer"
    token = credentials.credentials if use_bearer else request.cookies.get(ACCESS_TOKEN_COOKIE)

    if token is None:
        raise unauthorized()

    try:
        user_id, token_version = decode_access_token(token)
    except InvalidTokenError as exc:
        raise unauthorized() from exc

    user = db.get(User, user_id)
    if user is None or token_version != user.token_version:
        raise unauthorized()

    return user
