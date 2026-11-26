from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.analytics import DashboardSummaryOut, ReportAnalyticsOut
from app.schemas.settings import PeriodPreset
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _validate_date_range(start_date: date | None, end_date: date | None) -> None:
    if (start_date is None) != (end_date is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date dan end_date harus diisi bersama",
        )
    if start_date is not None and end_date is not None and end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tanggal selesai tidak boleh sebelum tanggal mulai",
        )


@router.get("/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(
    current_user: CurrentUser,
    db: DbSession,
    preset: Annotated[PeriodPreset | None, Query()] = None,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
) -> DashboardSummaryOut:
    _validate_date_range(start_date, end_date)
    return analytics_service.build_dashboard_summary(
        db,
        current_user,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/report", response_model=ReportAnalyticsOut)
def get_report_analytics(
    current_user: CurrentUser,
    db: DbSession,
    preset: Annotated[PeriodPreset | None, Query()] = None,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
) -> ReportAnalyticsOut:
    _validate_date_range(start_date, end_date)
    return analytics_service.build_report_analytics(
        db,
        current_user,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )
