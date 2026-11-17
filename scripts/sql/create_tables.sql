-- ============================================================================
-- SakuCampus - Skema Tabel Relasional (SQL Murni untuk DBeaver)
-- ----------------------------------------------------------------------------
-- Prasyarat:
--   - Database "sakucampus" sudah dibuat manual.
--   - Role "sakucampus" sudah dibuat manual.
--   - DBeaver terhubung ke database "sakucampus" sebagai role "sakucampus".
--   - Script dijalankan pada schema "public".
--
-- Script ini hanya berisi DDL. Tidak ada perintah psql seperti
-- \connect, \echo, \set, atau \gexec, dan tidak membuat role/database.
--
-- Cara pakai:	
--   1. Buka file ini di SQL Editor DBeaver.
--   2. Pilih "Execute SQL Script" agar seluruh statement dijalankan.
--   3. Refresh schema public.
--
-- Aman dijalankan berulang:
--   - Tabel/index dibuat dengan IF NOT EXISTS.
--   - Function dibuat ulang dengan CREATE OR REPLACE.
--   - Trigger dibuat ulang tanpa menghapus data.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  email text NOT NULL
    CHECK (char_length(btrim(email)) BETWEEN 3 AND 255),
  password_hash text NOT NULL
    CHECK (char_length(password_hash) > 0),
  avatar_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
  ON public.users (lower(email));

CREATE TABLE IF NOT EXISTS public.finance_settings (
  user_id uuid PRIMARY KEY
    REFERENCES public.users (id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES public.users (id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES public.users (id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES public.users (id) ON DELETE CASCADE,
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  target_amount bigint NOT NULL
    CHECK (target_amount > 0),
  deadline date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL
    REFERENCES public.goals (id) ON DELETE CASCADE,
  amount bigint NOT NULL
    CHECK (amount > 0),
  contributed_at timestamptz NOT NULL DEFAULT now(),
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES public.users (id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('budget', 'balance', 'goal', 'info')),
  title text NOT NULL
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  message text NOT NULL
    CHECK (char_length(btrim(message)) > 0),
  link text NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE
    REFERENCES public.users (id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL UNIQUE
    CHECK (telegram_user_id > 0),
  telegram_username text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES public.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE
    CHECK (char_length(token_hash) = 64),
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_processed_updates (
  update_id bigint PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON public.transactions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS transactions_user_type_date_idx
  ON public.transactions (user_id, type, date DESC);

CREATE INDEX IF NOT EXISTS transactions_user_category_date_idx
  ON public.transactions (user_id, category, date DESC);

CREATE INDEX IF NOT EXISTS budgets_user_period_idx
  ON public.budgets (user_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS goals_user_deadline_idx
  ON public.goals (user_id, deadline);

CREATE INDEX IF NOT EXISTS goal_contributions_goal_date_idx
  ON public.goal_contributions (goal_id, contributed_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS telegram_link_tokens_user_id_idx
  ON public.telegram_link_tokens (user_id);

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS finance_settings_set_updated_at ON public.finance_settings;
CREATE TRIGGER finance_settings_set_updated_at
  BEFORE UPDATE ON public.finance_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS transactions_set_updated_at ON public.transactions;
CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS budgets_set_updated_at ON public.budgets;
CREATE TRIGGER budgets_set_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS goals_set_updated_at ON public.goals;
CREATE TRIGGER goals_set_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS telegram_accounts_set_updated_at ON public.telegram_accounts;
CREATE TRIGGER telegram_accounts_set_updated_at
  BEFORE UPDATE ON public.telegram_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;
