from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.settings import FinanceSettingsOut, FinanceSettingsUpdate
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/finance", response_model=FinanceSettingsOut)
def get_finance_settings(current_user: CurrentUser, db: DbSession) -> FinanceSettingsOut:
    return settings_service.get_finance_settings(db, current_user)


@router.patch("/finance", response_model=FinanceSettingsOut)
def update_finance_settings(
    payload: FinanceSettingsUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> FinanceSettingsOut:
    return settings_service.update_finance_settings(db, current_user, payload)
