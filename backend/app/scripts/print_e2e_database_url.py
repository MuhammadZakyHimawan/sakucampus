from pathlib import Path

from app.config import Settings
from app.scripts.e2e_database import with_test_schema


def main() -> None:
    env_file = Path(__file__).resolve().parents[2] / ".env"
    settings = Settings(_env_file=env_file, _env_file_encoding="utf-8")
    print(with_test_schema(settings.database_url))


if __name__ == "__main__":
    main()
