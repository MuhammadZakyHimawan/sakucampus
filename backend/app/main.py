from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.config import get_settings
from app.database import get_db
from app.modules.telegram.client import get_telegram_client
from app.modules.telegram.poller import TelegramPoller

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    active_settings = get_settings()
    mode = active_settings.effective_telegram_mode
    poller: TelegramPoller | None = None

    if mode == "polling":
        poller = TelegramPoller()
        await poller.start()
    elif mode == "webhook" and active_settings.telegram_webhook_url:
        client = get_telegram_client()
        if client is not None:
            await client.set_webhook(
                active_settings.telegram_webhook_url,
                secret_token=active_settings.telegram_webhook_secret,
            )

    try:
        yield
    finally:
        if poller is not None:
            await poller.stop()


app = FastAPI(
    title="SakuCampus API",
    description="Backend API untuk pencatatan keuangan mahasiswa SakuCampus.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

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
