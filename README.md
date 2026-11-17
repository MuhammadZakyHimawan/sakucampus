# SakuCampus

SakuCampus adalah konsultan keuangan proaktif untuk mahasiswa: mencatat transaksi semudah chatting, lalu memantau kondisi keuangan tanpa perhitungan manual.

Repositori ini berisi **website frontend MVP** (React + Vite + TypeScript) dan **backend FastAPI** dengan autentikasi JWT serta API domain (transaksi, anggaran, goals, notifikasi, pengaturan). PostgreSQL sudah disiapkan dengan 10 tabel, role aplikasi, dan migrasi Alembic. Frontend dapat berjalan dengan mock atau terhubung ke backend melalui `VITE_USE_MOCK_API`. Backend Telegram sudah mendukung linking via one-time token, webhook, dan pencatatan transaksi dari chat dengan parser regex; NLP dan Rule Engine belum diimplementasikan.

Spesifikasi utama proyek: [`SAKUCAMPUS_MASTER_SPEC.md`](./SAKUCAMPUS_MASTER_SPEC.md).

## Status tahap

- Tahap 0–7 frontend selesai: audit, fondasi, layout/routing, halaman publik, dashboard, transaksi/anggaran, goals/reports/notifikasi/pengaturan, responsive, dan QA.
- Tahap database selesai: PostgreSQL, 10 tabel, foreign key, trigger `updated_at`, role aplikasi, dan 3 revisi Alembic.
- Tahap backend autentikasi selesai: FastAPI, register/login/me/logout, JWT Bearer, seed akun demo, dan test.
- Tahap backend API domain selesai: transaksi, anggaran, goals + kontribusi, notifikasi, pengaturan keuangan, update profil, dan ubah password.
- Tahap integrasi frontend selesai: login/register JWT, token Bearer, CRUD domain HTTP, dan fallback mock lewat `VITE_USE_MOCK_API`.
- Tahap Telegram selesai di backend: status/linking token sekali pakai, webhook + secret, parser regex chat, idempotensi `update_id`, dan 3 endpoint frontend yang terhubung ke API. Aktivasi bot sungguhan menunggu kredensial.
- Tahap berikutnya: kredensial + registrasi webhook bot, dataset NLP, Rule Engine, notifikasi otomatis, integration/E2E test, dan hardening sesi.

## Prasyarat

- Node.js 20+ (Vite 6 membutuhkan Node 18+)
- npm 10+
- Python 3.13+
- `uv` 0.11+
- PostgreSQL 18+ dengan database dan role `sakucampus`

## Menjalankan frontend

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Menjalankan backend

```bash
cd backend
uv sync
```

Salin `backend/.env.example` menjadi `backend/.env` untuk instalasi baru, lalu isi:

```env
DATABASE_URL=postgresql+psycopg2://sakucampus:PASSWORD@localhost:5432/sakucampus
JWT_SECRET=MINIMAL_32_KARAKTER_ACAK
```

`backend/.env` dan seluruh file `.env` sudah di-ignore oleh Git. Jangan commit password database atau JWT secret.

Untuk database yang sudah berisi skema (kondisi saat ini):

```bash
uv run alembic stamp head
uv run alembic current
```

Untuk database kosong, jalankan migrasi baseline:

```bash
uv run alembic upgrade head
```

Seed akun demo, lalu jalankan server:

```bash
uv run python -m app.scripts.seed_demo
uv run uvicorn app.main:app --reload --port 8000
```

- Health check: `http://localhost:8000/health`
- Dokumentasi OpenAPI: `http://localhost:8000/docs`
- API prefix: `http://localhost:8000/api/v1`

