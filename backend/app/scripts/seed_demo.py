from __future__ import annotations

import calendar
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import SessionLocal
from app.models import (
    Budget,
    FinanceSettings,
    Goal,
    GoalContribution,
    Notification,
    Transaction,
    User,
)

DEMO_NAME = "Andi Pratama"
DEMO_EMAIL = "andi@example.com"
DEMO_PASSWORD = "demo1234"
DEMO_INITIAL_BALANCE = 1_000_000
DEMO_MIN_BALANCE = 250_000


def _month_bounds(reference: date) -> tuple[date, date]:
    last_day = calendar.monthrange(reference.year, reference.month)[1]
    return reference.replace(day=1), reference.replace(day=last_day)


def _seed_transactions(db: Session, user: User, today: date) -> int:
    existing_count = db.scalar(
        select(func.count(Transaction.id)).where(Transaction.user_id == user.id)
    )
    if existing_count and existing_count > 0:
        return 0

    rows = [
        Transaction(
            user_id=user.id,
            description="Uang saku bulanan dari orang tua",
            amount=2_500_000,
            type="income",
            category="Uang Saku",
            date=today - timedelta(days=20),
            source="manual",
            note="Transfer rutin awal bulan",
        ),
        Transaction(
            user_id=user.id,
            description="Honor asisten praktikum",
            amount=450_000,
            type="income",
            category="Gaji/Part-time",
            date=today - timedelta(days=10),
            source="manual",
        ),
        Transaction(
            user_id=user.id,
            description="Bayar kos bulanan",
            amount=850_000,
            type="expense",
            category="Tagihan",
            date=today - timedelta(days=18),
            source="manual",
            note="Sudah termasuk listrik",
        ),
        Transaction(
            user_id=user.id,
            description="Makan ayam geprek + es teh",
            amount=22_000,
            type="expense",
            category="Kebutuhan Primer",
            date=today - timedelta(days=14),
            source="telegram",
            raw_text="makan ayam geprek 22rb",
            nlp_confidence=0.94,
        ),
        Transaction(
            user_id=user.id,
            description="Belanja kebutuhan dapur & galon",
            amount=185_000,
            type="expense",
            category="Kebutuhan Primer",
            date=today - timedelta(days=12),
            source="manual",
        ),
        Transaction(
            user_id=user.id,
            description="Ngopi bareng teman kampus",
            amount=45_000,
            type="expense",
            category="Gaya Hidup",
            date=today - timedelta(days=9),
            source="telegram",
            raw_text="ngopi 45k",
            nlp_confidence=0.91,
        ),
        Transaction(
            user_id=user.id,
            description="Nonton bioskop & makan malam",
            amount=130_000,
            type="expense",
            category="Gaya Hidup",
            date=today - timedelta(days=6),
            source="manual",
        ),
        Transaction(
            user_id=user.id,
            description="Fotokopi modul & jilid laporan",
            amount=65_000,
            type="expense",
            category="Pendidikan",
            date=today - timedelta(days=5),
            source="telegram",
            raw_text="fotokopi modul 65rb",
            nlp_confidence=0.96,
        ),
        Transaction(
            user_id=user.id,
            description="Isi saldo KRL & ojek online",
            amount=95_000,
            type="expense",
            category="Transportasi",
            date=today - timedelta(days=3),
            source="telegram",
            raw_text="isi krl ojol 95rb",
            nlp_confidence=0.92,
        ),
        Transaction(
            user_id=user.id,
            description="Makan warteg & buah",
            amount=35_000,
            type="expense",
            category="Kebutuhan Primer",
            date=today - timedelta(days=1),
            source="telegram",
            raw_text="warteg 35rb",
            nlp_confidence=0.95,
        ),
        Transaction(
            user_id=user.id,
            description="Pindah dana ke rekening tabungan",
            amount=300_000,
            type="transfer",
            category="Lainnya",
            date=today - timedelta(days=2),
            source="manual",
            note="Transfer internal tidak dihitung sebagai pengeluaran konsumtif",
        ),
    ]
    db.add_all(rows)
    return len(rows)


