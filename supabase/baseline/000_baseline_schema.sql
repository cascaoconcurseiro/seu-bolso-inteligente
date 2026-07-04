-- ============================================================================
-- BASELINE DO SCHEMA — Seu Bolso Inteligente
-- Gerado do catálogo de PRODUÇÃO (vrrcagukyfnlhxuvnssp) em 04/07/2026 via MCP.
--
-- POR QUE EXISTE: as tabelas base foram criadas via Dashboard e não têm
-- CREATE TABLE em nenhuma migration (TECHNICAL_DEBT.md). Este arquivo permite
-- recriar um banco do zero: aplicar este baseline PRIMEIRO e depois replay
-- de supabase/migrations/ (que contém funções, RLS, índices e triggers).
--
-- NÃO está em supabase/migrations/ de propósito: nunca deve ser aplicado por
-- `db push` num banco existente. Uso manual em banco VAZIO apenas.
-- Escopo: ENUMs, tabelas (colunas/PK/UNIQUE/CHECK) e FKs.
-- ============================================================================

-- ─── ENUMS ───────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE public.account_type AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'EMERGENCY_FUND', 'GLOBAL_ACCOUNT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.family_role AS ENUM ('admin', 'editor', 'viewer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.split_method AS ENUM ('EQUAL', 'PERCENTAGE', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sync_status AS ENUM ('SYNCED', 'PENDING', 'ERROR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.transaction_domain AS ENUM ('PERSONAL', 'SHARED', 'TRAVEL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.transaction_type AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'WITHDRAWAL', 'DEPOSIT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.trip_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TABELAS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text DEFAULT 'Usuário'::text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  avatar_color text DEFAULT 'green'::text,
  avatar_icon text DEFAULT 'avatar_1'::text,
  use_subcategories boolean DEFAULT false,
  month_start_day integer DEFAULT 1,
  base_currency text DEFAULT 'BRL'::text,
  require_pin_on_open boolean DEFAULT false,
  monthly_budget numeric DEFAULT 0,
  shared_expenses_behavior text DEFAULT 'CYCLE'::text,
  shared_closing_day integer,
  shared_due_day integer,
  global_cdi_rate numeric DEFAULT 11.15,
  shared_sync_credit_card_id uuid,
  shared_credit_card_behavior text DEFAULT 'CARD_CYCLE'::text,
  default_account_id uuid,
  default_credit_card_id uuid,
  low_balance_threshold numeric,
  monthly_report_enabled boolean NOT NULL DEFAULT true,
  app_pin_hash text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type account_type NOT NULL DEFAULT 'CHECKING'::account_type,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  bank_id text,
  bank_color text,
  bank_logo text,
  currency text NOT NULL DEFAULT 'BRL'::text,
  is_active boolean NOT NULL DEFAULT true,
  closing_day integer,
  due_day integer,
  credit_limit numeric(15,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_international boolean DEFAULT false,
  initial_balance numeric(15,2) DEFAULT 0,
  hide_balance boolean DEFAULT false,
  yield_rate numeric,
  yield_type text,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  is_archived boolean DEFAULT false,
  closing_day_mode text DEFAULT 'FIXED_DAY'::text,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT chk_credit_limit_non_negative CHECK (((credit_limit IS NULL) OR (credit_limit >= (0)::numeric))),
  CONSTRAINT valid_closing_day_mode CHECK ((closing_day_mode = ANY (ARRAY['FIXED_DAY'::text, 'LAST_DAY'::text, 'LAST_BUSINESS_DAY'::text])))
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text,
  type text NOT NULL DEFAULT 'expense'::text,
  color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  parent_category_id uuid,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  is_archived boolean DEFAULT false,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT chk_no_self_reference CHECK ((id <> parent_category_id)),
  CONSTRAINT unique_user_category UNIQUE NULLS NOT DISTINCT (user_id, name, type, parent_category_id)
);

CREATE TABLE IF NOT EXISTS public.families (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Minha Família'::text,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  CONSTRAINT families_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  email text,
  role family_role NOT NULL DEFAULT 'viewer'::family_role,
  status text NOT NULL DEFAULT 'pending'::text,
  invited_by uuid,
  linked_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  avatar_url text,
  sharing_scope text DEFAULT 'all'::text,
  scope_start_date date,
  scope_end_date date,
  scope_trip_id uuid,
  removed_at timestamp with time zone,
  removed_by uuid,
  removal_reason text,
  avatar_color text,
  avatar_icon text,
  member_type text NOT NULL DEFAULT 'family'::text,
  active_in_form boolean NOT NULL DEFAULT false,
  CONSTRAINT family_members_family_id_email_key UNIQUE (family_id, email),
  CONSTRAINT family_members_member_type_check CHECK ((member_type = ANY (ARRAY['family'::text, 'contact'::text]))),
  CONSTRAINT family_members_pkey PRIMARY KEY (id),
  CONSTRAINT family_members_role_check CHECK ((role = ANY (ARRAY['admin'::family_role, 'editor'::family_role, 'viewer'::family_role]))),
  CONSTRAINT family_members_sharing_scope_check CHECK ((sharing_scope = ANY (ARRAY['all'::text, 'trips_only'::text, 'date_range'::text, 'specific_trip'::text]))),
  CONSTRAINT unique_family_member UNIQUE (family_id, linked_user_id)
);

CREATE TABLE IF NOT EXISTS public.trips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  currency text NOT NULL DEFAULT 'BRL'::text,
  budget numeric(15,2),
  status trip_status NOT NULL DEFAULT 'PLANNING'::trip_status,
  cover_image text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  shopping_list jsonb DEFAULT '[]'::jsonb,
  exchange_entries jsonb DEFAULT '[]'::jsonb,
  source_trip_id uuid,
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  creator_user_id uuid,
  is_archived boolean DEFAULT false,
  archived_at timestamp with time zone,
  CONSTRAINT trips_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid,
  destination_account_id uuid,
  category_id uuid,
  trip_id uuid,
  amount numeric(15,2) NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  type transaction_type NOT NULL,
  domain transaction_domain NOT NULL DEFAULT 'PERSONAL'::transaction_domain,
  is_shared boolean NOT NULL DEFAULT false,
  payer_id uuid,
  is_installment boolean NOT NULL DEFAULT false,
  current_installment integer,
  total_installments integer,
  series_id uuid,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_pattern text,
  source_transaction_id uuid,
  sync_status sync_status NOT NULL DEFAULT 'SYNCED'::sync_status,
  is_settled boolean NOT NULL DEFAULT false,
  settled_at timestamp with time zone,
  related_member_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  creator_user_id uuid,
  frequency text,
  recurrence_day integer,
  enable_notification boolean DEFAULT false,
  notification_date date,
  reminder_option text,
  exchange_rate numeric(10,4),
  destination_amount numeric(15,2),
  destination_currency text,
  is_refund boolean DEFAULT false,
  refund_of_transaction_id uuid,
  last_generated timestamp without time zone,
  competence_date date NOT NULL,
  currency text DEFAULT 'BRL'::text,
  last_generated_date date,
  import_hash text,
  advanced_at timestamp with time zone,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  asset_id uuid,
  status text NOT NULL DEFAULT 'CONFIRMED'::text,
  goal_id uuid,
  idempotency_key uuid,
  external_id text,
  CONSTRAINT chk_transactions_currency_not_empty CHECK (((currency IS NULL) OR (currency <> ''::text))),
  CONSTRAINT chk_transactions_type_valid CHECK ((type = ANY (ARRAY['INCOME'::transaction_type, 'EXPENSE'::transaction_type, 'TRANSFER'::transaction_type]))),
  CONSTRAINT transactions_amount_positive CHECK ((amount > (0)::numeric)),
  CONSTRAINT transactions_competence_date_first_of_month CHECK ((competence_date = (date_trunc('month'::text, (competence_date)::timestamp with time zone))::date)),
  CONSTRAINT transactions_description_not_empty CHECK ((TRIM(BOTH FROM description) <> ''::text)),
  CONSTRAINT transactions_frequency_check CHECK (((frequency IS NULL) OR (frequency = ANY (ARRAY['DAILY'::text, 'WEEKLY'::text, 'MONTHLY'::text, 'YEARLY'::text])))),
  CONSTRAINT transactions_installment_valid CHECK (((is_installment = false) OR ((is_installment = true) AND (total_installments IS NOT NULL) AND (current_installment IS NOT NULL) AND (current_installment >= 1) AND (current_installment <= total_installments) AND (total_installments > 1)))),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'CONFIRMED'::text, 'CANCELLED'::text])))
);

