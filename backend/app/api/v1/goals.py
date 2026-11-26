from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.goal import (
    GoalContributionCreate,
    GoalCreate,
    GoalOut,
    GoalUpdate,
)
from app.services import goal_service, rule_engine

router = APIRouter(prefix="/goals", tags=["goals"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[GoalOut])
def list_goals(current_user: CurrentUser, db: DbSession) -> list[GoalOut]:
    return goal_service.list_goals(db, current_user.id)


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalOut:
    result = goal_service.create_goal(db, current_user.id, payload)
    await rule_engine.evaluate_and_notify(db, current_user)
    return result


@router.get("/{goal_id}", response_model=GoalOut)
def get_goal(
    goal_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalOut:
    return goal_service.get_goal(db, current_user.id, goal_id)


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: uuid.UUID,
    payload: GoalUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalOut:
    result = goal_service.update_goal(db, current_user.id, goal_id, payload)
    await rule_engine.evaluate_and_notify(db, current_user)
    return result


@router.post("/{goal_id}/contributions", response_model=GoalOut)
async def add_goal_contribution(
    goal_id: uuid.UUID,
    payload: GoalContributionCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> GoalOut:
    result = goal_service.add_goal_contribution(
        db,
        current_user.id,
        goal_id,
        payload,
    )
    await rule_engine.evaluate_and_notify(db, current_user)
    return result


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    goal_service.delete_goal(db, current_user.id, goal_id)
    await rule_engine.evaluate_and_notify(db, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
