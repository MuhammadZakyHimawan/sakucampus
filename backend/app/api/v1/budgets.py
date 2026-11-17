from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate
from app.services import budget_service
from app.services.errors import ResourceConflictError, ResourceNotFoundError

router = APIRouter(prefix="/budgets", tags=["budgets"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    current_user: CurrentUser,
    db: DbSession,
    period_start: Annotated[date | None, Query(alias="periodStart")] = None,
    period_end: Annotated[date | None, Query(alias="periodEnd")] = None,
) -> list[BudgetOut]:
    return budget_service.list_budgets(
        db,
        current_user.id,
        period_start=period_start,
        period_end=period_end,
    )


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> BudgetOut:
    try:
        return budget_service.create_budget(db, current_user.id, payload)
    except ResourceConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: uuid.UUID,
    payload: BudgetUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> BudgetOut:
    try:
        return budget_service.update_budget(db, current_user.id, budget_id, payload)
    except ResourceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ResourceConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    try:
        budget_service.delete_budget(db, current_user.id, budget_id)
    except ResourceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
