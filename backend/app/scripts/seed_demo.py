from sqlalchemy import func, select

from app.core.security import hash_password
from app.database import SessionLocal
from app.models import FinanceSettings, User

DEMO_NAME = "Andi Pratama"
DEMO_EMAIL = "andi@example.com"
DEMO_PASSWORD = "demo1234"
DEMO_INITIAL_BALANCE = 1_000_000
DEMO_MIN_BALANCE = 250_000


def seed_demo() -> None:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(func.lower(User.email) == DEMO_EMAIL))

        if user is None:
            user = User(
                name=DEMO_NAME,
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
            db.flush()
            db.add(
                FinanceSettings(
                    user_id=user.id,
                    currency="IDR",
                    initial_balance=DEMO_INITIAL_BALANCE,
                    min_balance=DEMO_MIN_BALANCE,
                )
            )
            db.commit()
            print(f"Akun demo dibuat: {DEMO_EMAIL}")
            return

        settings = db.get(FinanceSettings, user.id)
        if settings is None:
            db.add(
                FinanceSettings(
                    user_id=user.id,
                    currency="IDR",
                    initial_balance=DEMO_INITIAL_BALANCE,
                    min_balance=DEMO_MIN_BALANCE,
                )
            )
            db.commit()
            print(f"Finance settings demo dibuat untuk: {DEMO_EMAIL}")
            return

        print(f"Akun demo sudah ada: {DEMO_EMAIL}")


if __name__ == "__main__":
    seed_demo()
