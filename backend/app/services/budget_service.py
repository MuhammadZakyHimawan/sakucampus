from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Budget
from app.modules.rule_engine.service import RuleEvaluationResult, evaluate_user_finances
from app.schemas.budget import BudgetCreate, BudgetUpdate
from app.services.errors import ConflictError, ResourceNotFoundError, ValidationDomainError


def _has_overlapping_budget(
    db: Session,
    user_id: uuid.UUID,
    category: str,
    period_start: date,
    period_end: date,
    *,
    exclude_id: uuid.UUID | None = None,
) -> bool:
    stmt = select(Budget.id).where(
        Budget.user_id == user_id,
        Budget.category == category,
        Budget.period_start <= period_end,
        Budget.period_end >= period_start,
    )
    if exclude_id is not None:
        stmt = stmt.where(Budget.id != exclude_id)
    return db.scalar(stmt) is not None


def list_budgets(
    db: Session,
    user_id: uuid.UUID,
    *,
    period_start: date | None = None,
    period_end: date | None = None,
) -> list[Budget]:
    stmt = select(Budget).where(Budget.user_id == user_id)
    if period_start is not None:
        stmt = stmt.where(Budget.period_end >= period_start)
    if period_end is not None:
        stmt = stmt.where(Budget.period_start <= period_end)
    stmt = stmt.order_by(Budget.period_start.desc(), Budget.category.asc())
    return list(db.scalars(stmt).all())


def get_budget(
    db: Session,
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
) -> Budget:
    budget = db.scalar(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == user_id,
        )
    )
    if budget is None:
        raise ResourceNotFoundError("Anggaran tidak ditemukan")
    return budget


def create_budget_with_evaluation(
    db: Session,
    user_id: uuid.UUID,
    payload: BudgetCreate,
) -> tuple[Budget, RuleEvaluationResult]:
    if _has_overlapping_budget(
        db,
        user_id,
        payload.category,
        payload.period_start,
        payload.period_end,
    ):
        raise ConflictError(
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
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(
            f"Anggaran untuk kategori {payload.category} sudah ada pada periode ini"
        ) from exc

    db.refresh(budget)
    evaluation = evaluate_user_finances(db, user_id, persist_notifications=True)
    return budget, evaluation


def create_budget(
    db: Session,
    user_id: uuid.UUID,
    payload: BudgetCreate,
) -> Budget:
    budget, _ = create_budget_with_evaluation(db, user_id, payload)
    return budget


def update_budget_with_evaluation(
    db: Session,
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
    payload: BudgetUpdate,
) -> tuple[Budget, RuleEvaluationResult]:
    budget = get_budget(db, user_id, budget_id)
    updates = payload.model_dump(exclude_unset=True)

    next_category = updates.get("category", budget.category)
    next_start = updates.get("period_start", budget.period_start)
    next_end = updates.get("period_end", budget.period_end)

    if next_end < next_start:
        raise ValidationDomainError("Tanggal selesai tidak boleh sebelum tanggal mulai")

    if _has_overlapping_budget(
        db,
        user_id,
        next_category,
        next_start,
        next_end,
        exclude_id=budget.id,
    ):
        raise ConflictError(f"Anggaran untuk kategori {next_category} sudah ada pada periode ini")

    if "category" in updates:
        budget.category = updates["category"]
    if "limit" in updates:
        budget.limit_amount = updates["limit"]
    if "period_start" in updates:
        budget.period_start = updates["period_start"]
    if "period_end" in updates:
        budget.period_end = updates["period_end"]

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(
            f"Anggaran untuk kategori {next_category} sudah ada pada periode ini"
        ) from exc

    db.refresh(budget)
    evaluation = evaluate_user_finances(db, user_id, persist_notifications=True)
    return budget, evaluation


def update_budget(
    db: Session,
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
    payload: BudgetUpdate,
) -> Budget:
    budget, _ = update_budget_with_evaluation(db, user_id, budget_id, payload)
    return budget


def delete_budget(
    db: Session,
    user_id: uuid.UUID,
    budget_id: uuid.UUID,
) -> None:
    budget = get_budget(db, user_id, budget_id)
    db.delete(budget)
    db.commit()
