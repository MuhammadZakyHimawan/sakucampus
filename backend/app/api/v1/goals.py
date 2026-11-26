from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.modules.telegram.notifier import dispatch_notifications_to_telegram
from app.schemas.goal import (
    GoalContributionCreate,
    GoalContributionOut,
    GoalCreate,
    GoalOut,
    GoalUpdate,
)
from app.services import goal_service
from app.services.errors import ResourceNotFoundError

router = APIRouter(prefix="/goals", tags=["goals"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[GoalOut])
def list_goals(current_user: CurrentUser, db: DbSession) -> list[GoalOut]:
    return goal_service.list_goals(db, current_user.id)


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalOut:
    goal_out, eval_res = goal_service.create_goal_with_evaluation(db, current_user.id, payload)
    if eval_res.new_notifications:  # type: ignore[attr-defined]
        background_tasks.add_task(
            dispatch_notifications_to_telegram,
            current_user.id,
            [n.id for n in eval_res.new_notifications],  # type: ignore[attr-defined]
        )
    return goal_out


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: uuid.UUID,
    payload: GoalUpdate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalOut:
    try:
        goal_out, eval_res = goal_service.update_goal_with_evaluation(
            db,
            current_user.id,
            goal_id,
            payload,
        )
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if eval_res.new_notifications:  # type: ignore[attr-defined]
        background_tasks.add_task(
            dispatch_notifications_to_telegram,
            current_user.id,
            [n.id for n in eval_res.new_notifications],  # type: ignore[attr-defined]
        )
    return goal_out


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    try:
        goal_service.delete_goal(db, current_user.id, goal_id)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{goal_id}/contributions",
    response_model=GoalOut,
    status_code=status.HTTP_201_CREATED,
)
def add_goal_contribution(
    goal_id: uuid.UUID,
    payload: GoalContributionCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalOut:
    try:
        goal_out, eval_res = goal_service.add_contribution_with_evaluation(
            db,
            current_user.id,
            goal_id,
            payload,
        )
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if eval_res.new_notifications:  # type: ignore[attr-defined]
        background_tasks.add_task(
            dispatch_notifications_to_telegram,
            current_user.id,
            [n.id for n in eval_res.new_notifications],  # type: ignore[attr-defined]
        )
    return goal_out


@router.get("/{goal_id}/contributions", response_model=list[GoalContributionOut])
def list_goal_contributions(
    goal_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[GoalContributionOut]:
    try:
        items = goal_service.list_contributions(db, current_user.id, goal_id)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return [GoalContributionOut.model_validate(item) for item in items]
