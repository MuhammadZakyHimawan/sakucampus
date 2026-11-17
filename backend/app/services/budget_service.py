from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Budget
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate
from app.services.errors import ResourceConflictError, ResourceNotFoundError


def _to_out(budget: Budget) -> BudgetOut:
    return BudgetOut(
        id=budget.id,
        category=budget.category,
        limit=budget.limit_amount,
        period_start=budget.period_start,
        period_end=budget.period_end,
    )


def _get_budget(db: Session, user_id: uuid.UUID, budget_id: uuid.UUID) -> Budget:
    budget = db.get(Budget, budget_id)
    if budget is None or budget.user_id != user_id:
        raise ResourceNotFoundError("Anggaran tidak ditemukan")
    return budget


def _find_overlap(
    db: Session,
    user_id: uuid.UUID,
    category: str,
    period_start: date,
    period_end: date,
    *,
    exclude_id: uuid.UUID | None = None,
) -> Budget | None:
    statement = select(Budget).where(
        Budget.user_id == user_id,
        Budget.category == category,
        Budget.period_start <= period_end,
        Budget.period_end >= period_start,
    )

    if exclude_id is not None:
        statement = statement.where(Budget.id != exclude_id)

    return db.scalar(statement)


def list_budgets(
    db: Session,
    user_id: uuid.UUID,
    *,
    period_start: date | None = None,
    period_end: date | None = None,
) -> list[BudgetOut]:
    statement = select(Budget).where(Budget.user_id == user_id)

    if period_start is not None and period_end is not None:
        statement = statement.where(
            Budget.period_start <= period_end,
            Budget.period_end >= period_start,
        )
    elif period_start is not None:
        statement = statement.where(Budget.period_end >= period_start)
    elif period_end is not None:
        statement = statement.where(Budget.period_start <= period_end)

    statement = statement.order_by(Budget.period_start.desc(), Budget.category.asc())

    return [_to_out(budget) for budget in db.scalars(statement).all()]


def create_budget(
    db: Session,
    user_id: uuid.UUID,
    payload: BudgetCreate,
) -> BudgetOut:
    overlap = _find_overlap(
        db,
        user_id,
        payload.category,
        payload.period_start,
        payload.period_end,
    )
    if overlap is not None:
        raise ResourceConflictError(
            f"Anggaran untuk kategori {payload.category} sudah ada pada periode ini"
        )

    budget = Budget(
        user_id=user_id,
        category=payload.category,
        limit_amount=payload.limit,
        period_start=payload.period_start,
        period_end=payload.period_end,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return _to_out(budget)


def update_budget(
    db: Session,
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
    payload: BudgetUpdate,
) -> BudgetOut:
    budget = _get_budget(db, user_id, budget_id)
    overlap = _find_overlap(
        db,
        user_id,
        payload.category,
        payload.period_start,
        payload.period_end,
        exclude_id=budget.id,
    )
    if overlap is not None:
        raise ResourceConflictError(
            f"Anggaran untuk kategori {payload.category} sudah ada pada periode ini"
        )

    budget.category = payload.category
    budget.limit_amount = payload.limit
    budget.period_start = payload.period_start
    budget.period_end = payload.period_end
    db.commit()
    db.refresh(budget)
    return _to_out(budget)


def delete_budget(
    db: Session,
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
) -> None:
    budget = _get_budget(db, user_id, budget_id)
    db.delete(budget)
    db.commit()
