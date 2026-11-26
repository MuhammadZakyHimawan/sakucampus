# SakuCampus Backend

FastAPI backend untuk SakuCampus. Mencakup koneksi PostgreSQL, 11 model tabel, 5 revisi Alembic, autentikasi JWT pada cookie HttpOnly + CSRF + token version, API domain transaksi/anggaran/goals/notifikasi/pengaturan/analytics, Rule Engine notifikasi otomatis, integrasi Telegram (linking + webhook + parser chat), audit event, JSON logging, dan seed data demo.

## Setup

```bash
uv sync
```

Buat `backend/.env` dari `.env.example`, lalu isi `DATABASE_URL` dan `JWT_SECRET` minimal 32 karakter. `ENVIRONMENT=production` melakukan fail-fast jika secret masih placeholder, CORS bukan HTTPS, `ALLOW_INSECURE_TELEGRAM_WEBHOOK=true`, atau `TELEGRAM_WEBHOOK_SECRET` kurang dari 16 karakter. Akses token berlaku 60 menit dan bisa diatur lewat `ACCESS_TOKEN_EXPIRE_MINUTES`. Variabel Telegram kosong boleh dibiarkan di pengembangan; saat itu status Telegram `simulated: true`.

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

Alembic adalah sumber kebenaran skema. Script SQL di `scripts/sql/` hanya dipakai untuk bootstrap role dan database.

Rantai migrasi: `0518f1183ace` (baseline 7 tabel) → `b4110c205d93` (tabel Telegram) → `d4f6a8b2c0e1` (`telegram_processed_updates`) → `f3a1b2c4d5e6` (`notifications.rule_key`) → `a7c9e1b2d3f4` (`users.token_version` + `security_events`).

## Seed dan server

```bash
uv run python -m app.scripts.seed_demo
uv run uvicorn app.main:app --reload --port 8000
```

Akun demo: `andi@example.com` / `demo1234`. Seed juga mengisi transaksi, anggaran, goals + kontribusi, dan notifikasi demo secara idempoten.

- Health: `GET /health`, `GET /health/live`, `GET /health/ready`
- Docs: `GET /docs`
- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET/PATCH /api/v1/auth/me`, `POST /api/v1/auth/change-password`, `POST /api/v1/auth/logout`
- Transaksi: `GET/POST /api/v1/transactions`, `GET/PATCH/DELETE /api/v1/transactions/{id}`
- Anggaran: `GET/POST /api/v1/budgets`, `PATCH/DELETE /api/v1/budgets/{id}`
- Goals: `GET/POST /api/v1/goals`, `GET/PATCH/DELETE /api/v1/goals/{id}`, `POST /api/v1/goals/{id}/contributions`
- Notifikasi: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/{id}/read`, `PATCH /api/v1/notifications/read-all`, `DELETE /api/v1/notifications/{id}`
- Pengaturan: `GET/PATCH /api/v1/settings/finance`
- Analytics: `GET /api/v1/analytics/dashboard`, `/report`, `/summary`, `/expenses`, `/trends` (query `preset=7d|30d|month`, opsional `reference=YYYY-MM-DD`)
- Telegram: `GET /api/v1/telegram/status`, `POST /api/v1/telegram/link-token`, `DELETE /api/v1/telegram/unlink`, `POST /api/v1/telegram/webhook`

Semua endpoint domain membutuhkan cookie sesi atau Bearer token dan hanya mengembalikan data milik user yang login (kecuali webhook Telegram, yang diamankan dengan secret). Jika header `Authorization: Bearer` ada, header itu lebih prioritas daripada cookie. Permintaan mutasi dengan cookie sesi harus menyertakan `Origin`/`Referer` yang terdaftar di `CORS_ORIGINS` dan header `X-CSRF-Token` yang cocok dengan cookie CSRF. Logout dan ubah password menaikkan `users.token_version` sehingga token lama langsung tidak valid; ubah password mengeluarkan sesi baru. Setiap respons menyertakan `X-Request-ID`, dan log aplikasi berformat JSON.

## Telegram

