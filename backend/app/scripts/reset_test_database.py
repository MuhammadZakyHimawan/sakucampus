from sqlalchemy import create_engine, text

from app.config import Environment, get_settings
from app.scripts.e2e_database import TEST_SCHEMA, assert_test_schema


def prepare_schema(database_url: str | None = None) -> None:
    url = database_url or get_settings().database_url
    assert_test_schema(url)
    engine = create_engine(url, isolation_level="AUTOCOMMIT")

    try:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{TEST_SCHEMA}" CASCADE'))
            connection.execute(text(f'CREATE SCHEMA "{TEST_SCHEMA}"'))
            connection.execute(
                text(
                    f'CREATE TABLE "{TEST_SCHEMA}".alembic_version ('
                    "version_num VARCHAR(32) NOT NULL, "
                    "CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
                )
            )
    finally:
        engine.dispose()


def reset_database() -> None:
    settings = get_settings()

    if settings.environment is not Environment.TEST:
        raise RuntimeError("Test database reset requires ENVIRONMENT=test")

    prepare_schema(settings.database_url)
    print("test database reset")


if __name__ == "__main__":
    reset_database()
