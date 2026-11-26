# Deployment SakuCampus (VPS + Nginx)

Stack produksi memakai Docker Compose: PostgreSQL, backend FastAPI, frontend statis, Nginx reverse proxy, dan Certbot untuk TLS Let's Encrypt.

## Prasyarat VPS

- Ubuntu 22.04/24.04 atau distro serupa.
- Docker Engine + Docker Compose plugin.
- DNS `A`/`AAAA` untuk `DOMAIN` dan `www.DOMAIN` mengarah ke VPS.
- Port 80 dan 443 terbuka.
- Git clone proyek di VPS, misalnya di `/srv/sakucampus`.

## Konfigurasi

```bash
cp deploy/.env.example deploy/.env
nano deploy/.env
```

Isi values berikut:

- `DOMAIN`: domain tanpa `www`, misalnya `sakucampus.example.com`.
- `ADMIN_EMAIL`: email untuk notifikasi Let's Encrypt.
- `POSTGRES_PASSWORD`: `openssl rand -hex 24`.
- `JWT_SECRET`: `openssl rand -hex 32` (minimal 32 karakter).
- `CORS_ORIGINS`: origin HTTPS untuk domain dan `www`.
- `TELEGRAM_*`: opsional untuk bot, tetapi `TELEGRAM_WEBHOOK_SECRET` wajib minimal 16 karakter karena `ENVIRONMENT=production` melakukan fail-fast. Jika bot belum dipakai, isi secret acak terlebih dahulu; link token tetap berjalan dalam mode simulasi tanpa token bot.

Gunakan password database berbasis hex agar aman untuk URL `DATABASE_URL`.

## Pasang sertifikat dan deploy

```bash
bash deploy/scripts/init-cert.sh
bash deploy/scripts/deploy.sh
```

`init-cert.sh` membuat sertifikat via webroot dan mengganti konfigurasi Bootstrap dengan konfigurasi HTTPS. `deploy.sh` membangun image, menjalankan seluruh service, dan menjalankan `alembic upgrade head` otomatis lewat command backend.

Cek:

```bash
curl -fsS https://DOMAIN/health/ready
docker compose --env-file deploy/.env -f deploy/docker-compose.yml ps
```

## Telegram

Setelah HTTPS aktif dan kredensial bot terisi:

```bash
bash deploy/scripts/set-telegram-webhook.sh
```

Script mendaftarkan `https://DOMAIN/api/v1/telegram/webhook` dengan `secret_token` dari `TELEGRAM_WEBHOOK_SECRET`.

## Seed dan rule engine

Seed demo tidak dijalankan otomatis. Jalankan hanya jika dibutuhkan:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml \
  exec backend python -m app.scripts.seed_demo
```

Evaluasi rule engine untuk semua user bisa dijalankan manual atau lewat cron:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.yml \
  exec backend python -m app.scripts.run_rule_engine
```

## Backup dan restore

Backup database:

```bash
bash deploy/scripts/backup.sh
```

File tersimpan di `deploy/backups/sakucampus-<timestamp>.dump`.

Restore:

```bash
bash deploy/scripts/restore.sh deploy/backups/sakucampus-<timestamp>.dump
```

Restore akan berhenti jika konfirmasi bukan `RESTORE`.

## Update aplikasi

```bash
git pull
bash deploy/scripts/deploy.sh
```

## Catatan operasional

- Sesi frontend memakai cookie `HttpOnly`; backend mengeluarkan cookie `Secure` karena `ENVIRONMENT=production`. Access token berlaku 60 menit dan memakai `token_version`; logout/ubah password mencabut sesi lama, sehingga user perlu login ulang setelah deploy pertama.
- Mutasi API dari browser mengirim header `X-CSRF-Token` dari cookie CSRF yang bisa dibaca JavaScript; backend juga memvalidasi `Origin`/`Referer` terhadap `CORS_ORIGINS`.
- Bearer token masih diterima backend untuk keperluan API/testing dan lebih prioritas daripada cookie jika keduanya ada, tetapi tidak dipakai frontend produksi.
- Setiap respons menyertakan `X-Request-ID`; log backend JSON dan tabel `security_events` menyimpan audit autentikasi serta kegagalan secret webhook.
- Backend hanya menerima `Host` yang diturunkan dari `CORS_ORIGINS`; pastikan `DOMAIN` dan `CORS_ORIGINS` konsisten.
- Nginx mematikan `server_tokens`, menolak server default, membatasi request API/auth/webhook dengan status 429, dan menambahkan header keamanan termasuk CSP report-only.
- Certbot memperbarui sertifikat tiap 12 jam; container Nginx mendeteksi perubahan sertifikat dan reload otomatis dalam maksimal 5 menit.
- `deploy/.env` dan `deploy/backups/` tidak boleh di-commit.
