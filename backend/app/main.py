from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.config import get_settings
from app.database import get_db
from app.services.errors import ResourceConflictError, ResourceNotFoundError

settings = get_settings()

app = FastAPI(
    title="SakuCampus API",
    description="Backend API untuk pencatatan keuangan mahasiswa SakuCampus.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ResourceNotFoundError)
async def resource_not_found_handler(
    _request: Request,
    exc: ResourceNotFoundError,
) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(exc)})


@app.exception_handler(ResourceConflictError)
async def resource_conflict_handler(
    _request: Request,
    exc: ResourceConflictError,
) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": str(exc)})


app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
def health(db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database tidak tersedia",
        ) from exc

    return {"status": "ok", "database": "ok"}
