from __future__ import annotations

import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models import Goal, GoalContribution
from app.schemas.goal import GoalContributionCreate, GoalCreate, GoalOut, GoalUpdate
from app.services.errors import ResourceNotFoundError


def _get_goal_model(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
) -> Goal:
    goal = db.scalar(
        select(Goal).where(
            Goal.id == goal_id,
            Goal.user_id == user_id,
        )
    )
    if goal is None:
        raise ResourceNotFoundError("Target tabungan tidak ditemukan")
    return goal


def list_goals(db: Session, user_id: uuid.UUID) -> list[GoalOut]:
    stmt = (
        select(
            Goal,
            func.coalesce(func.sum(GoalContribution.amount), 0).label("saved_amount"),
        )
        .outerjoin(GoalContribution, GoalContribution.goal_id == Goal.id)
        .where(Goal.user_id == user_id)
        .group_by(Goal.id)
        .order_by(Goal.deadline.asc(), Goal.created_at.asc())
    )
    rows = db.execute(stmt).all()
    return [
        GoalOut(
            id=goal.id,
            name=goal.name,
            target_amount=goal.target_amount,
            saved_amount=int(saved_amount),
            deadline=goal.deadline,
        )
        for goal, saved_amount in rows
    ]


def get_goal(db: Session, user_id: uuid.UUID, goal_id: uuid.UUID) -> GoalOut:
    stmt = (
        select(
            Goal,
            func.coalesce(func.sum(GoalContribution.amount), 0).label("saved_amount"),
        )
        .outerjoin(GoalContribution, GoalContribution.goal_id == Goal.id)
        .where(Goal.id == goal_id, Goal.user_id == user_id)
        .group_by(Goal.id)
    )
    row = db.execute(stmt).first()
    if row is None:
        raise ResourceNotFoundError("Target tabungan tidak ditemukan")
    goal, saved_amount = row
    return GoalOut(
        id=goal.id,
        name=goal.name,
        target_amount=goal.target_amount,
        saved_amount=int(saved_amount),
        deadline=goal.deadline,
    )


def create_goal_with_evaluation(
    db: Session,
    user_id: uuid.UUID,
    payload: GoalCreate,
) -> tuple[GoalOut, object]:
    goal = Goal(
        user_id=user_id,
        name=payload.name,
        target_amount=payload.target_amount,
        deadline=payload.deadline,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    from app.modules.rule_engine.service import evaluate_user_finances

    evaluation = evaluate_user_finances(db, user_id, persist_notifications=True)
    return (
        GoalOut(
            id=goal.id,
            name=goal.name,
            target_amount=goal.target_amount,
            saved_amount=0,
            deadline=goal.deadline,
        ),
        evaluation,
    )


def create_goal(db: Session, user_id: uuid.UUID, payload: GoalCreate) -> GoalOut:
    goal_out, _ = create_goal_with_evaluation(db, user_id, payload)
    return goal_out


def update_goal_with_evaluation(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: GoalUpdate,
) -> tuple[GoalOut, object]:
    goal = _get_goal_model(db, user_id, goal_id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(goal, field, value)
    db.commit()

    from app.modules.rule_engine.service import evaluate_user_finances

    evaluation = evaluate_user_finances(db, user_id, persist_notifications=True)
    return get_goal(db, user_id, goal_id), evaluation


def update_goal(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: GoalUpdate,
) -> GoalOut:
    goal_out, _ = update_goal_with_evaluation(db, user_id, goal_id, payload)
    return goal_out


def delete_goal(db: Session, user_id: uuid.UUID, goal_id: uuid.UUID) -> None:
    goal = _get_goal_model(db, user_id, goal_id)
    db.delete(goal)
    db.commit()


def add_contribution_with_evaluation(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: GoalContributionCreate,
) -> tuple[GoalOut, object]:
    goal = _get_goal_model(db, user_id, goal_id)
    contribution = GoalContribution(
        goal_id=goal.id,
        amount=payload.amount,
        note=payload.note if payload.note else None,
    )
    db.add(contribution)
    db.commit()

    from app.modules.rule_engine.service import evaluate_user_finances

    evaluation = evaluate_user_finances(db, user_id, persist_notifications=True)
    return get_goal(db, user_id, goal.id), evaluation


def add_contribution(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: GoalContributionCreate,
) -> GoalOut:
    goal_out, _ = add_contribution_with_evaluation(db, user_id, goal_id, payload)
    return goal_out


def list_contributions(
    db: Session,
    user_id: uuid.UUID,
    goal_id: uuid.UUID,
) -> list[GoalContribution]:
    goal = _get_goal_model(db, user_id, goal_id)
    stmt = (
        select(GoalContribution)
        .where(GoalContribution.goal_id == goal.id)
        .order_by(desc(GoalContribution.contributed_at))
    )
    return list(db.scalars(stmt).all())
