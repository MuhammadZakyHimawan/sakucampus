# SakuCampus Backend

FastAPI backend untuk SakuCampus. Tahap saat ini mencakup koneksi PostgreSQL, model 7 tabel, migrasi Alembic baseline, dan autentikasi JWT.

## Setup

```bash
uv sync
```

Buat `backend/.env` dari `.env.example`, lalu isi `DATABASE_URL` dan `JWT_SECRET` minimal 32 karakter.

## Database

Database existing yang sudah memiliki skema:

```bash
uv run alembic stamp head
uv run alembic current
```

Database kosong:

```bash
uv run alembic upgrade head
```

## Seed dan server

```bash
uv run python -m app.scripts.seed_demo
uv run uvicorn app.main:app --reload --port 8000
```

Akun demo: `andi@example.com` / `demo1234`.

- Health: `GET /health`
- Docs: `GET /docs`
- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`

## Quality checks

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

Test menggunakan SQLite in-memory dan tidak menyentuh database PostgreSQL utama.
