from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.modules.reports.pdf_generator import ReportPeriodPreset, generate_financial_report_pdf

router = APIRouter(prefix="/reports", tags=["reports"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get(
    "/pdf",
    response_class=Response,
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "File laporan keuangan berformat PDF siap cetak.",
        }
    },
)
def download_report_pdf(
    current_user: CurrentUser,
    db: DbSession,
    preset: Annotated[ReportPeriodPreset | None, Query()] = "30d",
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
) -> Response:
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

    pdf_bytes, filename = generate_financial_report_pdf(
        db,
        current_user,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
