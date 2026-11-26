# Hasil UAT SakuCampus

Salin file ini untuk setiap sesi pengujian, lalu isi kolom `Hasil`, `Bukti`, dan `Catatan`.

## Identitas sesi

| Field | Nilai |
| --- | --- |
| Tanggal | 2026-11-26 |
| Versi/build | Lokal, commit belum dibuat |
| Environment | Local Postgres, schema `sakucampus_test` |
| Browser | Chromium 159 (Playwright) |
| Mode API | HTTP (`VITE_USE_MOCK_API=false`) |
| Mode Telegram | Simulation |
| Penguji | Automated baseline |

## Ringkasan otomatis

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Backend unit/integration | `uv run pytest` | Lulus |
| Integration PostgreSQL | `uv run pytest tests/integration -q` | 5 passed |
| Frontend unit | `npm run test` | Lulus |
| Playwright E2E | `npm run test:e2e` | 3 passed |

## Hasil skenario

| ID | Skenario | Metode | Hasil | Bukti | Catatan |
| --- | --- | --- | --- | --- | --- |
| UAT-01 | Auth, transaksi, dashboard, logout | Playwright | Lulus | `auth-transactions.spec.ts` | Dashboard menampilkan badge `Tersinkron`. |
| UAT-02 | Anggaran, goals, kontribusi, notifikasi, Telegram simulasi | Playwright | Lulus | `budgets-goals-telegram.spec.ts` | Linking tanpa kredensial menampilkan pesan bot belum dikonfigurasi. |
| UAT-03 | Ubah password, revoked session, login password baru | Playwright | Lulus | `profile-security.spec.ts` | Rute terproteksi redirect ke `/login` setelah logout. |
| UAT-04 | Edit/hapus transaksi | Manual | Belum diisi |  |  |
| UAT-05 | Edit/hapus/konflik anggaran | Manual | Belum diisi |  |  |
| UAT-06 | Laporan dan periode | Manual | Belum diisi |  |  |
| UAT-07 | Status baca/hapus notifikasi | Manual | Belum diisi |  |  |
| UAT-08 | Rule engine dan dedup | Manual | Belum diisi |  |  |
| UAT-09 | Responsif desktop/mobile | Manual | Belum diisi |  |  |
| UAT-10 | Telegram sungguhan | Manual | Terkunci |  | Menunggu kredensial bot dan webhook HTTPS. |
| UAT-11 | Health dan observability | Manual | Belum diisi |  |  |
| UAT-12 | Origin/CSRF/Bearer | Manual | Belum diisi |  |  |

## Temuan

| ID temuan | Terkait UAT | Severity | Deskripsi | Status | Tindak lanjut |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Kesimpulan

- [ ] Semua skenario wajib lulus.
- [ ] Tidak ada temuan severity tinggi/menengah yang terbuka.
- [ ] Item terkunci sudah mendapat penjadwalan atau dispensasi.

Catatan: jangan menaruh secret database, JWT, atau token Telegram di dokumen ini.
