-- ============================================================================
-- SakuCampus - Setup Lengkap Database PostgreSQL
-- ----------------------------------------------------------------------------
-- Script tunggal untuk:
--   1. Membuat role aplikasi "sakucampus".
--   2. Membuat database "sakucampus".
--   3. Membuat seluruh tabel, index, dan trigger.
--
-- Jalankan sebagai superuser "postgres" pada database "postgres":
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
--       -U postgres -h localhost -p 5432 -d postgres `
--       -f "D:\project topsus\scripts\sql\setup_sakucampus.sql"
--
-- Script ini TIDAK menyimpan password. Setelah selesai, atur password role
-- secara terpisah (lihat catatan di akhir file).
--
-- Aman dijalankan berulang:
--   - Role/database tidak dibuat ulang jika sudah ada.
--   - Tabel/index dibuat dengan IF NOT EXISTS.
--   - Trigger dibuat ulang tanpa menghapus data.
--   - Password role yang sudah ada tidak diubah.
-- ============================================================================

\set ON_ERROR_STOP on

\connect postgres

\echo '==> Memeriksa role sakucampus...'

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

    RAISE NOTICE 'Role sakucampus dibuat TANPA password. Atur password secara terpisah (lihat catatan di akhir script).';
  ELSE
    RAISE NOTICE 'Role sakucampus sudah ada. Password tidak diubah.';
  END IF;
END
$$;

\echo '==> Memeriksa database sakucampus...'

SELECT format(
  'CREATE DATABASE %I WITH OWNER = %I ENCODING = %L TEMPLATE = template0',
  'sakucampus',
  'sakucampus',
  'UTF8'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_database
  WHERE datname = 'sakucampus'
)
\gexec

\echo '==> Mengatur kepemilikan dan hak akses database...'

ALTER DATABASE sakucampus OWNER TO sakucampus;
GRANT CONNECT ON DATABASE sakucampus TO sakucampus;

\connect sakucampus

SET ROLE sakucampus;
SET search_path TO public;

BEGIN;

\echo '==> Membuat function updated_at...'

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

\echo '==> Membuat tabel users...'

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  email text NOT NULL
    CHECK (char_length(btrim(email)) BETWEEN 3 AND 255),
  password_hash text NOT NULL
    CHECK (char_length(password_hash) > 0),
  avatar_url text NULL,
  token_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
  ON users (lower(email));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'users'
      AND column_name = 'token_version'
  ) THEN
    ALTER TABLE users ADD COLUMN token_version integer NOT NULL DEFAULT 0;
  END IF;
END $$;

\echo '==> Membuat tabel finance_settings...'

CREATE TABLE IF NOT EXISTS finance_settings (
  user_id uuid PRIMARY KEY
    REFERENCES users (id) ON DELETE CASCADE,
  currency varchar(3) NOT NULL DEFAULT 'IDR'
    CHECK (currency ~ '^[A-Z]{3}$'),
  initial_balance bigint NOT NULL DEFAULT 0
    CHECK (initial_balance >= 0),
  min_balance bigint NOT NULL DEFAULT 0
    CHECK (min_balance >= 0),
  period text NOT NULL DEFAULT '30d'
    CHECK (period IN ('7d', '30d', 'month')),
  notify_budget boolean NOT NULL DEFAULT true,
  notify_balance boolean NOT NULL DEFAULT true,
  notify_goal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

\echo '==> Membuat tabel transactions...'

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES users (id) ON DELETE CASCADE,
  description text NOT NULL
    CHECK (char_length(btrim(description)) BETWEEN 1 AND 500),
  amount bigint NOT NULL
    CHECK (amount > 0),
  type text NOT NULL
    CHECK (type IN ('income', 'expense', 'transfer')),
  category text NOT NULL,
  date date NOT NULL,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'telegram')),
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_category_matches_type CHECK (
    (type = 'expense' AND category IN (
      'Kebutuhan Primer',
      'Gaya Hidup',
      'Pendidikan',
      'Transportasi',
      'Kesehatan',
      'Tagihan',
      'Lainnya'
    ))
    OR
    (type = 'income' AND category IN (
      'Uang Saku',
      'Beasiswa',
      'Gaji/Part-time',
      'Hadiah',
      'Lainnya'
    ))
    OR
    (type = 'transfer' AND category = 'Lainnya')
  )
);

\echo '==> Membuat tabel budgets...'

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES users (id) ON DELETE CASCADE,
  category text NOT NULL
    CHECK (category IN (
      'Kebutuhan Primer',
      'Gaya Hidup',
      'Pendidikan',
      'Transportasi',
      'Kesehatan',
      'Tagihan',
      'Lainnya'
    )),
  limit_amount bigint NOT NULL
    CHECK (limit_amount > 0),
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budgets_period_valid CHECK (period_end >= period_start),
  CONSTRAINT budgets_unique_period UNIQUE (
    user_id,
    category,
    period_start,
    period_end
  )
);

\echo '==> Membuat tabel goals...'

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  target_amount bigint NOT NULL
    CHECK (target_amount > 0),
  deadline date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

\echo '==> Membuat tabel goal_contributions...'

CREATE TABLE IF NOT EXISTS goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL
    REFERENCES goals (id) ON DELETE CASCADE,
  amount bigint NOT NULL
    CHECK (amount > 0),
  contributed_at timestamptz NOT NULL DEFAULT now(),
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

\echo '==> Membuat tabel notifications...'

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES users (id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('budget', 'balance', 'goal', 'info')),
  title text NOT NULL
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  message text NOT NULL
    CHECK (char_length(btrim(message)) > 0),
  link text NULL,
  rule_key text NULL,
  CONSTRAINT notifications_user_rule_key_key UNIQUE (user_id, rule_key),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

\echo '==> Membuat tabel integrasi Telegram...'

CREATE TABLE IF NOT EXISTS telegram_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE
    REFERENCES users (id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL UNIQUE
    CHECK (telegram_user_id > 0),
  telegram_username text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE
    CHECK (char_length(token_hash) = 64),
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_processed_updates (
  update_id bigint PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL
    REFERENCES users (id) ON DELETE SET NULL,
  event_type text NOT NULL
    CHECK (char_length(btrim(event_type)) BETWEEN 1 AND 120),
  outcome text NOT NULL DEFAULT 'failure'
    CHECK (outcome IN ('success', 'failure')),
  ip_address text NULL,
  user_agent text NULL,
  request_id text NULL,
  details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

\echo '==> Membuat indexes...'

CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON transactions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS transactions_user_type_date_idx
  ON transactions (user_id, type, date DESC);

CREATE INDEX IF NOT EXISTS transactions_user_category_date_idx
  ON transactions (user_id, category, date DESC);

CREATE INDEX IF NOT EXISTS budgets_user_period_idx
  ON budgets (user_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS goals_user_deadline_idx
  ON goals (user_id, deadline);

CREATE INDEX IF NOT EXISTS goal_contributions_goal_date_idx
  ON goal_contributions (goal_id, contributed_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS telegram_link_tokens_user_id_idx
  ON telegram_link_tokens (user_id);

CREATE INDEX IF NOT EXISTS security_events_user_id_idx
  ON security_events (user_id);

CREATE INDEX IF NOT EXISTS security_events_event_type_idx
  ON security_events (event_type);

CREATE INDEX IF NOT EXISTS security_events_created_at_idx
  ON security_events (created_at);

\echo '==> Membuat trigger updated_at...'

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS finance_settings_set_updated_at ON finance_settings;
CREATE TRIGGER finance_settings_set_updated_at
  BEFORE UPDATE ON finance_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS transactions_set_updated_at ON transactions;
CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS budgets_set_updated_at ON budgets;
CREATE TRIGGER budgets_set_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS goals_set_updated_at ON goals;
CREATE TRIGGER goals_set_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS telegram_accounts_set_updated_at ON telegram_accounts;
CREATE TRIGGER telegram_accounts_set_updated_at
  BEFORE UPDATE ON telegram_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS security_events_set_updated_at ON security_events;
CREATE TRIGGER security_events_set_updated_at
  BEFORE UPDATE ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;

RESET ROLE;

\echo '==> Verifikasi role dan database...'

SELECT
  rolname,
  rolcanlogin AS can_login,
  rolsuper AS is_superuser
FROM pg_roles
WHERE rolname = 'sakucampus';

SELECT
  datname AS database_name,
  pg_get_userbyid(datdba) AS owner,
  pg_encoding_to_char(encoding) AS encoding
FROM pg_database
WHERE datname = 'sakucampus';

\echo '==> Verifikasi tabel...'

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'finance_settings',
    'transactions',
    'budgets',
    'goals',
    'goal_contributions',
    'notifications',
    'telegram_accounts',
    'telegram_link_tokens',
    'telegram_processed_updates'
  )
ORDER BY table_name;

\echo '==> Verifikasi foreign key...'

SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND contype = 'f'
ORDER BY conrelid::regclass::text, conname;

\echo '==> Verifikasi index...'

SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'finance_settings',
    'transactions',
    'budgets',
    'goals',
    'goal_contributions',
    'notifications',
    'telegram_accounts',
    'telegram_link_tokens',
    'telegram_processed_updates'
  )
ORDER BY tablename, indexname;

\echo ''
\echo '=== SELESAI: role, database, dan skema tabel SakuCampus sudah siap. ==='
\echo ''
\echo 'LANGKAH WAJIB BERIKUTNYA:'
\echo '  1. Atur password role sakucampus (contoh perintah ada di blok CATATAN di akhir file).'
\echo '  2. Uji koneksi sebagai role sakucampus setelah password diatur.'
\echo '  3. Simpan DATABASE_URL hanya di backend/.env (pastikan .env masuk .gitignore).'
\echo ''

-- ============================================================================
-- CATATAN KEAMANAN DAN LANGKAH MANUAL
-- ----------------------------------------------------------------------------
-- Atur password role (jalankan terpisah, ganti PASSWORD_KUAT_ANDA):
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -d postgres -c "ALTER ROLE sakucampus WITH PASSWORD 'PASSWORD_KUAT_ANDA';"
--
-- Uji koneksi sebagai role aplikasi:
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U sakucampus -h localhost -p 5432 -d sakucampus -c "SELECT current_user, current_database();"
--
-- Simpan hanya di backend/.env (gitignored):
--   DATABASE_URL=postgresql+psycopg2://sakucampus:PASSWORD_ANDA@localhost:5432/sakucampus
--
-- - Script ini sengaja tidak menetapkan password agar tidak ada secret di repo.
-- - Ganti PASSWORD_KUAT_ANDA dengan password acak yang kuat.
-- - Jangan pernah commit file .env atau password ke Git.
-- - Untuk production, gunakan role dengan hak minimum dan secret manager.
-- ============================================================================
