from app.database import SessionLocal
from app.services.telegram_service import cleanup_processed_updates


def main() -> None:
    db = SessionLocal()
    try:
        removed = cleanup_processed_updates(db)
        print(f"Menghapus {removed} update Telegram lama.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
