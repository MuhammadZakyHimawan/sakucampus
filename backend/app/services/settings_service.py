from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import FinanceSettings, User
from app.schemas.settings import ChangePasswordRequest, FinanceSettingsUpdate, ProfileUpdate
from app.services.errors import EmailAlreadyRegisteredError, InvalidCredentialsError


def get_or_create_finance_settings(db: Session, user_id: uuid.UUID) -> FinanceSettings:
    settings = db.get(FinanceSettings, user_id)
    if settings is None:
        settings = FinanceSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_finance_settings_with_evaluation(
    db: Session,
    user_id: uuid.UUID,
    payload: FinanceSettingsUpdate,
) -> tuple[FinanceSettings, object]:
    settings = get_or_create_finance_settings(db, user_id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)

    from app.modules.rule_engine.service import evaluate_user_finances

    evaluation = evaluate_user_finances(db, user_id, persist_notifications=True)
    return settings, evaluation


def update_finance_settings(
    db: Session,
    user_id: uuid.UUID,
    payload: FinanceSettingsUpdate,
) -> FinanceSettings:
    settings, _ = update_finance_settings_with_evaluation(db, user_id, payload)
    return settings


def update_user_profile(
    db: Session,
    user: User,
    payload: ProfileUpdate,
) -> User:
    updates = payload.model_dump(exclude_unset=True)

    if "email" in updates and updates["email"] is not None:
        normalized_email = updates["email"].strip().lower()
        existing = db.scalar(
            select(User).where(
                func.lower(User.email) == normalized_email,
                User.id != user.id,
            )
        )
        if existing is not None:
            raise EmailAlreadyRegisteredError("Email sudah digunakan akun lain")
        user.email = normalized_email

    if "name" in updates and updates["name"] is not None:
        user.name = updates["name"]

    if "avatar_url" in updates:
        user.avatar_url = updates["avatar_url"]

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise EmailAlreadyRegisteredError("Email sudah digunakan akun lain") from exc

    db.refresh(user)
    return user


def change_user_password(
    db: Session,
    user: User,
    payload: ChangePasswordRequest,
) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise InvalidCredentialsError("Password saat ini tidak sesuai")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
