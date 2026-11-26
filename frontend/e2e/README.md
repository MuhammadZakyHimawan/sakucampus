# E2E dan UAT

Playwright menjalankan tiga perjalanan utama terhadap backend dan PostgreSQL lokal sungguhan. Schema yang dipakai selalu `sakucampus_test`, bukan schema produksi.

## Menyiapkan URL database test

Dari folder `backend`:

```powershell
$env:E2E_DATABASE_URL = uv run python -m app.scripts.print_e2e_database_url
```

Nilai tersebut diambil dari `backend/.env`, diberi opsi `options=-csearch_path=sakucampus_test,public`, dan tidak perlu ditulis ke file. Jangan dicetak atau di-commit.

Untuk shell POSIX:

```bash
export E2E_DATABASE_URL=$(uv run python -m app.scripts.print_e2e_database_url)
```

## Menjalankan

Dari folder `frontend`:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

Mode interaktif:

```bash
npm run test:e2e:ui
npm run test:e2e:headed
```

`globalSetup` mereset schema, menjalankan `alembic upgrade head`, lalu Playwright menyalakan backend di `127.0.0.1:8000` dan frontend di `127.0.0.1:5173` menggunakan env test. Jika server sudah berjalan di port tersebut, konfigurasi memakai ulang server yang ada.

## Skenario

| File | Cakupan |
| --- | --- |
| `auth-transactions.spec.ts` | Register, transaksi, dashboard, logout. |
| `budgets-goals-telegram.spec.ts` | Anggaran, target tabungan, kontribusi, notifikasi, Telegram simulasi. |
| `profile-security.spec.ts` | Ubah password, pencabutan sesi, akses terproteksi, login password baru. |

Checklist manual ada di `UAT_CHECKLIST.md`; template hasil ada di `UAT_RESULTS.md`.

## Catatan

- `frontend/.env` untuk E2E harus memakai `VITE_USE_MOCK_API=false`.
- Backend test memakai `ENVIRONMENT=test`, `TELEGRAM_MODE=simulation`, dan CORS `http://127.0.0.1:5173`.
- Reset database gagal secara sengaja jika `ENVIRONMENT` bukan `test` atau URL tidak mengandung `search_path=sakucampus_test`.
- Telegram sungguhan tidak diuji di sini; butuh kredensial bot dan webhook HTTPS terdaftar.
