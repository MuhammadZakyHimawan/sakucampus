from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.user import UserOut
from app.services.auth_service import (
    authenticate_user,
    build_auth_response,
    build_user_out,
    register_user,
)
from app.services.errors import EmailAlreadyRegisteredError

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> AuthResponse:
    try:
        user = register_user(db, payload)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar",
        ) from exc

    return build_auth_response(db, user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return build_auth_response(db, user)


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser, db: DbSession) -> UserOut:
    return build_user_out(db, current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(_current_user: CurrentUser) -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)
