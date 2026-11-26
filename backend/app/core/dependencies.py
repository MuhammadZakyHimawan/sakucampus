from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

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
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized()

    try:
        user_id = decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise unauthorized() from exc

    user = db.get(User, user_id)
    if user is None:
        raise unauthorized()

    return user
