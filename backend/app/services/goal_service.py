from __future__ import annotations

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import Goal, GoalContribution
from app.schemas.goal import (
    GoalContributionCreate,
    GoalCreate,
    GoalOut,
    GoalUpdate,
)
from app.services.errors import ResourceNotFoundError


def _saved_amount(db: Session, goal_id: uuid.UUID) -> int:
    total = db.scalar(
        select(func.coalesce(func.sum(GoalContribution.amount), 0)).where(
            GoalContribution.goal_id == goal_id
        )
    )
    return int(total or 0)


def _to_out(db: Session, goal: Goal) -> GoalOut:
    return GoalOut(
        id=goal.id,
        name=goal.name,
        target_amount=goal.target_amount,
        saved_amount=_saved_amount(db, goal.id),
        deadline=goal.deadline,
    )


def _get_goal(db: Session, user_id: uuid.UUID, goal_id: uuid.UUID) -> Goal:
    goal = db.get(Goal, goal_id)
    if goal is None or goal.user_id != user_id:
        raise ResourceNotFoundError("Target tabungan tidak ditemukan")
    return goal


def _saved_amount_map(db: Session, user_id: uuid.UUID) -> dict[uuid.UUID, int]:
    rows = db.execute(
        select(
            GoalContribution.goal_id,
            func.coalesce(func.sum(GoalContribution.amount), 0),
        )
        .join(Goal, Goal.id == GoalContribution.goal_id)
        .where(Goal.user_id == user_id)
        .group_by(GoalContribution.goal_id)
    ).all()

    return {goal_id: int(total) for goal_id, total in rows}


def list_goals(db: Session, user_id: uuid.UUID) -> list[GoalOut]:
    goals = db.scalars(
        select(Goal).where(Goal.user_id == user_id).order_by(Goal.deadline.asc())
    ).all()
    saved_amounts = _saved_amount_map(db, user_id)

    return [
        GoalOut(
            id=goal.id,
            name=goal.name,
            target_amount=goal.target_amount,
            saved_amount=saved_amounts.get(goal.id, 0),
            deadline=goal.deadline,
        )
        for goal in goals
    ]


def get_goal(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
) -> GoalOut:
    return _to_out(db, _get_goal(db, user_id, goal_id))


def create_goal(
    db: Session,
    user_id: uuid.UUID,
    payload: GoalCreate,
) -> GoalOut:
    goal = Goal(
        user_id=user_id,
        name=payload.name,
        target_amount=payload.target_amount,
        deadline=payload.deadline,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _to_out(db, goal)


def update_goal(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: GoalUpdate,
) -> GoalOut:
    goal = _get_goal(db, user_id, goal_id)

    goal.name = payload.name
    goal.target_amount = payload.target_amount
    goal.deadline = payload.deadline
    db.commit()
    db.refresh(goal)
    return _to_out(db, goal)


def add_goal_contribution(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: GoalContributionCreate,
) -> GoalOut:
    goal = _get_goal(db, user_id, goal_id)
    contribution = GoalContribution(
        goal_id=goal.id,
        amount=payload.amount,
        note=payload.note,
    )
    db.add(contribution)
    db.commit()
    db.refresh(goal)
    return _to_out(db, goal)


def delete_goal(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
) -> None:
    goal = _get_goal(db, user_id, goal_id)
    db.execute(delete(GoalContribution).where(GoalContribution.goal_id == goal.id))
    db.delete(goal)
    db.commit()
