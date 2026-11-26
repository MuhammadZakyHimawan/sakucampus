import asyncio

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.services.rule_engine import evaluate_and_notify


async def _run() -> None:
    db = SessionLocal()
    try:
        users = db.scalars(select(User)).all()
        total = 0
        for user in users:
            total += len(await evaluate_and_notify(db, user))
        print(f"Rule engine selesai: {total} notifikasi baru untuk {len(users)} pengguna.")
    finally:
        db.close()


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
