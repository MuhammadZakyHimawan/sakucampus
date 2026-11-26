from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.models import User
from app.modules.nlp.service import load_nlp_metrics, parse_transaction_text
from app.schemas.nlp import NlpMetricsResponse, NlpParseRequest, NlpParseResponse

router = APIRouter(prefix="/nlp", tags=["nlp"])

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/parse", response_model=NlpParseResponse)
def parse_text(
    payload: NlpParseRequest,
    _current_user: CurrentUser,
) -> NlpParseResponse:
    parsed = parse_transaction_text(payload.text)
    return NlpParseResponse(
        raw_text=parsed.raw_text,
        amount=parsed.amount,
        type=parsed.type,
        category=parsed.category,
        description=parsed.description,
        confidence=parsed.confidence,
        needs_confirmation=parsed.needs_confirmation,
        model_name=parsed.model_name,
    )


@router.get("/metrics", response_model=NlpMetricsResponse)
def get_metrics(_current_user: CurrentUser) -> NlpMetricsResponse:
    metrics = load_nlp_metrics()
    if metrics is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact metrik NLP belum tersedia. Jalankan skrip training terlebih dahulu.",
        )
    return NlpMetricsResponse.model_validate(metrics)