def _seed_budgets(db: Session, user: User, today: date) -> int:
    existing_count = db.scalar(select(func.count(Budget.id)).where(Budget.user_id == user.id))
    if existing_count and existing_count > 0:
        return 0

    period_start, period_end = _month_bounds(today)
    rows = [
        Budget(
            user_id=user.id,
            category="Kebutuhan Primer",
            limit_amount=900_000,
            period_start=period_start,
            period_end=period_end,
        ),
        Budget(
            user_id=user.id,
            category="Gaya Hidup",
            limit_amount=220_000,
            period_start=period_start,
            period_end=period_end,
        ),
        Budget(
            user_id=user.id,
            category="Transportasi",
            limit_amount=250_000,
            period_start=period_start,
            period_end=period_end,
        ),
        Budget(
            user_id=user.id,
            category="Pendidikan",
            limit_amount=200_000,
            period_start=period_start,
            period_end=period_end,
        ),
    ]
    db.add_all(rows)
    return len(rows)


def _seed_goals(db: Session, user: User, today: date) -> int:
    existing_count = db.scalar(select(func.count(Goal.id)).where(Goal.user_id == user.id))
    if existing_count and existing_count > 0:
        return 0

    emergency_goal = Goal(
        user_id=user.id,
        name="Dana Darurat Semester",
        target_amount=1_500_000,
        deadline=today + timedelta(days=120),
    )
    laptop_goal = Goal(
        user_id=user.id,
        name="Upgrade RAM & SSD Laptop",
        target_amount=1_200_000,
        deadline=today + timedelta(days=90),
    )
    db.add_all([emergency_goal, laptop_goal])
    db.flush()

    db.add_all(
        [
            GoalContribution(
                goal_id=emergency_goal.id,
                amount=500_000,
                note="Sisihan uang saku bulan lalu",
            ),
            GoalContribution(
                goal_id=emergency_goal.id,
                amount=300_000,
                note="Sisihan bulan ini",
            ),
            GoalContribution(
                goal_id=laptop_goal.id,
                amount=450_000,
                note="Dari honor asisten praktikum",
            ),
        ]
    )
    return 2


def _seed_notifications(db: Session, user: User) -> int:
    existing_count = db.scalar(
        select(func.count(Notification.id)).where(Notification.user_id == user.id)
    )
    if existing_count and existing_count > 0:
        return 0

    rows = [
        Notification(
            user_id=user.id,
            type="budget",
            severity="warning",
            rule_code="BUDGET_WARNING",
            title="Anggaran Gaya Hidup mendekati batas",
            message=(
                "Pengeluaran Gaya Hidup sudah mendekati 80% dari batas bulanan. "
                "Yuk atur ritme jajan sampai akhir bulan."
            ),
            link="/budgets",
            is_read=False,
        ),
        Notification(
            user_id=user.id,
            type="goal",
            severity="normal",
            rule_code="GOAL_PROGRESS",
            title="Progres Dana Darurat meningkat",
            message="Bagus! Target Dana Darurat Semester sudah terkumpul lebih dari 50%.",
            link="/goals",
            is_read=False,
        ),
        Notification(
            user_id=user.id,
            type="info",
            severity="normal",
            rule_code="WELCOME_INFO",
            title="Selamat datang di SakuCampus",
            message=(
                "Hubungkan akun Telegram di menu Pengaturan untuk mencatat transaksi "
                "cukup lewat chat."
            ),
            link="/settings/telegram",
            is_read=True,
        ),
    ]
    db.add_all(rows)
    return len(rows)


def seed_demo() -> None:
    today = date.today()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(func.lower(User.email) == DEMO_EMAIL))
        created_user = False

        if user is None:
            user = User(
                name=DEMO_NAME,
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
            db.flush()
            created_user = True

        settings = db.get(FinanceSettings, user.id)
        if settings is None:
            db.add(
                FinanceSettings(
                    user_id=user.id,
                    currency="IDR",
                    initial_balance=DEMO_INITIAL_BALANCE,
                    min_balance=DEMO_MIN_BALANCE,
                    period="30d",
                )
            )

        tx_added = _seed_transactions(db, user, today)
        budget_added = _seed_budgets(db, user, today)
        goal_added = _seed_goals(db, user, today)
        notif_added = _seed_notifications(db, user)
        db.commit()

        status_label = "dibuat" if created_user else "sudah ada"
        print(
            f"Akun demo {status_label}: {DEMO_EMAIL} "
            f"(+{tx_added} transaksi, +{budget_added} anggaran, "
            f"+{goal_added} target, +{notif_added} notifikasi)"
        )


if __name__ == "__main__":
    seed_demo()
