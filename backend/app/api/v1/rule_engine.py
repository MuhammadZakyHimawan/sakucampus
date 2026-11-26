from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.modules.rule_engine.service import evaluate_user_finances
from app.schemas.notification import NotificationOut
from app.schemas.rule_engine import (
    RuleAlertOut,
    RuleEvaluateRequest,
    RuleEvaluationResponse,
    RuleMetricsOut,
)

router = APIRouter(prefix="/rule-engine", tags=["rule-engine"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/evaluate", response_model=RuleEvaluationResponse)
def evaluate_rules(
    current_user: CurrentUser,
    db: DbSession,
    force_month_end_query: Annotated[bool, Query(alias="forceMonthEnd")] = False,
    payload: Annotated[RuleEvaluateRequest | None, Body()] = None,
) -> RuleEvaluationResponse:
    force_month_end = force_month_end_query or (payload.force_month_end if payload else False)
    persist = payload.persist_notifications if payload is not None else True
    ref_date = payload.reference_date if payload is not None else None

    result = evaluate_user_finances(
        db,
        current_user.id,
        persist_notifications=persist,
        reference_date=ref_date,
        force_month_end=force_month_end,
    )
    m = result.metrics

    return RuleEvaluationResponse(
        financial_status=result.financial_status,
        metrics=RuleMetricsOut(
            reference_date=m.reference_date,
            period_start=m.period_start,
            period_end=m.period_end,
            elapsed_days=m.elapsed_days,
            remaining_days_in_month=m.remaining_days_in_month,
            initial_balance=m.initial_balance,
            min_balance=m.min_balance,
            balance=m.balance,
            period_income=m.period_income,
            period_expense=m.period_expense,
            net_cash_flow=m.net_cash_flow,
            daily_burn_rate=m.daily_burn_rate,
            runway_days=m.runway_days,
            safe_daily_spend=m.safe_daily_spend,
        ),
        alerts=[
            RuleAlertOut(
                rule_code=a.rule_code,
                notification_type=a.notification_type,
                severity=a.severity,
                title=a.title,
                message=a.message,
                dedup_key=a.dedup_key,
                link=a.link,
            )
            for a in result.alerts
        ],
        new_notifications=[NotificationOut.model_validate(n) for n in result.new_notifications],
    )
