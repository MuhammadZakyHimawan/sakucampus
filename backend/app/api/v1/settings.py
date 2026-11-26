from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.modules.telegram.notifier import dispatch_notifications_to_telegram
from app.schemas.settings import FinanceSettingsOut, FinanceSettingsUpdate, ProfileUpdate
from app.schemas.user import UserOut
from app.services import settings_service
from app.services.auth_service import build_user_out
from app.services.errors import EmailAlreadyRegisteredError

router = APIRouter(tags=["settings"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/settings/finance", response_model=FinanceSettingsOut)
def get_finance_settings(
    current_user: CurrentUser,
    db: DbSession,
) -> FinanceSettingsOut:
    settings = settings_service.get_or_create_finance_settings(db, current_user.id)
    return FinanceSettingsOut.model_validate(settings)


@router.patch("/settings/finance", response_model=FinanceSettingsOut)
def update_finance_settings(
    payload: FinanceSettingsUpdate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbSession,
) -> FinanceSettingsOut:
    settings, eval_res = settings_service.update_finance_settings_with_evaluation(
        db,
        current_user.id,
        payload,
    )
    if eval_res.new_notifications:  # type: ignore[attr-defined]
        background_tasks.add_task(
            dispatch_notifications_to_telegram,
            current_user.id,
            [n.id for n in eval_res.new_notifications],  # type: ignore[attr-defined]
        )
    return FinanceSettingsOut.model_validate(settings)


@router.patch("/users/me", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> UserOut:
    try:
        user = settings_service.update_user_profile(db, current_user, payload)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return build_user_out(db, user)
