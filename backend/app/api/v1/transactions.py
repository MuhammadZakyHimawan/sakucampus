from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.categories import ExpenseCategory, IncomeCategory, TransactionType
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate
from app.services import rule_engine, transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    current_user: CurrentUser,
    db: DbSession,
    search: Annotated[str | None, Query(max_length=200)] = None,
    transaction_type: Annotated[TransactionType | None, Query(alias="type")] = None,
    category: ExpenseCategory | IncomeCategory | None = None,
    date_from: Annotated[date | None, Query(alias="dateFrom")] = None,
    date_to: Annotated[date | None, Query(alias="dateTo")] = None,
    sort: Literal["date", "amount"] = "date",
    order: Literal["asc", "desc"] = "desc",
) -> list[TransactionOut]:
    return transaction_service.list_transactions(
        db,
        current_user.id,
        search=search,
        transaction_type=transaction_type,
        category=category,
        date_from=date_from,
        date_to=date_to,
        sort_field=sort,
        sort_direction=order,
    )


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionOut:
    result = transaction_service.create_transaction(db, current_user.id, payload)
    await rule_engine.evaluate_and_notify(db, current_user)
    return result


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionOut:
    return transaction_service.get_transaction(db, current_user.id, transaction_id)


@router.patch("/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionOut:
    result = transaction_service.update_transaction(
        db,
        current_user.id,
        transaction_id,
        payload,
    )
    await rule_engine.evaluate_and_notify(db, current_user)
    return result


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    transaction_service.delete_transaction(db, current_user.id, transaction_id)
    await rule_engine.evaluate_and_notify(db, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
