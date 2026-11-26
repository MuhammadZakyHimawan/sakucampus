import logging
import secrets
import time
import uuid
from typing import Annotated
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.constants import ACCESS_TOKEN_COOKIE, CSRF_COOKIE, CSRF_HEADER
from app.core.logging_config import configure_logging
from app.database import get_db
from app.services.errors import ResourceConflictError, ResourceNotFoundError

configure_logging()
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="SakuCampus API",
    description="Backend API untuk pencatatan keuangan mahasiswa SakuCampus.",
    version="0.1.0",
)

CSRF_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
CSRF_EXEMPT_PATHS = {
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/telegram/webhook",
}


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "")


def _origin_is_allowed(request: Request) -> bool:
    allowed = settings.cors_origin_set
    origin = request.headers.get("origin")

    if origin is not None:
        return origin.rstrip("/").lower() in allowed

    referer = request.headers.get("referer")
    if referer is None:
        return False

    parsed = urlparse(referer)
    return f"{parsed.scheme}://{parsed.netloc}".lower() in allowed


@app.middleware("http")
async def request_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    request.state.request_id = request_id
    started_at = time.perf_counter()
    response = None

    has_session_cookie = request.cookies.get(ACCESS_TOKEN_COOKIE) is not None

    if (
        request.method.upper() in CSRF_METHODS
        and request.url.path not in CSRF_EXEMPT_PATHS
        and has_session_cookie
    ):
        if not _origin_is_allowed(request):
            response = JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Origin tidak valid"},
            )

        if response is None:
            cookie_token = request.cookies.get(CSRF_COOKIE)
            header_token = request.headers.get(CSRF_HEADER)

            if (
                not cookie_token
                or header_token is None
                or not secrets.compare_digest(cookie_token, header_token)
            ):
                response = JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "Token CSRF tidak valid"},
                )

    if response is None:
        response = await call_next(request)

    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request completed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
        },
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    headers = dict(exc.headers or {})
    headers["X-Request-ID"] = _request_id(request)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.exception_handler(ResourceNotFoundError)
async def resource_not_found_handler(
    request: Request,
    exc: ResourceNotFoundError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)},
        headers={"X-Request-ID": _request_id(request)},
    )


@app.exception_handler(ResourceConflictError)
async def resource_conflict_handler(
    request: Request,
    exc: ResourceConflictError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": str(exc)},
        headers={"X-Request-ID": _request_id(request)},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, _exc: Exception) -> JSONResponse:
    logger.exception(
        "unhandled error",
        extra={"request_id": _request_id(request)},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Terjadi kesalahan pada server", "requestId": _request_id(request)},
        headers={"X-Request-ID": _request_id(request)},
    )


app.include_router(api_router, prefix="/api/v1")


def check_database(db: Session) -> None:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database tidak tersedia",
        ) from exc


@app.get("/health", tags=["health"])
def health(db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    check_database(db)
    return {"status": "ok", "database": "ok"}


@app.get("/health/live", tags=["health"])
def health_live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
def health_ready(db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    check_database(db)
    return {"status": "ok", "database": "ok"}