Variabel di `.env.example`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_LINK_TOKEN_MINUTES=15`, `ALLOW_INSECURE_TELEGRAM_WEBHOOK=false`. Tanpa token/username bot, link token tetap dibuat tetapi `deepLink` bernilai `null` dan `simulated: true`. Webhook selalu menolak request tanpa secret kecuali mode tidak aman sengaja diaktifkan untuk pengembangan lokal.

Alur: frontend meminta `POST /telegram/link-token` → backend menyimpan hash SHA-256 token acak sekali pakai → user menekan deep link `https://t.me/<bot>?start=<token>` → webhook memvalidasi secret dan payload Pydantic, memasangkan Telegram user ID, dan membalas konfirmasi. Klaim `update_id` dilakukan dengan insert atomik agar retry Telegram tidak menggandakan transaksi; klaim dilepas jika pemrosesan gagal. Pengiriman balasan diretry hingga 3 kali. Bersihkan klaim lama dengan `uv run python -m app.scripts.cleanup_telegram_updates`.

Parser regex di `app/services/telegram_parser.py` mengenali format seperti `makan ayam 20rb`, `beli kopi 15 ribu`, `bayar kos 750000`, `uang saku 500rb`, dan `beasiswa 1,5jt`. Pesan dengan lebih dari satu nominal atau kata kunci `transfer` ditolak dengan balasan berisi contoh format. Transaksi tersimpan dengan `source="telegram"`.

Sebelum produksi: daftarkan URL webhook HTTPS ke BotFather/Telegram API dengan secret yang sama, lalu uji deep link dan pencatatan dari chat sungguhan. Pada deployment Compose, jalankan `bash deploy/scripts/set-telegram-webhook.sh` setelah sertifikat TLS aktif.

## Analytics dan Rule Engine

Endpoint `/api/v1/analytics/*` menghitung saldo, arus kas, kategori pengeluaran, status anggaran, insight, ringkasan laporan, dan perbandingan periode dari data user yang login. Frontend memakai endpoint ini saat `VITE_USE_MOCK_API=false`.

Rule Engine berjalan otomatis setelah transaksi, anggaran, atau goals berubah, serta bisa dijalankan terjadwal dengan `uv run python -m app.scripts.run_rule_engine`. Aturan yang aktif:

- `notifyBudget`: peringatan saat anggaran mencapai 75% atau 100%.
- `notifyBalance`: peringatan harian saat saldo di bawah `minBalance`.
- `notifyGoal`: milestone 60%, 80%, dan 100% pada target tabungan.

Notifikasi dibuat dengan `rule_key` unik per user agar tidak duplikat; eskalasi anggaran dari Waspada ke Melebihi tetap memicu notifikasi baru. Jika user sudah menghubungkan Telegram, notifikasi juga dikirim ke chat Telegram tersebut.

## Deployment

Image backend dibangun dari `backend/Dockerfile` dengan `uv sync --frozen --no-dev`. Compose produksi menjalankan `alembic upgrade head` sebelum Uvicorn, menggunakan `ENVIRONMENT=production` agar cookie session ber-flag `Secure`, dan menghubungkan API ke PostgreSQL melalui service `db`.

Lihat [`../deploy/README.md`](../deploy/README.md) untuk VPS + Nginx + Certbot, backup/restore, dan pendaftaran webhook Telegram.

## Quality checks

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

Test unit menggunakan SQLite in-memory dan tidak menyentuh database PostgreSQL utama. Cakupan test mencakup config fail-fast, auth + token version + CSRF/Origin + audit, profil/password, CRUD domain, isolasi data antar-user, konflik anggaran, agregasi goals, notifikasi, analytics, rule engine + dedup + flag, settings, batas nominal schema, health/request ID, parser regex, linking/webhook Telegram, secret webhook, dan idempotensi update.

## Integration test PostgreSQL

Integration test memakai database yang sama dengan `DATABASE_URL`, tetapi mengisolasi seluruh objek di schema `sakucampus_test`. Script berhenti jika `ENVIRONMENT` bukan `test` atau URL tidak memuat `options=-csearch_path=sakucampus_test,public`.

```powershell
$env:E2E_DATABASE_URL = uv run python -m app.scripts.print_e2e_database_url
uv run pytest tests/integration -q
```

Jika perlu reset manual:

```bash
uv run python -m app.scripts.reset_test_database
```

`reset_test_database` menjatuhkan dan membuat ulang schema test, membuat tabel `alembic_version` di schema tersebut, lalu menjalankan `alembic upgrade head` dengan `search_path` yang benar. Migrasi lama yang memakai objek `public.*` sudah disesuaikan agar mengikuti `search_path`.
