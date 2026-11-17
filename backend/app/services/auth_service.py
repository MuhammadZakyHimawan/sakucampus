from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models import FinanceSettings, User
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    ProfileUpdate,
    RegisterRequest,
)
from app.schemas.user import UserOut
from app.services.errors import EmailAlreadyRegisteredError, InvalidCredentialsError

_DUMMY_HASH = hash_password("dummy-password-123")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized = normalize_email(email)
    return db.scalar(select(User).where(func.lower(User.email) == normalized))


def get_finance_settings(db: Session, user_id: object) -> FinanceSettings | None:
    return db.scalar(select(FinanceSettings).where(FinanceSettings.user_id == user_id))


def build_user_out(db: Session, user: User) -> UserOut:
    settings = get_finance_settings(db, user.id)
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        currency=settings.currency if settings else "IDR",
        initial_balance=settings.initial_balance if settings else 0,
        min_balance=settings.min_balance if settings else 0,
        avatar_url=user.avatar_url,
    )


def build_auth_response(db: Session, user: User) -> AuthResponse:
    token, expires_in = create_access_token(user.id)
    return AuthResponse(
        access_token=token,
        expires_in=expires_in,
        user=build_user_out(db, user),
    )


def register_user(db: Session, payload: RegisterRequest) -> User:
    if get_user_by_email(db, payload.email) is not None:
        raise EmailAlreadyRegisteredError

    user = User(
        name=payload.name,
        email=normalize_email(payload.email),
        password_hash=hash_password(payload.password),
    )
    db.add(user)

    try:
        db.flush()
        db.add(FinanceSettings(user_id=user.id))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise EmailAlreadyRegisteredError from exc

    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


def update_user_profile(
    db: Session,
    user: User,
    payload: ProfileUpdate,
) -> User:
    if payload.email is not None:
        normalized = normalize_email(payload.email)
        existing = get_user_by_email(db, normalized)

        if existing is not None and existing.id != user.id:
            raise EmailAlreadyRegisteredError

        user.email = normalized

    if payload.name is not None:
        user.name = payload.name

    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url or None

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise EmailAlreadyRegisteredError from exc

    db.refresh(user)
    return user


def change_user_password(
    db: Session,
    user: User,
    payload: ChangePasswordRequest,
) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise InvalidCredentialsError

    user.password_hash = hash_password(payload.new_password)
    db.commit()
