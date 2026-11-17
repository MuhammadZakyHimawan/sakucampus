from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.categories import ExpenseCategory, IncomeCategory, TransactionType
from app.models import Transaction
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate
from app.services.errors import ResourceNotFoundError

SortField = str
SortDirection = str


def _get_transaction(db: Session, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction:
    transaction = db.get(Transaction, transaction_id)
    if transaction is None or transaction.user_id != user_id:
        raise ResourceNotFoundError("Transaksi tidak ditemukan")
    return transaction


def _to_out(transaction: Transaction) -> TransactionOut:
    return TransactionOut.model_validate(transaction)


def list_transactions(
    db: Session,
    user_id: uuid.UUID,
    *,
    search: str | None = None,
    transaction_type: TransactionType | None = None,
    category: ExpenseCategory | IncomeCategory | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort_field: SortField = "date",
    sort_direction: SortDirection = "desc",
) -> list[TransactionOut]:
    statement = select(Transaction).where(Transaction.user_id == user_id)

    if search and search.strip():
        statement = statement.where(
            func.lower(Transaction.description).like(f"%{search.strip().lower()}%")
        )
    if transaction_type is not None:
        statement = statement.where(Transaction.type == transaction_type)
    if category is not None:
        statement = statement.where(Transaction.category == category)
    if date_from is not None:
        statement = statement.where(Transaction.date >= date_from)
    if date_to is not None:
        statement = statement.where(Transaction.date <= date_to)

    sort_column = Transaction.amount if sort_field == "amount" else Transaction.date
    order = sort_column.asc() if sort_direction == "asc" else sort_column.desc()
    statement = statement.order_by(order, Transaction.created_at.desc())

    return [_to_out(transaction) for transaction in db.scalars(statement).all()]


def get_transaction(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
) -> TransactionOut:
    return _to_out(_get_transaction(db, user_id, transaction_id))


def create_transaction(
    db: Session,
    user_id: uuid.UUID,
    payload: TransactionCreate,
) -> TransactionOut:
    transaction = Transaction(user_id=user_id, **payload.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return _to_out(transaction)


def update_transaction(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
) -> TransactionOut:
    transaction = _get_transaction(db, user_id, transaction_id)

    for field, value in payload.model_dump().items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    return _to_out(transaction)


def delete_transaction(
    db: Session,
    user_id: uuid.UUID,
    transaction_id: uuid.UUID,
) -> None:
    transaction = _get_transaction(db, user_id, transaction_id)
    db.delete(transaction)
    db.commit()