CREATE TABLE IF NOT EXISTS public.transaction_splits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  member_id uuid,
  user_id uuid,
  name text NOT NULL,
  percentage numeric(5,2) NOT NULL,
  amount numeric(15,2) NOT NULL,
  is_settled boolean NOT NULL DEFAULT false,
  settled_at timestamp with time zone,
  settled_transaction_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  settled_by_debtor boolean DEFAULT false,
  settled_by_creditor boolean DEFAULT false,
  debtor_settlement_tx_id uuid,
  creditor_settlement_tx_id uuid,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  debtor_settlement_expires_at timestamp with time zone,
  CONSTRAINT splits_amount_positive CHECK ((amount > (0)::numeric)),
  CONSTRAINT splits_percentage_valid CHECK (((percentage > (0)::numeric) AND (percentage <= (100)::numeric))),
  CONSTRAINT transaction_splits_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.account_reconciliations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  statement_date date NOT NULL,
  statement_balance numeric(15,2) NOT NULL,
  calculated_balance numeric(15,2) NOT NULL,
  difference numeric(15,2) DEFAULT (statement_balance - calculated_balance),
  status text NOT NULL DEFAULT 'UNRECONCILED'::text,
  notes text,
  reconciled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_reconciliations_account_id_statement_date_key UNIQUE (account_id, statement_date),
  CONSTRAINT account_reconciliations_pkey PRIMARY KEY (id),
  CONSTRAINT account_reconciliations_status_check CHECK ((status = ANY (ARRAY['UNRECONCILED'::text, 'RECONCILED'::text, 'DISPUTED'::text])))
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  granted_by uuid,
  CONSTRAINT admin_users_pkey PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS public.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  ticker text,
  quantity numeric(20,8) DEFAULT 0,
  purchase_price numeric(15,2) DEFAULT 0,
  current_price numeric(15,2) DEFAULT 0,
  purchase_date date,
  account_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false,
  location text DEFAULT 'BR'::text,
  currency text DEFAULT 'BRL'::text,
  sector text,
  broker_name text,
  broker_id text,
  CONSTRAINT assets_current_price_check CHECK ((current_price >= (0)::numeric)),
  CONSTRAINT assets_location_check CHECK ((location = ANY (ARRAY['BR'::text, 'ABROAD'::text]))),
  CONSTRAINT assets_pkey PRIMARY KEY (id),
  CONSTRAINT assets_purchase_price_check CHECK ((purchase_price >= (0)::numeric)),
  CONSTRAINT assets_quantity_check CHECK ((quantity >= (0)::numeric)),
  CONSTRAINT assets_type_check CHECK ((type = ANY (ARRAY['STOCK'::text, 'ETF'::text, 'FII'::text, 'REIT'::text, 'BOND'::text, 'CRYPTO'::text, 'FUND'::text, 'OTHER'::text])))
);

