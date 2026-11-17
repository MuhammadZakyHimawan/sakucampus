-- ============================================================================
-- SakuCampus - Assign Role Aplikasi dan Ownership
-- ----------------------------------------------------------------------------
-- Gunakan script ini jika role/database/tabel sudah dibuat manual sebagai
-- "postgres", lalu aplikasi akan memakai role "sakucampus".
--
-- Prasyarat:
--   - Database "sakucampus" dan tabelnya sudah ada.
--   - Jalankan sebagai superuser "postgres".
--
-- Cara pakai di DBeaver:
--   1. Connect ke database "sakucampus" sebagai "postgres".
--   2. Buka file ini di SQL Editor.
--   3. Pilih "Execute SQL Script".
--
-- Script ini tidak menetapkan password. Atur password role secara terpisah
-- setelah script selesai (lihat catatan di akhir file).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = 'sakucampus'
  ) THEN
    CREATE ROLE sakucampus
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION;

    RAISE NOTICE 'Role sakucampus dibuat TANPA password.';
  ELSE
    RAISE NOTICE 'Role sakucampus sudah ada. Password tidak diubah.';
  END IF;
END
$$;

ALTER DATABASE sakucampus OWNER TO sakucampus;

ALTER TABLE public.users OWNER TO sakucampus;
ALTER TABLE public.finance_settings OWNER TO sakucampus;
ALTER TABLE public.transactions OWNER TO sakucampus;
ALTER TABLE public.budgets OWNER TO sakucampus;
ALTER TABLE public.goals OWNER TO sakucampus;
ALTER TABLE public.goal_contributions OWNER TO sakucampus;
ALTER TABLE public.notifications OWNER TO sakucampus;
ALTER TABLE public.telegram_accounts OWNER TO sakucampus;
ALTER TABLE public.telegram_link_tokens OWNER TO sakucampus;
ALTER TABLE public.telegram_processed_updates OWNER TO sakucampus;

ALTER FUNCTION public.set_updated_at() OWNER TO sakucampus;

GRANT CONNECT ON DATABASE sakucampus TO sakucampus;
GRANT USAGE, CREATE ON SCHEMA public TO sakucampus;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sakucampus;

SELECT
  rolname,
  rolcanlogin AS can_login,
  rolsuper AS is_superuser
FROM pg_roles
WHERE rolname = 'sakucampus';

SELECT
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT
  datname AS database_name,
  pg_get_userbyid(datdba) AS owner
FROM pg_database
WHERE datname = 'sakucampus';

SELECT
  proname AS function_name,
  pg_get_userbyid(proowner) AS owner
FROM pg_proc
WHERE oid = 'public.set_updated_at()'::regprocedure;

-- ============================================================================
-- CATATAN KEAMANAN DAN LANGKAH MANUAL
-- ----------------------------------------------------------------------------
-- Atur password role (jalankan terpisah, ganti PASSWORD_KUAT_ANDA):
--   ALTER ROLE sakucampus WITH PASSWORD 'PASSWORD_KUAT_ANDA';
--
-- Uji koneksi sebagai role aplikasi:
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U sakucampus -h localhost -p 5432 -d sakucampus -c "SELECT current_user, current_database();"
--
-- Simpan hanya di backend/.env (gitignored):
--   DATABASE_URL=postgresql+psycopg2://sakucampus:PASSWORD_ANDA@localhost:5432/sakucampus
--
-- - Jangan commit password atau file .env ke Git.
-- ============================================================================