Endpoint yang tersedia:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Registrasi dan langsung mendapat token |
| POST | `/api/v1/auth/login` | Login dengan email dan password |
| GET | `/api/v1/auth/me` | Profil user dari Bearer token |
| PATCH | `/api/v1/auth/me` | Update nama, email, dan avatar |
| POST | `/api/v1/auth/change-password` | Ubah password akun |
| POST | `/api/v1/auth/logout` | Logout stateless (client membuang token) |
| GET/POST | `/api/v1/transactions` | Daftar dan buat transaksi |
| GET/PATCH/DELETE | `/api/v1/transactions/{id}` | Detail, ubah, dan hapus transaksi |
| GET/POST | `/api/v1/budgets` | Daftar dan buat anggaran |
| PATCH/DELETE | `/api/v1/budgets/{id}` | Ubah dan hapus anggaran |
| GET/POST | `/api/v1/goals` | Daftar dan buat target tabungan |
| PATCH/DELETE | `/api/v1/goals/{id}` | Ubah dan hapus target |
| POST | `/api/v1/goals/{id}/contributions` | Tambah kontribusi target |
| GET | `/api/v1/notifications` | Daftar notifikasi |
| PATCH | `/api/v1/notifications/{id}/read` | Tandai satu notifikasi dibaca |
| PATCH | `/api/v1/notifications/read-all` | Tandai semua notifikasi dibaca |
| DELETE | `/api/v1/notifications/{id}` | Hapus notifikasi |
| GET/PATCH | `/api/v1/settings/finance` | Baca dan ubah pengaturan keuangan |
| GET | `/api/v1/telegram/status` | Status koneksi Telegram user aktif |
| POST | `/api/v1/telegram/link-token` | Buat one-time link token + deep link bot |
| DELETE | `/api/v1/telegram/unlink` | Putuskan koneksi Telegram |
| POST | `/api/v1/telegram/webhook` | Terima update bot (butuh secret + kredensial) |
| GET | `/health` | Status API dan koneksi database |

### Akun demo frontend & backend

| Field    | Nilai            |
| -------- | ---------------- |
| Email    | `andi@example.com` |
| Password | `demo1234`       |

Kredensial yang sama dipakai oleh mock frontend dan seed backend. Backend memakai password bcrypt dan JWT. Pada mode mock, halaman login menyediakan tombol "Isi otomatis"; pada mode HTTP, gunakan akun hasil seed atau registrasi.

## Script frontend

Dijalankan dari folder `frontend`:

| Perintah            | Kegunaan                                      |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Menjalankan development server (port 5173)    |
| `npm run build`     | Typecheck + build production ke `dist/`       |
| `npm run preview`   | Pratinjau hasil build                         |
| `npm run lint`      | ESLint seluruh proyek                         |
| `npm run typecheck` | TypeScript `--noEmit`                         |
| `npm run test`      | Menjalankan unit test (Vitest)                |
| `npm run test:watch`| Unit test mode watch                          |

## Script backend

Dijalankan dari folder `backend`:

| Perintah | Kegunaan |
| --- | --- |
| `uv sync` | Memasang dependency sesuai `uv.lock` |
| `uv run uvicorn app.main:app --reload --port 8000` | Menjalankan API development |
| `uv run pytest` | Menjalankan test |
| `uv run ruff check .` | Lint |
| `uv run ruff format --check .` | Cek format |
| `uv run alembic current` | Melihat revisi migrasi aktif |
| `uv run alembic upgrade head` | Menerapkan migrasi pada database kosong |
| `uv run alembic stamp head` | Menandai database existing sebagai sudah baseline |
| `uv run python -m app.scripts.seed_demo` | Membuat akun demo idempoten |

## Halaman & routing

### Public

| Route             | Halaman         |
| ----------------- | --------------- |
| `/`               | Landing page    |
| `/login`          | Login           |
| `/register`       | Register        |
| `/forgot-password`| Forgot password |

### Student (butuh login)

| Route                 | Halaman              |
| --------------------- | -------------------- |
| `/dashboard`          | Dashboard            |
| `/transactions`       | Transaksi (CRUD)     |
| `/budgets`            | Anggaran             |
| `/goals`              | Target tabungan      |
| `/reports`            | Laporan              |
| `/notifications`      | Notifikasi           |
| `/education`          | Edukasi finansial    |
| `/settings/profile`   | Profil               |
| `/settings/telegram`  | Integrasi Telegram   |
| `/settings/finance`   | Pengaturan keuangan  |

