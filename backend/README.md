# SakuCampus Backend

FastAPI backend untuk SakuCampus. Mencakup koneksi PostgreSQL, 10 model tabel, 3 revisi Alembic, autentikasi JWT, API domain transaksi/anggaran/goals/notifikasi/pengaturan, integrasi Telegram (linking + webhook + parser chat), dan seed data demo.

## Setup

```bash
uv sync
```

Buat `backend/.env` dari `.env.example`, lalu isi `DATABASE_URL` dan `JWT_SECRET` minimal 32 karakter. Variabel Telegram kosong boleh dibiarkan; saat itu status Telegram dilaporkan sebagai `simulated: true`.

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

Rantai migrasi: `0518f1183ace` (baseline 7 tabel) → `b4110c205d93` (tabel Telegram) → `d4f6a8b2c0e1` (`telegram_processed_updates`).

## Seed dan server

```bash
uv run python -m app.scripts.seed_demo
uv run uvicorn app.main:app --reload --port 8000
```

Akun demo: `andi@example.com` / `demo1234`. Seed juga mengisi transaksi, anggaran, goals + kontribusi, dan notifikasi demo secara idempoten.

- Health: `GET /health`
- Docs: `GET /docs`
- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET/PATCH /api/v1/auth/me`, `POST /api/v1/auth/change-password`, `POST /api/v1/auth/logout`
- Transaksi: `GET/POST /api/v1/transactions`, `GET/PATCH/DELETE /api/v1/transactions/{id}`
- Anggaran: `GET/POST /api/v1/budgets`, `PATCH/DELETE /api/v1/budgets/{id}`
- Goals: `GET/POST /api/v1/goals`, `GET/PATCH/DELETE /api/v1/goals/{id}`, `POST /api/v1/goals/{id}/contributions`
- Notifikasi: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/{id}/read`, `PATCH /api/v1/notifications/read-all`, `DELETE /api/v1/notifications/{id}`
- Pengaturan: `GET/PATCH /api/v1/settings/finance`
- Telegram: `GET /api/v1/telegram/status`, `POST /api/v1/telegram/link-token`, `DELETE /api/v1/telegram/unlink`, `POST /api/v1/telegram/webhook`

Semua endpoint domain membutuhkan Bearer token dan hanya mengembalikan data milik user yang login (kecuali webhook Telegram, yang diamankan dengan secret).

## Telegram

Variabel di `.env.example`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_LINK_TOKEN_MINUTES=15`. Tanpa token/username bot, link token tetap dibuat tetapi `deepLink` bernilai `null` dan `simulated: true`.

Alur: frontend meminta `POST /telegram/link-token` → backend menyimpan hash SHA-256 token acak sekali pakai → user menekan deep link `https://t.me/<bot>?start=<token>` → webhook memvalidasi secret, memasangkan Telegram user ID, dan membalas konfirmasi. Webhook menolak update dengan `update_id` yang sudah diproses agar retry Telegram tidak menggandakan transaksi.

Parser regex di `app/services/telegram_parser.py` mengenali format seperti `makan ayam 20rb`, `beli kopi 15 ribu`, `bayar kos 750000`, `uang saku 500rb`, dan `beasiswa 1,5jt`. Pesan dengan lebih dari satu nominal atau kata kunci `transfer` ditolak dengan balasan berisi contoh format. Transaksi tersimpan dengan `source="telegram"`.

Sebelum produksi: daftarkan URL webhook HTTPS ke BotFather/Telegram API dengan secret yang sama, lalu uji deep link dan pencatatan dari chat sungguhan.

## Quality checks

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

Test menggunakan SQLite in-memory dan tidak menyentuh database PostgreSQL utama. Cakupan test mencakup auth, profil/password, CRUD domain, isolasi data antar-user, konflik anggaran, agregasi goals, notifikasi, settings, parser regex, linking/webhook Telegram, secret webhook, dan idempotensi update.
