from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import FinanceSettings, User
from app.schemas.settings import FinanceSettingsOut, FinanceSettingsUpdate


def get_or_create_finance_settings(db: Session, user: User) -> FinanceSettings:
    settings = db.get(FinanceSettings, user.id)

    if settings is None:
        settings = FinanceSettings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


def _to_out(settings: FinanceSettings) -> FinanceSettingsOut:
    return FinanceSettingsOut(
        currency=settings.currency,
        initial_balance=settings.initial_balance,
        min_balance=settings.min_balance,
        period=settings.period,
        notify_budget=settings.notify_budget,
        notify_balance=settings.notify_balance,
        notify_goal=settings.notify_goal,
    )


def get_finance_settings(db: Session, user: User) -> FinanceSettingsOut:
    return _to_out(get_or_create_finance_settings(db, user))


def update_finance_settings(
    db: Session,
    user: User,
    payload: FinanceSettingsUpdate,
) -> FinanceSettingsOut:
    settings = get_or_create_finance_settings(db, user)

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return _to_out(settings)
