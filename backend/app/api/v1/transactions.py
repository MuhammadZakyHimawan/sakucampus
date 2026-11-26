from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.categories import TransactionSource, TransactionType
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.modules.telegram.notifier import dispatch_notifications_to_telegram
from app.schemas.settings import PeriodPreset
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate
from app.services import transaction_service
from app.services.errors import ResourceNotFoundError, ValidationDomainError

router = APIRouter(prefix="/transactions", tags=["transactions"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    current_user: CurrentUser,
    db: DbSession,
    type: Annotated[TransactionType | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    source: Annotated[TransactionSource | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
    preset: Annotated[PeriodPreset | None, Query()] = None,
) -> list[TransactionOut]:
    if start_date is not None and end_date is not None and end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tanggal selesai tidak boleh sebelum tanggal mulai",
        )

    items = transaction_service.list_transactions(
        db,
        current_user.id,
        tx_type=type,
        category=category,
        source=source,
        search=search,
        start_date=start_date,
        end_date=end_date,
        preset=preset,
    )
    return [TransactionOut.model_validate(item) for item in items]


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionOut:
    item, eval_res = transaction_service.create_transaction_with_evaluation(
        db,
        current_user.id,
        payload,
    )
    if eval_res.new_notifications:
        background_tasks.add_task(
            dispatch_notifications_to_telegram,
            current_user.id,
            [n.id for n in eval_res.new_notifications],
        )
    return TransactionOut.model_validate(item)


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionOut:
    try:
        item = transaction_service.get_transaction(db, current_user.id, transaction_id)
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return TransactionOut.model_validate(item)


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: uuid.UUID,
    payload: TransactionUpdate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionOut:
    try:
        item, eval_res = transaction_service.update_transaction_with_evaluation(
            db,
            current_user.id,
            transaction_id,
            payload,
        )
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationDomainError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if eval_res.new_notifications:
        background_tasks.add_task(
            dispatch_notifications_to_telegram,
            current_user.id,
            [n.id for n in eval_res.new_notifications],
        )
    return TransactionOut.model_validate(item)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DbSession,
) -> Response:
    try:
        eval_res = transaction_service.delete_transaction_with_evaluation(
            db,
            current_user.id,
            transaction_id,
        )
    except ResourceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if eval_res.new_notifications:
        background_tasks.add_task(
            dispatch_notifications_to_telegram,
            current_user.id,
            [n.id for n in eval_res.new_notifications],
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
