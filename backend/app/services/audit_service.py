import logging
import uuid
from typing import Any

from fastapi import Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import SecurityEvent

logger = logging.getLogger(__name__)


def _client_ip(request: Request | None) -> str | None:
    if request is None:
        return None

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", maxsplit=1)[0].strip()

    return request.client.host if request.client is not None else None


def log_security_event(
    db: Session,
    event_type: str,
    *,
    outcome: str = "failure",
    user_id: uuid.UUID | None = None,
    request: Request | None = None,
    details: dict[str, Any] | None = None,
) -> SecurityEvent | None:
    event = SecurityEvent(
        user_id=user_id,
        event_type=event_type,
        outcome=outcome,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent") if request is not None else None,
        request_id=getattr(request.state, "request_id", None) if request is not None else None,
        details=details,
    )

    try:
        db.add(event)
        db.commit()
        return event
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Gagal menulis security event %s", event_type)
        return None
