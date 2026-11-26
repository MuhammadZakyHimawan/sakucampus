# SakuCampus

SakuCampus adalah konsultan keuangan proaktif untuk mahasiswa: mencatat transaksi semudah chatting, lalu memantau kondisi keuangan tanpa perhitungan manual.

Repositori ini berisi **website frontend MVP** (React + Vite + TypeScript) dan **backend FastAPI** dengan autentikasi JWT. PostgreSQL sudah disiapkan dengan 7 tabel, role aplikasi, dan baseline Alembic. Frontend masih memakai mock untuk data domain sampai tahap integrasi; Telegram Bot, NLP, dan Rule Engine belum diimplementasikan.

Spesifikasi utama proyek: [`SAKUCAMPUS_MASTER_SPEC.md`](./SAKUCAMPUS_MASTER_SPEC.md).

## Status tahap

- Tahap 0–7 frontend selesai: audit, fondasi, layout/routing, halaman publik, dashboard, transaksi/anggaran, goals/reports/notifikasi/pengaturan, responsive, dan QA.
- Tahap database selesai: PostgreSQL, 7 tabel, 6 foreign key, trigger `updated_at`, role aplikasi, dan baseline Alembic.
- Tahap backend autentikasi selesai: FastAPI, register/login/me/logout, JWT Bearer, seed akun demo, dan test.
- Tahap berikutnya: API domain (transaksi, anggaran, dashboard, goals, notifikasi), integrasi frontend, Telegram, NLP, dan Rule Engine.

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

Endpoint autentikasi yang tersedia:

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Registrasi dan langsung mendapat token |
| POST | `/api/v1/auth/login` | Login dengan email dan password |
| GET | `/api/v1/auth/me` | Profil user dari Bearer token |
| POST | `/api/v1/auth/logout` | Logout stateless (client membuang token) |
| GET | `/health` | Status API dan koneksi database |

### Akun demo frontend & backend

| Field    | Nilai            |
| -------- | ---------------- |
| Email    | `andi@example.com` |
| Password | `demo1234`       |

Kredensial yang sama dipakai oleh mock frontend dan seed backend. Autentikasi frontend masih simulasi; backend sudah memakai password bcrypt dan JWT. Halaman login frontend menyediakan tombol "Isi otomatis".

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

## Data demo & penyimpanan

- Semua angka adalah **data contoh** dan ditandai di UI sebagai data demo.
- Data transaksi, anggaran, goals, notifikasi, preferensi, dan status Telegram disimpan di `localStorage` agar interaksi bertahan selama sesi/browser.
- Dataset transaksi & anggaran di-seed ulang otomatis setiap bulan agar periode demo tetap relevan.
- Untuk mereset data demo: hapus seluruh data situs (Application → Local Storage) di browser, lalu muat ulang halaman.
- Saldo dihitung dari `initialBalance + total income - total expense` (lihat `src/utils/calculations.ts`).
- Mock data terpusat di `src/mocks/`, diakses melalui lapisan service di `src/services/`.

## Integrasi yang masih simulasi

| Fitur                | Kondisi saat ini                                                        |
| -------------------- | ----------------------------------------------------------------------- |
| Autentikasi          | Backend JWT siap di `/api/v1/auth/*`; frontend masih mock                |
| Transaksi & anggaran | Mock service + localStorage, validasi dan CRUD berfungsi                |
| Dashboard & laporan  | Dihitung dari dataset mock yang sama                                    |
| Notifikasi           | Data mock + status baca/tandai di localStorage                          |
| Telegram             | Simulasi hubungkan/putuskan; tidak ada bot atau webhook nyata           |
| Ubah password        | Simulasi; kredensial demo tidak berubah                                 |
| Backend/API          | FastAPI auth + health tersedia; API domain belum                        |

## Persiapan integrasi backend

- Salin `frontend/.env.example` menjadi `frontend/.env` bila ingin mengatur variabel.
- `VITE_API_BASE_URL` — base URL API (default `http://localhost:8000/api/v1`).
- `VITE_USE_MOCK_API` — `true` (default) memakai mock service; `false` disiapkan untuk integrasi HTTP.
- Helper HTTP bertipe tersedia di `frontend/src/services/api-client.ts` (`apiRequest`, `ApiError`).
- Backend auth sudah dapat dipanggil di `http://localhost:8000/api/v1/auth/*`.
- Service domain saat ini masih mock; penggantian ke HTTP dapat dilakukan tanpa mengubah komponen karena kontrak fungsi dan tipe data sudah dipisahkan.

## Struktur folder

```text
backend/
├── app/
│   ├── api/v1/        # Router auth dan health
│   ├── core/          # Security, dependency, JWT
│   ├── models/        # 7 model SQLAlchemy
│   ├── schemas/       # Pydantic schema camelCase
│   ├── scripts/       # Seed demo
│   ├── services/      # Auth service
│   ├── config.py
│   ├── database.py
│   └── main.py
├── migrations/        # Baseline Alembic
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
- Mock auth frontend, penyimpanan localStorage, dan simulasi Telegram **bukan** untuk production.
- Logout backend bersifat stateless; token tetap valid sampai kedaluwarsa (24 jam).
- Endpoint domain masih memakai mock frontend; integrasi HTTP dikerjakan setelah API domain tersedia.

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

Unit test frontend mencakup perhitungan keuangan, periode, format/serialisasi, service transaksi/anggaran/goals/settings/analytics, komponen loading, api-client, serta smoke test rute dan proteksi login. Test backend mencakup health, register, login, token expiry, `/me`, logout, duplikasi email, validasi input, dan hashing password.

## Pekerjaan berikutnya

1. API transaksi, anggaran, dashboard, goals, dan notifikasi.
2. Integrasi frontend ke API menggunakan `api-client.ts`.
3. Telegram Bot, webhook, dan one-time link token.
4. Dataset transaksi mahasiswa, training NLP, dan Rule Engine.
5. Integration test dan user acceptance test.
