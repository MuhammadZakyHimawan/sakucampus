from collections.abc import Callable, Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

_session_factory: Callable[[], Session] = SessionLocal


class Base(DeclarativeBase):
    pass


def get_session_factory() -> Callable[[], Session]:
    return _session_factory


def set_session_factory(factory: Callable[[], Session]) -> None:
    global _session_factory
    _session_factory = factory


def get_db() -> Generator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