CREATE TABLE IF NOT EXISTS public.asset_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  account_id uuid,
  type text NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT asset_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT asset_transactions_type_check CHECK ((type = ANY (ARRAY['BUY'::text, 'SELL'::text, 'DIVIDEND'::text])))
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  request_id text,
  CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text, 'SOFT_DELETE'::text, 'RESTORE'::text, 'SETTLEMENT_REQUESTED'::text, 'SETTLEMENT_CONFIRMED'::text]))),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.b3_tickers_cache (
  ticker text NOT NULL,
  name text NOT NULL,
  sector text,
  type text,
  logo_url text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT b3_tickers_cache_pkey PRIMARY KEY (ticker)
);

CREATE TABLE IF NOT EXISTS public.balance_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  old_balance numeric(15,2) NOT NULL,
  new_balance numeric(15,2) NOT NULL,
  delta numeric(15,2) DEFAULT (new_balance - old_balance),
  triggered_by text,
  transaction_id uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT balance_changes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid,
  name text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BRL'::text,
  period text NOT NULL DEFAULT 'MONTHLY'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted boolean DEFAULT false,
  creator_user_id uuid,
  start_date date,
  end_date date,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  CONSTRAINT budgets_amount_check CHECK ((amount > (0)::numeric)),
  CONSTRAINT budgets_period_check CHECK ((period = ANY (ARRAY['DAILY'::text, 'WEEKLY'::text, 'MONTHLY'::text, 'YEARLY'::text]))),
  CONSTRAINT budgets_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.category_keywords (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category_id uuid,
  keyword text NOT NULL,
  weight integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT category_keywords_pkey PRIMARY KEY (id),
  CONSTRAINT category_keywords_weight_check CHECK (((weight >= 1) AND (weight <= 10)))
);