Route student dilindungi `ProtectedRoute`; pengguna tanpa sesi diarahkan ke `/login`.

## Mode mock dan mode backend

Salin `frontend/.env.example` menjadi `frontend/.env`, lalu pilih salah satu mode:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_USE_MOCK_API=true
```

- `VITE_USE_MOCK_API=true` (default): seluruh data domain memakai mock dan `localStorage`. Cocok untuk demo tanpa database.
- `VITE_USE_MOCK_API=false`: login/register, profil, password, transaksi, anggaran, goals, notifikasi, dan pengaturan keuangan memakai backend. Token JWT disimpan di `localStorage` dan dikirim sebagai Bearer token.
- Setelah mengubah `.env`, restart `npm run dev` (atau build ulang).
- Education dan simulasi Telegram tetap statis pada kedua mode.
- Pada mode backend, jalankan seed agar akun dan data demo tersedia.

## Data demo & penyimpanan

- Mode mock menandai UI sebagai **Data demo**; mode backend menampilkan badge **Tersinkron**.
- Pada mode mock, transaksi, anggaran, goals, notifikasi, preferensi, dan status Telegram disimpan di `localStorage`.
- Dataset mock transaksi & anggaran di-seed ulang otomatis setiap bulan agar periode demo tetap relevan.
- Untuk mereset data mock: hapus seluruh data situs (Application → Local Storage) di browser, lalu muat ulang halaman.
- Saldo dihitung dari `initialBalance + total income - total expense` (lihat `src/utils/calculations.ts`), baik dari mock maupun data backend.
- Mock data terpusat di `src/mocks/`, diakses melalui lapisan service di `src/services/` yang memilih mock atau HTTP.

## Status integrasi

| Fitur                | Mode mock                                   | Mode backend                                      |
| -------------------- | ------------------------------------------- | ------------------------------------------------- |
| Autentikasi          | Simulasi akun demo                          | JWT Bearer + bcrypt                               |
| Profil & password    | Perubahan sesi di `localStorage`            | `PATCH /auth/me` dan `POST /auth/change-password` |
| Transaksi & anggaran | Mock service + `localStorage`               | CRUD API dengan scoping per user                  |
| Goals                | Mock + progres lokal                        | CRUD + endpoint kontribusi                        |
| Notifikasi           | Mock + status baca lokal                    | List/baca/hapus dari API                          |
| Pengaturan keuangan  | Preferensi lokal                            | `GET/PATCH /settings/finance`                     |
| Dashboard & laporan  | Dihitung client-side dari dataset aktif      | Dihitung client-side dari data API                |
| Telegram             | Simulasi lokal (`localStorage`)              | Status/linking/unlink via API; webhook + parser chat aktif setelah bot dikonfigurasi |
| Education            | Konten statis                               | Tetap statis                                      |

### Mode Telegram

- Tanpa kredensial bot, backend mengembalikan `simulated: true`; frontend menampilkan label **Simulasi** dan tidak membuat tautan palsu. Mode mock tetap bisa dipakai untuk demo lokal.
- Isi `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`, dan `TELEGRAM_LINK_TOKEN_MINUTES` di `backend/.env` (semua sudah ada di `.env.example`). Jangan commit nilai ini.
- Daftarkan webhook ke Telegram setelah URL HTTPS publik tersedia, dengan header `X-Telegram-Bot-Api-Secret-Token` yang sama dengan `TELEGRAM_WEBHOOK_SECRET`.
- Format chat yang dikenali parser regex: `makan ayam 20rb`, `beli kopi 15 ribu`, `bayar kos 750000`, `uang saku 500rb`, `beasiswa 1,5jt`. Satu pesan = satu transaksi; transfer belum didukung.
- Transaksi hasil chat tersimpan dengan `source: "telegram"` dan ditandai **Telegram** pada daftar transaksi. `update_id` webhook dicatat agar retry Telegram tidak membuat duplikat.

Catatan keamanan: mode backend menyimpan token JWT di `localStorage` untuk kebutuhan MVP. Untuk production, pertimbangkan cookie `HttpOnly` dan mekanisme refresh/revocation.

## Struktur folder

```text
backend/
├── app/
│   ├── api/v1/        # Router auth, transaksi, anggaran, goals, notifikasi, settings
│   ├── core/          # Security, dependency, JWT, kategori
│   ├── models/        # 10 model SQLAlchemy
│   ├── schemas/       # Pydantic schema camelCase
│   ├── scripts/       # Seed akun + data domain demo
│   ├── services/      # Auth, transaksi, anggaran, goals, notifikasi, settings
│   ├── config.py
│   ├── database.py
│   └── main.py
├── migrations/        # 3 revisi Alembic (baseline, Telegram, idempotensi)
├── tests/
├── alembic.ini
└── pyproject.toml

