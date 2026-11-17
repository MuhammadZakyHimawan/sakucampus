from calendar import monthrange
from datetime import UTC, date, datetime, time, timedelta

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

TRANSACTIONS: list[tuple[str, int, str, str, int, str]] = [
    ("Uang saku bulanan", 2_500_000, "income", "Uang Saku", 0, "manual"),
    ("Beasiswa prestasi", 750_000, "income", "Beasiswa", 18, "manual"),
    ("Gaji part-time", 450_000, "income", "Gaji/Part-time", 9, "manual"),
    ("Hadiah ulang tahun", 150_000, "income", "Hadiah", 24, "manual"),
    ("Kos bulanan", 600_000, "expense", "Kebutuhan Primer", 4, "manual"),
    ("Belanja bulanan", 380_000, "expense", "Kebutuhan Primer", 5, "telegram"),
    ("Makan siang kampus", 25_000, "expense", "Kebutuhan Primer", 1, "telegram"),
    ("Makan malam", 35_000, "expense", "Kebutuhan Primer", 0, "telegram"),
    ("Kopi", 22_000, "expense", "Gaya Hidup", 0, "telegram"),
    ("Nonton bioskop", 50_000, "expense", "Gaya Hidup", 2, "manual"),
    ("Langganan streaming", 54_000, "expense", "Gaya Hidup", 6, "manual"),
    ("Nongkrong", 120_000, "expense", "Gaya Hidup", 2, "manual"),
    ("Jajan", 30_000, "expense", "Gaya Hidup", 3, "telegram"),
    ("Ojek online", 18_000, "expense", "Transportasi", 0, "telegram"),
    ("Bensin", 60_000, "expense", "Transportasi", 3, "manual"),
    ("KRL", 15_000, "expense", "Transportasi", 1, "telegram"),
    ("Ojek online", 25_000, "expense", "Transportasi", 2, "telegram"),
    ("Servis motor", 180_000, "expense", "Transportasi", 4, "manual"),
    ("Buku referensi", 120_000, "expense", "Pendidikan", 7, "manual"),
    ("Print tugas", 15_000, "expense", "Pendidikan", 1, "manual"),
    ("Seminar karier", 75_000, "expense", "Pendidikan", 2, "manual"),
    ("Kursus online", 199_000, "expense", "Pendidikan", 9, "manual"),
    ("Vitamin", 45_000, "expense", "Kesehatan", 12, "manual"),
    ("Obat flu", 28_000, "expense", "Kesehatan", 2, "manual"),
    ("Paket data", 75_000, "expense", "Tagihan", 3, "manual"),
    ("Internet kos", 150_000, "expense", "Tagihan", 5, "manual"),
    ("Listrik", 85_000, "expense", "Tagihan", 6, "manual"),
    ("Donasi kampus", 50_000, "expense", "Lainnya", 1, "manual"),
    ("Hadiah ulang tahun teman", 100_000, "expense", "Lainnya", 11, "manual"),
    ("Ojek online", 30_000, "expense", "Transportasi", 8, "telegram"),
    ("Kopi", 20_000, "expense", "Gaya Hidup", 8, "telegram"),
    ("Makan malam", 40_000, "expense", "Kebutuhan Primer", 10, "telegram"),
    ("Servis motor", 150_000, "expense", "Transportasi", 8, "manual"),
    ("Donasi", 50_000, "expense", "Lainnya", 9, "manual"),
]

BUDGETS: list[tuple[str, int]] = [
    ("Kebutuhan Primer", 1_500_000),
    ("Gaya Hidup", 300_000),
    ("Transportasi", 250_000),
    ("Pendidikan", 600_000),
    ("Kesehatan", 200_000),
    ("Tagihan", 300_000),
]

GOALS: list[tuple[str, int, int, int]] = [
    ("Dana Darurat", 5_000_000, 2_100_000, 90),
    ("Laptop Kuliah", 8_000_000, 3_200_000, 150),
    ("Biaya Kuliah Semester Depan", 4_000_000, 1_000_000, 60),
    ("Liburan Semester", 1_500_000, 1_500_000, 30),
]

