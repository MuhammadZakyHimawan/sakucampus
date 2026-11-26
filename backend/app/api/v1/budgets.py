from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.modules.telegram.notifier import dispatch_notifications_to_telegram
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate
from app.services import budget_service
from app.services.errors import ConflictError, ResourceNotFoundError, ValidationDomainError

router = APIRouter(prefix="/budgets", tags=["budgets"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    current_user: CurrentUser,
    db: DbSession,
    period_start: Annotated[date | None, Query()] = None,
    period_end: Annotated[date | None, Query()] = None,
) -> list[BudgetOut]:
    items = budget_service.list_budgets(
        db,
        current_user.id,
        period_start=period_start,
        period_end=period_end,
    )
    return [BudgetOut.model_validate(item) for item in items]


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbSession,
) -> BudgetOut:
    try:
        item, eval_res = budget_service.create_budget_with_evaluation(
            db,
            current_user.id,
            payload,
        )
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if eval_res.new_notifications:
        background_tasks.add_task(
            dispatch_notifications_to_telegram,
            current_user.id,
            [n.id for n in eval_res.new_notifications],
        )
    return BudgetOut.model_validate(item)


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: uuid.UUID,
    payload: BudgetUpdate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbSession,
) -> BudgetOut:
    try:
        item, eval_res = budget_service.update_budget_with_evaluation(
            db,
            current_user.id,
            budget_id,
            payload,
        )
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValidationDomainError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if eval_res.new_notifications:
        background_tasks.add_task(
            dispatch_notifications_to_telegram,
            current_user.id,
            [n.id for n in eval_res.new_notifications],
        )
    return BudgetOut.model_validate(item)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    try:
        budget_service.delete_budget(db, current_user.id, budget_id)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
