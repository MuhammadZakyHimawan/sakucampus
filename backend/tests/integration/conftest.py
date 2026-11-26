import os
import subprocess
import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.constants import ACCESS_TOKEN_COOKIE, CSRF_COOKIE, CSRF_HEADER
from app.database import Base, get_db
from app.main import app
from app.scripts.e2e_database import TEST_SCHEMA, assert_test_schema
from app.scripts.reset_test_database import prepare_schema

TEST_DATABASE_URL = os.environ.get("E2E_DATABASE_URL")

if TEST_DATABASE_URL is None:
    pytest.skip("E2E_DATABASE_URL is required for integration tests", allow_module_level=True)

assert_test_schema(TEST_DATABASE_URL)
BACKEND_DIR = Path(__file__).resolve().parents[2]
engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)
ORIGIN = "http://localhost:5173"


def override_get_db() -> Generator[Session]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def migrate_database() -> Generator[None]:
    prepare_schema(TEST_DATABASE_URL)
    env = os.environ.copy()
    env.update(
        {
            "ENVIRONMENT": "test",
            "DATABASE_URL": TEST_DATABASE_URL,
            "JWT_SECRET": os.environ["JWT_SECRET"],
            "ACCESS_TOKEN_EXPIRE_MINUTES": "60",
        }
    )
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=env,
        check=True,
    )
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def reset_tables(migrate_database: None) -> Generator[None]:
    table_names = ", ".join(
        f'"{TEST_SCHEMA}"."{table.name}"' for table in Base.metadata.sorted_tables
    )

    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE"))

    yield


@pytest.fixture
def client() -> Generator[TestClient]:
    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        if previous is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous


@pytest.fixture
def auth(client: TestClient):
    def _auth(
        email: str = "andi@example.com",
        name: str = "Andi Pratama",
        password: str = "demo1234",
    ) -> dict:
        response = client.post(
            "/api/v1/auth/register",
            json={"name": name, "email": email, "password": password},
        )
        assert response.status_code == 201, response.json()
        body = response.json()
        token = response.cookies.get(ACCESS_TOKEN_COOKIE)
        csrf = response.cookies.get(CSRF_COOKIE)

        assert token is not None
        assert csrf is not None

        return {
            "user": body["user"],
            "token": token,
            "session_headers": {"Origin": ORIGIN, CSRF_HEADER: csrf},
        }

    return _auth