NOTIFICATIONS: list[tuple[str, str, str, str, int, bool]] = [
    (
        "budget",
        "Anggaran Transportasi terlampaui",
        "Pengeluaran transportasi sudah melewati batas bulan ini. Coba alokasikan "
        "ulang pengeluaran berikutnya agar tetap nyaman.",
        "/budgets",
        0,
        False,
    ),
    (
        "budget",
        "Gaya Hidup hampir mencapai batas",
        "Sisa anggaran Gaya Hidup tinggal sedikit. Pertimbangkan menunda pengeluaran "
        "non-prioritas sampai awal bulan berikutnya.",
        "/budgets",
        1,
        False,
    ),
    (
        "goal",
        "Target Dana Darurat berkembang",
        "Kamu sudah menyisihkan 42% dari target Dana Darurat. Sedikit demi sedikit, "
        "kebiasaan ini akan terasa hasilnya.",
        "/goals",
        2,
        False,
    ),
    (
        "balance",
        "Saldo masih berada di atas batas minimum",
        "Saldo kamu masih aman. Tetap pantau pengeluaran harian agar tidak turun di "
        "bawah batas minimum yang kamu tetapkan.",
        "/settings/finance",
        3,
        True,
    ),
    (
        "info",
        "Catat transaksi lebih cepat lewat Telegram",
        "Hubungkan Telegram untuk mencatat pengeluaran hanya dengan mengirim pesan. "
        "Fitur ini masih berupa simulasi pada versi demo.",
        "/settings/telegram",
        4,
        True,
    ),
    (
        "goal",
        "Target Liburan Semester tercapai",
        "Selamat! Target Liburan Semester sudah terkumpul penuh. Kamu bisa membuat "
        "target baru untuk tujuan berikutnya.",
        "/goals",
        5,
        True,
    ),
]


def _days_ago(days: int) -> date:
    return date.today() - timedelta(days=days)


def _month_range() -> tuple[date, date]:
    today = date.today()
    last_day = monthrange(today.year, today.month)[1]

    return date(today.year, today.month, 1), date(today.year, today.month, last_day)


def _count_for_user(db: Session, model: type, user_id: object) -> int:
    return int(
        db.scalar(select(func.count()).select_from(model).where(model.user_id == user_id)) or 0
    )


def _seed_transactions(db: Session, user: User) -> None:
    if _count_for_user(db, Transaction, user.id) > 0:
        return

    for description, amount, transaction_type, category, days_ago, source in TRANSACTIONS:
        db.add(
            Transaction(
                user_id=user.id,
                description=description,
                amount=amount,
                type=transaction_type,
                category=category,
                date=_days_ago(days_ago),
                source=source,
            )
        )


def _seed_budgets(db: Session, user: User) -> None:
    if _count_for_user(db, Budget, user.id) > 0:
        return

    period_start, period_end = _month_range()

    for category, limit in BUDGETS:
        db.add(
            Budget(
                user_id=user.id,
                category=category,
                limit_amount=limit,
                period_start=period_start,
                period_end=period_end,
            )
        )


def _seed_goals(db: Session, user: User) -> None:
    if _count_for_user(db, Goal, user.id) > 0:
        return

    for name, target_amount, saved_amount, days_ahead in GOALS:
        goal = Goal(
            user_id=user.id,
            name=name,
            target_amount=target_amount,
            deadline=date.today() + timedelta(days=days_ahead),
        )
        db.add(goal)
        db.flush()
        db.add(
            GoalContribution(
                goal_id=goal.id,
                amount=saved_amount,
                note="Kontribusi awal data demo",
            )
        )


def _seed_notifications(db: Session, user: User) -> None:
    if _count_for_user(db, Notification, user.id) > 0:
        return

    for notification_type, title, message, link, days_ago, is_read in NOTIFICATIONS:
        db.add(
            Notification(
                user_id=user.id,
                type=notification_type,
                title=title,
                message=message,
                link=link,
                is_read=is_read,
                created_at=datetime.combine(
                    _days_ago(days_ago),
                    time(hour=9),
                    tzinfo=UTC,
                ),
            )
        )


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
            print(f"Akun demo dibuat: {DEMO_EMAIL}")
        else:
            print(f"Akun demo sudah ada: {DEMO_EMAIL}")

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
            print(f"Finance settings demo dibuat untuk: {DEMO_EMAIL}")

        _seed_transactions(db, user)
        _seed_budgets(db, user)
        _seed_goals(db, user)
        _seed_notifications(db, user)
        db.commit()

        print("Data domain demo siap digunakan.")


if __name__ == "__main__":
    seed_demo()
