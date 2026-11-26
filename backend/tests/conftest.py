import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret-with-at-least-thirty-two-characters"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["TELEGRAM_MODE"] = "disabled"
os.environ["TELEGRAM_BOT_TOKEN"] = ""
os.environ["TELEGRAM_BOT_USERNAME"] = "SakuCampusTestBot"
os.environ["TELEGRAM_WEBHOOK_SECRET"] = ""

from app import models  # noqa: E402, F401
from app.database import Base, get_db, set_session_factory  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.telegram.client import set_telegram_client_override  # noqa: E402

test_engine = create_engine(
    "sqlite+pysqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def override_get_db() -> Generator[Session]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
set_session_factory(TestingSessionLocal)


@pytest.fixture(autouse=True)
def reset_database() -> Generator[None]:
    set_telegram_client_override(None)
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    set_telegram_client_override(None)


@pytest.fixture
def client() -> Generator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session() -> Generator[Session]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