frontend/
├── public/
├── src/
│   ├── app/          # App, router, providers
│   ├── components/   # UI, layout, charts, feedback
│   ├── features/     # auth, dashboard, transactions, budgets, goals,
│   │                 # reports, notifications, education, profile, telegram,
│   │                 # finance, landing
│   ├── hooks/        # FinanceDataProvider + context
│   ├── layouts/      # PublicLayout, AppLayout
│   ├── lib/          # config, constants, kategori, navigasi, util kecil
│   ├── mocks/        # data demo terpusat
│   ├── services/     # mock service + api-client
│   ├── styles/       # design tokens & global styles
│   ├── types/        # tipe domain
│   └── utils/        # perhitungan, format mata uang/tanggal, CSV
└── package.json
```

## Asumsi

- Mata uang MVP: IDR dengan format `Rp1.250.000`.
- Ambang status anggaran: 75% (Waspada) dan 100% (Melebihi), dapat diubah di `src/lib/config.ts`.
- Periode default dashboard: 30 hari.
- Saldo awal akun demo: Rp1.000.000; batas saldo minimum: Rp250.000.
- Transfer internal tidak dihitung sebagai pengeluaran konsumtif atau pemasukan baru.
- Konten Edukasi bersifat statis dan ditandai sebagai contoh.
- Mode mock frontend, penyimpanan `localStorage`, dan simulasi Telegram **bukan** untuk production.
- Logout backend bersifat stateless; token tetap valid sampai kedaluwarsa (24 jam).
- Token disimpan di `localStorage`; belum ada refresh token atau revocation server-side.
- Dashboard dan laporan tetap dihitung di client dari transaksi/anggaran yang dimuat dari API.
- Tanggal transaksi chat mengikuti tanggal server backend (UTC), bukan timezone Telegram user.
- Kategori chat dipilih dari peta keyword deterministik; untuk teks yang tidak dikenali, kategorinya `Lainnya` dan pesan gagal diberi contoh format.

## Verifikasi kualitas

Frontend:

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

Backend:

```bash
cd backend
uv run ruff check .
uv run ruff format --check .
uv run pytest
uv run alembic current
```

Unit test frontend mencakup perhitungan keuangan, periode, format/serialisasi, service transaksi/anggaran/goals/settings/analytics/telegram (mode mock dan HTTP), komponen loading, api-client, serta smoke test rute dan proteksi login. Test backend mencakup health, auth (register/login/token/`/me`/logout/profil/password), CRUD transaksi, anggaran + konflik periode, goals + kontribusi, notifikasi, pengaturan keuangan, scoping antar-user, validasi input, parser regex chat, linking/webhook Telegram, dan idempotensi `update_id`.

## Pekerjaan berikutnya

1. Isi kredensial bot + daftarkan webhook, lalu uji deep link dan pencatatan transaksi sungguhan.
2. Dataset transaksi mahasiswa, training NLP, dan Rule Engine (pengganti/lanjutan parser regex).
3. Generator notifikasi otomatis dari anggaran/saldo/target, termasuk pengiriman ke Telegram.
4. Integration test frontend–backend dan user acceptance test (E2E).
5. Hardening keamanan sesi (refresh token/revocation) dan deployment.
