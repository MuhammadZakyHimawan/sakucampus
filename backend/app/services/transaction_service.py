from __future__ import annotations

import uuid
from datetime import date, timedelta

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.categories import TransactionSource, TransactionType, categories_for_type
from app.models import Transaction
from app.modules.rule_engine.service import RuleEvaluationResult, evaluate_user_finances
from app.schemas.settings import PeriodPreset
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.services.errors import ResourceNotFoundError, ValidationDomainError


def resolve_preset_dates(
    preset: PeriodPreset,
    reference: date | None = None,
) -> tuple[date, date]:
    end = reference or date.today()
    if preset == "month":
        start = end.replace(day=1)
        return start, end
    days = 7 if preset == "7d" else 30
    start = end - timedelta(days=days - 1)
    return start, end


def list_transactions(
    db: Session,
    user_id: uuid.UUID,
    *,
    tx_type: TransactionType | None = None,
    category: str | None = None,
    source: TransactionSource | None = None,
    search: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    preset: PeriodPreset | None = None,
) -> list[Transaction]:
    stmt = select(Transaction).where(Transaction.user_id == user_id)

    if preset is not None and start_date is None and end_date is None:
        start_date, end_date = resolve_preset_dates(preset)

    if tx_type is not None:
        stmt = stmt.where(Transaction.type == tx_type)
    if category is not None:
        stmt = stmt.where(Transaction.category == category)
    if source is not None:
        stmt = stmt.where(Transaction.source == source)
    if start_date is not None:
        stmt = stmt.where(Transaction.date >= start_date)
    if end_date is not None:
        stmt = stmt.where(Transaction.date <= end_date)
    if search is not None and search.strip():
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(Transaction.description.ilike(pattern))

    stmt = stmt.order_by(desc(Transaction.date), desc(Transaction.created_at))
    return list(db.scalars(stmt).all())


def get_transaction(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
) -> Transaction:
    transaction = db.scalar(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
        )
    )
    if transaction is None:
        raise ResourceNotFoundError("Transaksi tidak ditemukan")
    return transaction


def create_transaction_with_evaluation(
    db: Session,
    user_id: uuid.UUID,
    payload: TransactionCreate,
) -> tuple[Transaction, RuleEvaluationResult]:
    transaction = Transaction(
        user_id=user_id,
        description=payload.description,
        amount=payload.amount,
        type=payload.type,
        category=payload.category,
        date=payload.date,
        source=payload.source,
        note=payload.note,
        raw_text=payload.raw_text,
        nlp_confidence=payload.nlp_confidence,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    evaluation = evaluate_user_finances(db, user_id, persist_notifications=True)
    return transaction, evaluation


def create_transaction(
    db: Session,
    user_id: uuid.UUID,
    payload: TransactionCreate,
) -> Transaction:
    transaction, _ = create_transaction_with_evaluation(db, user_id, payload)
    return transaction


def update_transaction_with_evaluation(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
) -> tuple[Transaction, RuleEvaluationResult]:
    transaction = get_transaction(db, user_id, transaction_id)
    updates = payload.model_dump(exclude_unset=True)

    next_type = updates.get("type", transaction.type)
    next_category = updates.get("category", transaction.category)
    if next_category not in categories_for_type(next_type):
        raise ValidationDomainError("Kategori tidak sesuai dengan jenis transaksi")

    for field, value in updates.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)

    evaluation = evaluate_user_finances(db, user_id, persist_notifications=True)
    return transaction, evaluation


def update_transaction(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
) -> Transaction:
    transaction, _ = update_transaction_with_evaluation(db, user_id, transaction_id, payload)
    return transaction


def delete_transaction_with_evaluation(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
) -> RuleEvaluationResult:
    transaction = get_transaction(db, user_id, transaction_id)
    db.delete(transaction)
    db.commit()
    return evaluate_user_finances(db, user_id, persist_notifications=True)


def delete_transaction(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
) -> None:
    delete_transaction_with_evaluation(db, user_id, transaction_id)