CREATE TABLE IF NOT EXISTS public.credit_card_closing_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  reference_date date NOT NULL,
  closing_date date NOT NULL,
  due_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_card_closing_overrides_account_id_reference_date_key UNIQUE (account_id, reference_date),
  CONSTRAINT credit_card_closing_overrides_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.credit_card_invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  account_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  status character varying NOT NULL DEFAULT 'OPEN'::character varying,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  closing_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_card_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT credit_card_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'CLOSED'::character varying, 'PAID'::character varying, 'PARTIAL'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  error_type text NOT NULL DEFAULT 'UNKNOWN'::text,
  message text,
  stack text,
  url text,
  file text,
  line integer,
  col integer,
  user_agent text,
  app_version text,
  extra jsonb,
  status text DEFAULT 'PENDING'::text,
  CONSTRAINT error_logs_pkey PRIMARY KEY (id),
  CONSTRAINT error_logs_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'RESOLVED'::text, 'IGNORED'::text])))
);

CREATE TABLE IF NOT EXISTS public.family_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  family_id uuid NOT NULL,
  member_name text NOT NULL,
  role family_role NOT NULL DEFAULT 'viewer'::family_role,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sharing_scope text DEFAULT 'all'::text,
  scope_start_date date,
  scope_end_date date,
  scope_trip_id uuid,
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  CONSTRAINT family_invitations_from_user_id_to_user_id_family_id_key UNIQUE (from_user_id, to_user_id, family_id),
  CONSTRAINT family_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT family_invitations_sharing_scope_check CHECK ((sharing_scope = ANY (ARRAY['all'::text, 'trips_only'::text, 'date_range'::text, 'specific_trip'::text]))),
  CONSTRAINT family_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text])))
);

CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  target_pct numeric(5,2) NOT NULL,
  reached_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT goal_milestones_pkey PRIMARY KEY (id),
  CONSTRAINT goal_milestones_target_pct_check CHECK (((target_pct > (0)::numeric) AND (target_pct <= (100)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  target_amount numeric(15,2) NOT NULL,
  current_amount numeric(15,2) DEFAULT 0,
  target_date date,
  category text,
  priority text,
  status text DEFAULT 'IN_PROGRESS'::text,
  linked_account_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  deleted boolean NOT NULL DEFAULT false,
  creator_user_id uuid,
  CONSTRAINT goals_current_amount_check CHECK ((current_amount >= (0)::numeric)),
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text]))),
  CONSTRAINT goals_status_check CHECK ((status = ANY (ARRAY['IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text]))),
  CONSTRAINT goals_target_amount_check CHECK ((target_amount > (0)::numeric)),
  CONSTRAINT goals_target_amount_positive CHECK ((target_amount > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_due_enabled boolean DEFAULT true,
  invoice_due_days_before integer DEFAULT 3,
  budget_warning_enabled boolean DEFAULT true,
  budget_warning_threshold integer DEFAULT 80,
  shared_pending_enabled boolean DEFAULT true,
  recurring_enabled boolean DEFAULT true,
  savings_goal_enabled boolean DEFAULT true,
  weekly_summary_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT false,
  push_notifications boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  low_balance_enabled boolean DEFAULT true,
  low_balance_threshold numeric DEFAULT 100,
  credit_limit_warning_enabled boolean DEFAULT true,
  credit_limit_warning_threshold integer DEFAULT 90,
  push_bills_enabled boolean NOT NULL DEFAULT true,
  push_goals_enabled boolean NOT NULL DEFAULT true,
  push_weekly_enabled boolean NOT NULL DEFAULT false,
  push_days_before integer NOT NULL DEFAULT 3,
  preferred_hour integer NOT NULL DEFAULT 8,
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  icon text,
  action_url text,
  action_label text,
  related_id uuid,
  related_type text,
  priority text DEFAULT 'NORMAL'::text,
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  metadata jsonb,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text]))),
  CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['WELCOME'::text, 'INVOICE_DUE'::text, 'INVOICE_OVERDUE'::text, 'BUDGET_WARNING'::text, 'BUDGET_EXCEEDED'::text, 'SHARED_PENDING'::text, 'SHARED_SETTLED'::text, 'SHARED_EXPENSE'::text, 'RECURRING_PENDING'::text, 'RECURRING_GENERATED'::text, 'SAVINGS_GOAL'::text, 'GOAL_MILESTONE'::text, 'LOW_BALANCE'::text, 'CREDIT_LIMIT_WARNING'::text, 'SUBSCRIPTION_REMINDER'::text, 'WEEKLY_SUMMARY'::text, 'TRIP_INVITE'::text, 'FAMILY_INVITE'::text, 'SETTLEMENT_REQUEST'::text, 'PAYMENT_CONFIRMED'::text, 'SETTLEMENT_REJECTED'::text, 'SECURITY_ALERT'::text, 'GENERAL'::text, 'SYSTEM'::text])))
);

CREATE TABLE IF NOT EXISTS public.pin_attempts (
  user_id uuid NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamp with time zone,
  locked_until timestamp with time zone,
  CONSTRAINT pin_attempts_pkey PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS public.settlement_reversals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  split_id uuid NOT NULL,
  original_transaction_id uuid NOT NULL,
  payment_transaction_id uuid NOT NULL,
  amount numeric(15,2) NOT NULL,
  reversal_reason text NOT NULL,
  reversed_by uuid NOT NULL,
  reversed_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT settlement_reversals_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.shared_credit_cards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'PENDING'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  credit_limit numeric,
  CONSTRAINT shared_credit_cards_pkey PRIMARY KEY (id),
  CONSTRAINT shared_credit_cards_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying, 'REVOKED'::character varying])::text[]))),
  CONSTRAINT unique_shared_card_user UNIQUE (account_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.transaction_auto_share_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_value text NOT NULL,
  member_id uuid NOT NULL,
  split_ratio numeric NOT NULL DEFAULT 0.5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT transaction_auto_share_rules_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_auto_share_rules_split_ratio_check CHECK (((split_ratio > (0)::numeric) AND (split_ratio <= (1)::numeric))),
  CONSTRAINT transaction_auto_share_rules_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['category'::text, 'keyword'::text])))
);

CREATE TABLE IF NOT EXISTS public.trip_checklist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  item text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  assigned_to uuid,
  category text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trip_checklist_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.trip_exchange_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL,
  foreign_amount numeric(15,2) NOT NULL,
  exchange_rate numeric(10,6) NOT NULL,
  cet_percentage numeric(5,2) DEFAULT 0,
  effective_rate numeric(10,6) NOT NULL,
  local_amount numeric(15,2) NOT NULL,
  description text,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trip_exchange_purchases_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.trip_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  CONSTRAINT trip_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT trip_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text]))),
  CONSTRAINT trip_invitations_trip_id_invitee_id_key UNIQUE (trip_id, invitee_id)
);

