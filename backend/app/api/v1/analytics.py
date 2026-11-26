from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.analytics import (
    CashflowPointOut,
    CategoryTotalOut,
    DashboardDataOut,
    DashboardSummaryOut,
    PeriodPreset,
    ReportDataOut,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/dashboard", response_model=DashboardDataOut)
def get_dashboard(
    current_user: CurrentUser,
    db: DbSession,
    preset: PeriodPreset = "30d",
    reference: date | None = None,
) -> DashboardDataOut:
    return analytics_service.build_dashboard_data(
        db,
        current_user,
        preset,
        reference=reference,
    )


@router.get("/report", response_model=ReportDataOut)
def get_report(
    current_user: CurrentUser,
    db: DbSession,
    preset: PeriodPreset = "30d",
    reference: date | None = None,
) -> ReportDataOut:
    return analytics_service.build_report_data(
        db,
        current_user,
        preset,
        reference=reference,
    )


@router.get("/summary", response_model=DashboardSummaryOut)
def get_summary(
    current_user: CurrentUser,
    db: DbSession,
    preset: PeriodPreset = "30d",
    reference: date | None = None,
) -> DashboardSummaryOut:
    return analytics_service.build_dashboard_data(
        db,
        current_user,
        preset,
        reference=reference,
    ).summary


@router.get("/expenses", response_model=list[CategoryTotalOut])
def get_expenses(
    current_user: CurrentUser,
    db: DbSession,
    preset: PeriodPreset = "30d",
    reference: date | None = None,
) -> list[CategoryTotalOut]:
    return analytics_service.build_dashboard_data(
        db,
        current_user,
        preset,
        reference=reference,
    ).categories


@router.get("/trends", response_model=list[CashflowPointOut])
def get_trends(
    current_user: CurrentUser,
    db: DbSession,
    preset: PeriodPreset = "30d",
    reference: date | None = None,
) -> list[CashflowPointOut]:
    return analytics_service.build_dashboard_data(
        db,
        current_user,
        preset,
        reference=reference,
    ).cashflow