CREATE TABLE IF NOT EXISTS public.trip_itinerary (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  date date NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  start_time time without time zone,
  end_time time without time zone,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trip_itinerary_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.trip_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  user_id uuid,
  role text NOT NULL DEFAULT 'member'::text,
  can_edit_details boolean DEFAULT false,
  can_manage_expenses boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  personal_budget numeric,
  status text NOT NULL DEFAULT 'active'::text,
  removed_at timestamp with time zone,
  removed_by uuid,
  removal_reason text,
  guest_name text,
  CONSTRAINT trip_members_identity_check CHECK (((user_id IS NOT NULL) OR (guest_name IS NOT NULL))),
  CONSTRAINT trip_members_pkey PRIMARY KEY (id),
  CONSTRAINT trip_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text, 'viewer'::text]))),
  CONSTRAINT trip_members_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text]))),
  CONSTRAINT unique_trip_member UNIQUE (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_category_learning (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  description_pattern text NOT NULL,
  category_id uuid,
  confidence numeric(3,2) DEFAULT 0.70,
  times_used integer DEFAULT 1,
  last_used_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_category_learning_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
  CONSTRAINT user_category_learning_pkey PRIMARY KEY (id)
);

-- ─── FOREIGN KEYS (após todas as tabelas) ───────────────────────────────────
ALTER TABLE public.account_reconciliations ADD CONSTRAINT account_reconciliations_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.account_reconciliations ADD CONSTRAINT account_reconciliations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.asset_transactions ADD CONSTRAINT asset_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id);
ALTER TABLE public.asset_transactions ADD CONSTRAINT asset_transactions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;
ALTER TABLE public.asset_transactions ADD CONSTRAINT asset_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.assets ADD CONSTRAINT assets_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE public.assets ADD CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES profiles(id);
ALTER TABLE public.balance_changes ADD CONSTRAINT balance_changes_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_creator_user_id_fkey FOREIGN KEY (creator_user_id) REFERENCES auth.users(id);
ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD CONSTRAINT categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.category_keywords ADD CONSTRAINT category_keywords_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE public.credit_card_closing_overrides ADD CONSTRAINT credit_card_closing_overrides_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.credit_card_invoices ADD CONSTRAINT credit_card_invoices_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.error_logs ADD CONSTRAINT error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.families ADD CONSTRAINT families_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES profiles(id);
ALTER TABLE public.families ADD CONSTRAINT families_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.family_invitations ADD CONSTRAINT family_invitations_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE public.family_invitations ADD CONSTRAINT family_invitations_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.family_invitations ADD CONSTRAINT family_invitations_scope_trip_id_fkey FOREIGN KEY (scope_trip_id) REFERENCES trips(id) ON DELETE SET NULL;
ALTER TABLE public.family_invitations ADD CONSTRAINT family_invitations_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.family_members ADD CONSTRAINT family_members_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE public.family_members ADD CONSTRAINT family_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES profiles(id);
ALTER TABLE public.family_members ADD CONSTRAINT family_members_linked_user_id_fkey FOREIGN KEY (linked_user_id) REFERENCES auth.users(id);
ALTER TABLE public.family_members ADD CONSTRAINT family_members_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES profiles(id);
ALTER TABLE public.family_members ADD CONSTRAINT family_members_scope_trip_id_fkey FOREIGN KEY (scope_trip_id) REFERENCES trips(id) ON DELETE SET NULL;
ALTER TABLE public.family_members ADD CONSTRAINT family_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.goal_milestones ADD CONSTRAINT goal_milestones_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;
ALTER TABLE public.goal_milestones ADD CONSTRAINT goal_milestones_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.goals ADD CONSTRAINT goals_creator_user_id_fkey FOREIGN KEY (creator_user_id) REFERENCES auth.users(id);
ALTER TABLE public.goals ADD CONSTRAINT goals_linked_account_id_fkey FOREIGN KEY (linked_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE public.goals ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pin_attempts ADD CONSTRAINT pin_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_default_account_id_fkey FOREIGN KEY (default_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_default_credit_card_id_fkey FOREIGN KEY (default_credit_card_id) REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_shared_sync_credit_card_id_fkey FOREIGN KEY (shared_sync_credit_card_id) REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.settlement_reversals ADD CONSTRAINT settlement_reversals_original_transaction_id_fkey FOREIGN KEY (original_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;
ALTER TABLE public.settlement_reversals ADD CONSTRAINT settlement_reversals_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;
ALTER TABLE public.settlement_reversals ADD CONSTRAINT settlement_reversals_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.settlement_reversals ADD CONSTRAINT settlement_reversals_split_id_fkey FOREIGN KEY (split_id) REFERENCES transaction_splits(id) ON DELETE RESTRICT;
ALTER TABLE public.shared_credit_cards ADD CONSTRAINT shared_credit_cards_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.shared_credit_cards ADD CONSTRAINT shared_credit_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.transaction_auto_share_rules ADD CONSTRAINT transaction_auto_share_rules_member_id_fkey FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE;
ALTER TABLE public.transaction_auto_share_rules ADD CONSTRAINT transaction_auto_share_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transaction_splits ADD CONSTRAINT transaction_splits_creditor_settlement_tx_id_fkey FOREIGN KEY (creditor_settlement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE public.transaction_splits ADD CONSTRAINT transaction_splits_debtor_settlement_tx_id_fkey FOREIGN KEY (debtor_settlement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE public.transaction_splits ADD CONSTRAINT transaction_splits_member_id_fkey FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE SET NULL;
ALTER TABLE public.transaction_splits ADD CONSTRAINT transaction_splits_settled_transaction_id_fkey FOREIGN KEY (settled_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE public.transaction_splits ADD CONSTRAINT transaction_splits_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
ALTER TABLE public.transaction_splits ADD CONSTRAINT transaction_splits_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_creator_user_id_fkey FOREIGN KEY (creator_user_id) REFERENCES profiles(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES family_members(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_refund_of_transaction_id_fkey FOREIGN KEY (refund_of_transaction_id) REFERENCES transactions(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_related_member_id_fkey FOREIGN KEY (related_member_id) REFERENCES family_members(id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_transaction_id_fkey FOREIGN KEY (source_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.trip_checklist ADD CONSTRAINT trip_checklist_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES trip_members(id) ON DELETE SET NULL;
ALTER TABLE public.trip_checklist ADD CONSTRAINT trip_checklist_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
ALTER TABLE public.trip_exchange_purchases ADD CONSTRAINT trip_exchange_purchases_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
ALTER TABLE public.trip_exchange_purchases ADD CONSTRAINT trip_exchange_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.trip_invitations ADD CONSTRAINT trip_invitations_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.trip_invitations ADD CONSTRAINT trip_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.trip_invitations ADD CONSTRAINT trip_invitations_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
ALTER TABLE public.trip_itinerary ADD CONSTRAINT trip_itinerary_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
ALTER TABLE public.trip_members ADD CONSTRAINT fk_trip_members_profiles FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE public.trip_members ADD CONSTRAINT trip_members_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES auth.users(id);
ALTER TABLE public.trip_members ADD CONSTRAINT trip_members_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
ALTER TABLE public.trip_members ADD CONSTRAINT trip_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.trips ADD CONSTRAINT trips_creator_user_id_fkey FOREIGN KEY (creator_user_id) REFERENCES auth.users(id);
ALTER TABLE public.trips ADD CONSTRAINT trips_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES profiles(id);
ALTER TABLE public.trips ADD CONSTRAINT trips_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.trips ADD CONSTRAINT trips_source_trip_id_fkey FOREIGN KEY (source_trip_id) REFERENCES trips(id);
ALTER TABLE public.user_category_learning ADD CONSTRAINT user_category_learning_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE public.user_category_learning ADD CONSTRAINT user_category_learning_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
