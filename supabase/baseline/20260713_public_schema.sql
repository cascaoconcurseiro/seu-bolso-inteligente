-- Generated from production PostgreSQL schema. Do not edit by hand.

-- Cutover baseline: 2026-07-13. Auth, storage and platform schemas are managed by Supabase.

set check_function_bodies = false;

create schema if not exists private;

create schema if not exists extensions;



create extension if not exists "pg_net" with schema "extensions";

create extension if not exists "pg_trgm" with schema "extensions";

create extension if not exists "pgcrypto" with schema "extensions";

create extension if not exists "uuid-ossp" with schema "extensions";

create type "public"."account_type" as enum ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'EMERGENCY_FUND', 'GLOBAL_ACCOUNT');

create type "public"."family_role" as enum ('admin', 'editor', 'viewer');

create type "public"."split_method" as enum ('EQUAL', 'PERCENTAGE', 'CUSTOM');

create type "public"."sync_status" as enum ('SYNCED', 'PENDING', 'ERROR');

create type "public"."transaction_domain" as enum ('PERSONAL', 'SHARED', 'TRAVEL');

create type "public"."transaction_type" as enum ('EXPENSE', 'INCOME', 'TRANSFER', 'WITHDRAWAL', 'DEPOSIT');

create type "public"."trip_status" as enum ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

create table "public"."account_reconciliations" (
  "id" uuid default gen_random_uuid() not null,
  "account_id" uuid not null,
  "user_id" uuid not null,
  "statement_date" date not null,
  "statement_balance" numeric(15,2) not null,
  "calculated_balance" numeric(15,2) not null,
  "difference" numeric(15,2) generated always as ((statement_balance - calculated_balance)) stored,
  "status" text default 'UNRECONCILED'::text not null,
  "notes" text,
  "reconciled_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."accounts" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "type" account_type default 'CHECKING'::account_type not null,
  "balance" numeric(15,2) default 0 not null,
  "bank_id" text,
  "bank_color" text,
  "bank_logo" text,
  "currency" text default 'BRL'::text not null,
  "is_active" boolean default true not null,
  "closing_day" integer,
  "due_day" integer,
  "credit_limit" numeric(15,2),
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "is_international" boolean default false,
  "initial_balance" numeric(15,2) default 0,
  "hide_balance" boolean default false,
  "yield_rate" numeric,
  "yield_type" text,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "is_archived" boolean default false,
  "closing_day_mode" text default 'FIXED_DAY'::text
);

create table "public"."admin_users" (
  "user_id" uuid not null,
  "granted_at" timestamp with time zone default now() not null,
  "granted_by" uuid
);

create table "public"."asset_transactions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "asset_id" uuid not null,
  "account_id" uuid,
  "type" text not null,
  "quantity" numeric not null,
  "price" numeric not null,
  "date" date default CURRENT_DATE not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

create table "public"."assets" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "type" text not null,
  "ticker" text,
  "quantity" numeric(20,8) default 0,
  "purchase_price" numeric(15,2) default 0,
  "current_price" numeric(15,2) default 0,
  "purchase_date" date,
  "account_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "deleted" boolean default false not null,
  "location" text default 'BR'::text,
  "currency" text default 'BRL'::text,
  "sector" text,
  "broker_name" text,
  "broker_id" text
);

create table "public"."audit_log" (
  "id" uuid default gen_random_uuid() not null,
  "table_name" text not null,
  "record_id" uuid not null,
  "action" text not null,
  "old_values" jsonb,
  "new_values" jsonb,
  "changed_fields" text[],
  "changed_by" uuid,
  "changed_at" timestamp with time zone default now() not null,
  "ip_address" inet,
  "user_agent" text,
  "request_id" text
);

create table "public"."b3_tickers_cache" (
  "ticker" text not null,
  "name" text not null,
  "sector" text,
  "type" text,
  "logo_url" text,
  "updated_at" timestamp with time zone default now()
);

create table "public"."balance_changes" (
  "id" uuid default gen_random_uuid() not null,
  "account_id" uuid not null,
  "old_balance" numeric(15,2) not null,
  "new_balance" numeric(15,2) not null,
  "delta" numeric(15,2) generated always as ((new_balance - old_balance)) stored,
  "triggered_by" text,
  "transaction_id" uuid,
  "changed_at" timestamp with time zone default now() not null
);

create table "public"."budgets" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "category_id" uuid,
  "name" text not null,
  "amount" numeric not null,
  "currency" text default 'BRL'::text not null,
  "period" text default 'MONTHLY'::text not null,
  "is_active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "deleted" boolean default false,
  "creator_user_id" uuid,
  "start_date" date,
  "end_date" date,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid
);

create table "public"."categories" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "icon" text,
  "type" text default 'expense'::text not null,
  "color" text,
  "created_at" timestamp with time zone default now() not null,
  "parent_category_id" uuid,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "is_archived" boolean default false
);

create table "public"."category_keywords" (
  "id" uuid default uuid_generate_v4() not null,
  "category_id" uuid,
  "keyword" text not null,
  "weight" integer default 5,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

create table "public"."credit_card_closing_overrides" (
  "id" uuid default gen_random_uuid() not null,
  "account_id" uuid not null,
  "reference_date" date not null,
  "closing_date" date not null,
  "due_date" date,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

create table "public"."credit_card_invoices" (
  "id" uuid default uuid_generate_v4() not null,
  "account_id" uuid not null,
  "month" integer not null,
  "year" integer not null,
  "status" character varying default 'OPEN'::character varying not null,
  "total_amount" numeric(15,2) default 0 not null,
  "due_date" date not null,
  "closing_date" date not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

create table "public"."error_logs" (
  "id" uuid default gen_random_uuid() not null,
  "created_at" timestamp with time zone default now() not null,
  "user_id" uuid,
  "error_type" text default 'UNKNOWN'::text not null,
  "message" text not null,
  "stack" text,
  "url" text,
  "file" text,
  "line" integer,
  "col" integer,
  "user_agent" text,
  "app_version" text,
  "extra" jsonb,
  "status" text default 'PENDING'::text not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."families" (
  "id" uuid default gen_random_uuid() not null,
  "name" text default 'Minha Família'::text not null,
  "owner_id" uuid not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "deleted" boolean default false not null,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid
);

create table "public"."family_invitations" (
  "id" uuid default gen_random_uuid() not null,
  "from_user_id" uuid not null,
  "to_user_id" uuid not null,
  "family_id" uuid not null,
  "member_name" text not null,
  "role" family_role default 'viewer'::family_role not null,
  "status" text default 'pending'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "sharing_scope" text default 'all'::text,
  "scope_start_date" date,
  "scope_end_date" date,
  "scope_trip_id" uuid,
  "deleted" boolean default false not null,
  "deleted_at" timestamp with time zone
);

create table "public"."family_members" (
  "id" uuid default gen_random_uuid() not null,
  "family_id" uuid not null,
  "user_id" uuid,
  "name" text not null,
  "email" text,
  "role" family_role default 'viewer'::family_role not null,
  "status" text default 'pending'::text not null,
  "invited_by" uuid,
  "linked_user_id" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "avatar_url" text,
  "sharing_scope" text default 'all'::text,
  "scope_start_date" date,
  "scope_end_date" date,
  "scope_trip_id" uuid,
  "removed_at" timestamp with time zone,
  "removed_by" uuid,
  "removal_reason" text,
  "avatar_color" text,
  "avatar_icon" text,
  "member_type" text default 'family'::text not null,
  "active_in_form" boolean default false not null
);

create table "public"."goal_milestones" (
  "id" uuid default gen_random_uuid() not null,
  "goal_id" uuid not null,
  "user_id" uuid not null,
  "name" text not null,
  "target_pct" numeric(5,2) not null,
  "reached_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."goals" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "description" text,
  "target_amount" numeric(15,2) not null,
  "current_amount" numeric(15,2) default 0,
  "target_date" date,
  "category" text,
  "priority" text,
  "status" text default 'IN_PROGRESS'::text,
  "linked_account_id" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "completed_at" timestamp with time zone,
  "deleted" boolean default false not null,
  "creator_user_id" uuid
);

create table "public"."notification_preferences" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "invoice_due_enabled" boolean default true,
  "invoice_due_days_before" integer default 3,
  "budget_warning_enabled" boolean default true,
  "budget_warning_threshold" integer default 80,
  "shared_pending_enabled" boolean default true,
  "recurring_enabled" boolean default true,
  "savings_goal_enabled" boolean default true,
  "weekly_summary_enabled" boolean default true,
  "email_notifications" boolean default false,
  "push_notifications" boolean default false,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "low_balance_enabled" boolean default true,
  "low_balance_threshold" numeric default 100,
  "credit_limit_warning_enabled" boolean default true,
  "credit_limit_warning_threshold" integer default 90,
  "push_bills_enabled" boolean default true not null,
  "push_goals_enabled" boolean default true not null,
  "push_weekly_enabled" boolean default false not null,
  "push_days_before" integer default 3 not null,
  "preferred_hour" integer default 8 not null
);

create table "public"."notifications" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "type" text not null,
  "title" text not null,
  "message" text not null,
  "icon" text,
  "action_url" text,
  "action_label" text,
  "related_id" uuid,
  "related_type" text,
  "priority" text default 'NORMAL'::text,
  "is_read" boolean default false,
  "is_dismissed" boolean default false,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "read_at" timestamp with time zone,
  "dismissed_at" timestamp with time zone,
  "metadata" jsonb
);

create table "public"."pin_attempts" (
  "user_id" uuid not null,
  "attempt_count" integer default 0 not null,
  "last_attempt_at" timestamp with time zone,
  "locked_until" timestamp with time zone
);

create table "public"."profiles" (
  "id" uuid not null,
  "email" text not null,
  "full_name" text default 'Usuário'::text,
  "avatar_url" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "avatar_color" text default 'green'::text,
  "avatar_icon" text default 'avatar_1'::text,
  "use_subcategories" boolean default false,
  "month_start_day" integer default 1,
  "base_currency" text default 'BRL'::text,
  "require_pin_on_open" boolean default false,
  "monthly_budget" numeric default 0,
  "shared_expenses_behavior" text default 'CYCLE'::text,
  "shared_closing_day" integer,
  "shared_due_day" integer,
  "global_cdi_rate" numeric default 11.15,
  "shared_sync_credit_card_id" uuid,
  "shared_credit_card_behavior" text default 'CARD_CYCLE'::text,
  "default_account_id" uuid,
  "default_credit_card_id" uuid,
  "low_balance_threshold" numeric,
  "monthly_report_enabled" boolean default true not null,
  "app_pin_hash" text
);

create table "public"."push_subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "endpoint" text not null,
  "p256dh" text not null,
  "auth" text not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."settlement_reversals" (
  "id" uuid default gen_random_uuid() not null,
  "split_id" uuid not null,
  "original_transaction_id" uuid not null,
  "payment_transaction_id" uuid not null,
  "amount" numeric(15,2) not null,
  "reversal_reason" text not null,
  "reversed_by" uuid not null,
  "reversed_at" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."shared_credit_cards" (
  "id" uuid default uuid_generate_v4() not null,
  "account_id" uuid not null,
  "user_id" uuid not null,
  "status" character varying default 'PENDING'::character varying not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "credit_limit" numeric
);

create table "public"."transaction_auto_share_rules" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "trigger_type" text not null,
  "trigger_value" text not null,
  "member_id" uuid not null,
  "split_ratio" numeric default 0.5 not null,
  "is_active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."transaction_splits" (
  "id" uuid default gen_random_uuid() not null,
  "transaction_id" uuid not null,
  "member_id" uuid,
  "user_id" uuid,
  "name" text not null,
  "percentage" numeric(5,2) not null,
  "amount" numeric(15,2) not null,
  "is_settled" boolean default false not null,
  "settled_at" timestamp with time zone,
  "settled_transaction_id" uuid,
  "created_at" timestamp with time zone default now() not null,
  "settled_by_debtor" boolean default false,
  "settled_by_creditor" boolean default false,
  "debtor_settlement_tx_id" uuid,
  "creditor_settlement_tx_id" uuid,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "debtor_settlement_expires_at" timestamp with time zone
);

create table "public"."transactions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "account_id" uuid,
  "destination_account_id" uuid,
  "category_id" uuid,
  "trip_id" uuid,
  "amount" numeric(15,2) not null,
  "description" text not null,
  "date" date not null,
  "type" transaction_type not null,
  "domain" transaction_domain default 'PERSONAL'::transaction_domain not null,
  "is_shared" boolean default false not null,
  "payer_id" uuid,
  "is_installment" boolean default false not null,
  "current_installment" integer,
  "total_installments" integer,
  "series_id" uuid,
  "is_recurring" boolean default false not null,
  "recurrence_pattern" text,
  "source_transaction_id" uuid,
  "sync_status" sync_status default 'SYNCED'::sync_status not null,
  "is_settled" boolean default false not null,
  "settled_at" timestamp with time zone,
  "related_member_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "creator_user_id" uuid,
  "frequency" text,
  "recurrence_day" integer,
  "enable_notification" boolean default false,
  "notification_date" date,
  "reminder_option" text,
  "exchange_rate" numeric(10,4),
  "destination_amount" numeric(15,2),
  "destination_currency" text,
  "is_refund" boolean default false,
  "refund_of_transaction_id" uuid,
  "last_generated" timestamp without time zone,
  "competence_date" date not null,
  "currency" text default 'BRL'::text,
  "last_generated_date" date,
  "import_hash" text,
  "advanced_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "asset_id" uuid,
  "status" text default 'CONFIRMED'::text not null,
  "goal_id" uuid,
  "idempotency_key" text,
  "external_id" text
);

create table "public"."trip_checklist" (
  "id" uuid default gen_random_uuid() not null,
  "trip_id" uuid not null,
  "item" text not null,
  "is_completed" boolean default false not null,
  "assigned_to" uuid,
  "category" text,
  "order_index" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."trip_exchange_purchases" (
  "id" uuid default gen_random_uuid() not null,
  "trip_id" uuid not null,
  "user_id" uuid not null,
  "foreign_amount" numeric(15,2) not null,
  "exchange_rate" numeric(10,6) not null,
  "cet_percentage" numeric(5,2) default 0,
  "effective_rate" numeric(10,6) not null,
  "local_amount" numeric(15,2) not null,
  "description" text,
  "purchase_date" date default CURRENT_DATE not null,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

create table "public"."trip_invitations" (
  "id" uuid default gen_random_uuid() not null,
  "trip_id" uuid not null,
  "inviter_id" uuid not null,
  "invitee_id" uuid not null,
  "status" text default 'pending'::text not null,
  "message" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "responded_at" timestamp with time zone,
  "deleted" boolean default false not null,
  "deleted_at" timestamp with time zone
);

create table "public"."trip_itinerary" (
  "id" uuid default gen_random_uuid() not null,
  "trip_id" uuid not null,
  "date" date not null,
  "title" text not null,
  "description" text,
  "location" text,
  "start_time" time without time zone,
  "end_time" time without time zone,
  "order_index" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "maps_url" text,
  "latitude" double precision,
  "longitude" double precision
);

create table "public"."trip_members" (
  "id" uuid default gen_random_uuid() not null,
  "trip_id" uuid not null,
  "user_id" uuid,
  "role" text default 'member'::text not null,
  "can_edit_details" boolean default false,
  "can_manage_expenses" boolean default true,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "personal_budget" numeric,
  "status" text default 'active'::text not null,
  "removed_at" timestamp with time zone,
  "removed_by" uuid,
  "removal_reason" text,
  "guest_name" text
);

create table "public"."trips" (
  "id" uuid default gen_random_uuid() not null,
  "owner_id" uuid not null,
  "name" text not null,
  "destination" text not null,
  "start_date" date not null,
  "end_date" date not null,
  "currency" text default 'BRL'::text not null,
  "budget" numeric(15,2),
  "status" trip_status default 'PLANNING'::trip_status not null,
  "cover_image" text,
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "shopping_list" jsonb default '[]'::jsonb,
  "exchange_entries" jsonb default '[]'::jsonb,
  "source_trip_id" uuid,
  "deleted" boolean default false not null,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "creator_user_id" uuid,
  "is_archived" boolean default false,
  "archived_at" timestamp with time zone
);

create table "public"."user_category_learning" (
  "id" uuid default uuid_generate_v4() not null,
  "user_id" uuid,
  "description_pattern" text not null,
  "category_id" uuid,
  "confidence" numeric(3,2) default 0.70,
  "times_used" integer default 1,
  "last_used_at" timestamp with time zone default now(),
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

alter table only "public"."account_reconciliations" add constraint "account_reconciliations_account_id_statement_date_key" UNIQUE (account_id, statement_date);

alter table only "public"."account_reconciliations" add constraint "account_reconciliations_pkey" PRIMARY KEY (id);

alter table only "public"."account_reconciliations" add constraint "account_reconciliations_status_check" CHECK (status = ANY (ARRAY['UNRECONCILED'::text, 'RECONCILED'::text, 'DISPUTED'::text]));

alter table only "public"."accounts" add constraint "accounts_pkey" PRIMARY KEY (id);

alter table only "public"."accounts" add constraint "chk_credit_limit_non_negative" CHECK (credit_limit IS NULL OR credit_limit >= 0::numeric);

alter table only "public"."accounts" add constraint "valid_closing_day_mode" CHECK (closing_day_mode = ANY (ARRAY['FIXED_DAY'::text, 'LAST_DAY'::text, 'LAST_BUSINESS_DAY'::text]));

alter table only "public"."admin_users" add constraint "admin_users_pkey" PRIMARY KEY (user_id);

alter table only "public"."asset_transactions" add constraint "asset_transactions_pkey" PRIMARY KEY (id);

alter table only "public"."asset_transactions" add constraint "asset_transactions_type_check" CHECK (type = ANY (ARRAY['BUY'::text, 'SELL'::text, 'DIVIDEND'::text]));

alter table only "public"."assets" add constraint "assets_current_price_check" CHECK (current_price >= 0::numeric);

alter table only "public"."assets" add constraint "assets_location_check" CHECK (location = ANY (ARRAY['BR'::text, 'ABROAD'::text]));

alter table only "public"."assets" add constraint "assets_pkey" PRIMARY KEY (id);

alter table only "public"."assets" add constraint "assets_purchase_price_check" CHECK (purchase_price >= 0::numeric);

alter table only "public"."assets" add constraint "assets_quantity_check" CHECK (quantity >= 0::numeric);

alter table only "public"."assets" add constraint "assets_type_check" CHECK (type = ANY (ARRAY['STOCK'::text, 'ETF'::text, 'FII'::text, 'REIT'::text, 'BOND'::text, 'CRYPTO'::text, 'FUND'::text, 'OTHER'::text]));

alter table only "public"."audit_log" add constraint "audit_log_action_check" CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text, 'SOFT_DELETE'::text, 'RESTORE'::text, 'SETTLEMENT_REQUESTED'::text, 'SETTLEMENT_CONFIRMED'::text]));

alter table only "public"."audit_log" add constraint "audit_log_pkey" PRIMARY KEY (id);

alter table only "public"."b3_tickers_cache" add constraint "b3_tickers_cache_pkey" PRIMARY KEY (ticker);

alter table only "public"."balance_changes" add constraint "balance_changes_pkey" PRIMARY KEY (id);

alter table only "public"."budgets" add constraint "budgets_amount_check" CHECK (amount > 0::numeric);

alter table only "public"."budgets" add constraint "budgets_period_check" CHECK (period = ANY (ARRAY['DAILY'::text, 'WEEKLY'::text, 'MONTHLY'::text, 'YEARLY'::text]));

alter table only "public"."budgets" add constraint "budgets_pkey" PRIMARY KEY (id);

alter table only "public"."categories" add constraint "categories_pkey" PRIMARY KEY (id);

alter table only "public"."categories" add constraint "chk_no_self_reference" CHECK (id <> parent_category_id);

alter table only "public"."categories" add constraint "unique_user_category" UNIQUE NULLS NOT DISTINCT (user_id, name, type, parent_category_id);

alter table only "public"."category_keywords" add constraint "category_keywords_pkey" PRIMARY KEY (id);

alter table only "public"."category_keywords" add constraint "category_keywords_weight_check" CHECK (weight >= 1 AND weight <= 10);

alter table only "public"."credit_card_closing_overrides" add constraint "credit_card_closing_overrides_account_id_reference_date_key" UNIQUE (account_id, reference_date);

alter table only "public"."credit_card_closing_overrides" add constraint "credit_card_closing_overrides_pkey" PRIMARY KEY (id);

alter table only "public"."credit_card_invoices" add constraint "credit_card_invoices_pkey" PRIMARY KEY (id);

alter table only "public"."credit_card_invoices" add constraint "credit_card_invoices_status_check" CHECK (status::text = ANY (ARRAY['OPEN'::character varying, 'CLOSED'::character varying, 'PAID'::character varying, 'PARTIAL'::character varying]::text[]));

alter table only "public"."error_logs" add constraint "error_logs_pkey" PRIMARY KEY (id);

alter table only "public"."error_logs" add constraint "error_logs_status_check" CHECK (status = ANY (ARRAY['PENDING'::text, 'RESOLVED'::text, 'IGNORED'::text]));

alter table only "public"."families" add constraint "families_pkey" PRIMARY KEY (id);

alter table only "public"."family_invitations" add constraint "family_invitations_from_user_id_to_user_id_family_id_key" UNIQUE (from_user_id, to_user_id, family_id);

alter table only "public"."family_invitations" add constraint "family_invitations_pkey" PRIMARY KEY (id);

alter table only "public"."family_invitations" add constraint "family_invitations_sharing_scope_check" CHECK (sharing_scope = ANY (ARRAY['all'::text, 'trips_only'::text, 'date_range'::text, 'specific_trip'::text]));

alter table only "public"."family_invitations" add constraint "family_invitations_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text]));

alter table only "public"."family_members" add constraint "family_members_family_id_email_key" UNIQUE (family_id, email);

alter table only "public"."family_members" add constraint "family_members_member_type_check" CHECK (member_type = ANY (ARRAY['family'::text, 'contact'::text]));

alter table only "public"."family_members" add constraint "family_members_pkey" PRIMARY KEY (id);

alter table only "public"."family_members" add constraint "family_members_role_check" CHECK (role = ANY (ARRAY['admin'::family_role, 'editor'::family_role, 'viewer'::family_role]));

alter table only "public"."family_members" add constraint "family_members_sharing_scope_check" CHECK (sharing_scope = ANY (ARRAY['all'::text, 'trips_only'::text, 'date_range'::text, 'specific_trip'::text]));

alter table only "public"."family_members" add constraint "unique_family_member" UNIQUE (family_id, linked_user_id);

alter table only "public"."goal_milestones" add constraint "goal_milestones_pkey" PRIMARY KEY (id);

alter table only "public"."goal_milestones" add constraint "goal_milestones_target_pct_check" CHECK (target_pct > 0::numeric AND target_pct <= 100::numeric);

alter table only "public"."goals" add constraint "goals_current_amount_check" CHECK (current_amount >= 0::numeric);

alter table only "public"."goals" add constraint "goals_pkey" PRIMARY KEY (id);

alter table only "public"."goals" add constraint "goals_priority_check" CHECK (priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text]));

alter table only "public"."goals" add constraint "goals_status_check" CHECK (status = ANY (ARRAY['IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text]));

alter table only "public"."goals" add constraint "goals_target_amount_check" CHECK (target_amount > 0::numeric);

alter table only "public"."goals" add constraint "goals_target_amount_positive" CHECK (target_amount > 0::numeric);

alter table only "public"."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY (id);

alter table only "public"."notification_preferences" add constraint "notification_preferences_user_id_key" UNIQUE (user_id);

alter table only "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY (id);

alter table only "public"."notifications" add constraint "notifications_priority_check" CHECK (priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text]));

alter table only "public"."notifications" add constraint "notifications_type_check" CHECK (type = ANY (ARRAY['WELCOME'::text, 'INVOICE_DUE'::text, 'INVOICE_OVERDUE'::text, 'BUDGET_WARNING'::text, 'BUDGET_EXCEEDED'::text, 'SHARED_PENDING'::text, 'SHARED_SETTLED'::text, 'SHARED_EXPENSE'::text, 'RECURRING_PENDING'::text, 'RECURRING_GENERATED'::text, 'SAVINGS_GOAL'::text, 'GOAL_MILESTONE'::text, 'LOW_BALANCE'::text, 'CREDIT_LIMIT_WARNING'::text, 'SUBSCRIPTION_REMINDER'::text, 'WEEKLY_SUMMARY'::text, 'TRIP_INVITE'::text, 'FAMILY_INVITE'::text, 'SETTLEMENT_REQUEST'::text, 'PAYMENT_CONFIRMED'::text, 'SETTLEMENT_REJECTED'::text, 'SECURITY_ALERT'::text, 'GENERAL'::text, 'SYSTEM'::text]));

alter table only "public"."pin_attempts" add constraint "pin_attempts_pkey" PRIMARY KEY (user_id);

alter table only "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);

alter table only "public"."push_subscriptions" add constraint "push_subscriptions_pkey" PRIMARY KEY (id);

alter table only "public"."push_subscriptions" add constraint "push_subscriptions_user_id_endpoint_key" UNIQUE (user_id, endpoint);

alter table only "public"."settlement_reversals" add constraint "settlement_reversals_pkey" PRIMARY KEY (id);

alter table only "public"."shared_credit_cards" add constraint "shared_credit_cards_pkey" PRIMARY KEY (id);

alter table only "public"."shared_credit_cards" add constraint "shared_credit_cards_status_check" CHECK (status::text = ANY (ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying, 'REVOKED'::character varying]::text[]));

alter table only "public"."shared_credit_cards" add constraint "unique_shared_card_user" UNIQUE (account_id, user_id);

alter table only "public"."transaction_auto_share_rules" add constraint "transaction_auto_share_rules_pkey" PRIMARY KEY (id);

alter table only "public"."transaction_auto_share_rules" add constraint "transaction_auto_share_rules_split_ratio_check" CHECK (split_ratio > 0::numeric AND split_ratio <= 1::numeric);

alter table only "public"."transaction_auto_share_rules" add constraint "transaction_auto_share_rules_trigger_type_check" CHECK (trigger_type = ANY (ARRAY['category'::text, 'keyword'::text]));

alter table only "public"."transaction_splits" add constraint "splits_amount_positive" CHECK (amount > 0::numeric);

alter table only "public"."transaction_splits" add constraint "splits_percentage_valid" CHECK (percentage > 0::numeric AND percentage <= 100::numeric);

alter table only "public"."transaction_splits" add constraint "transaction_splits_pkey" PRIMARY KEY (id);

alter table only "public"."transactions" add constraint "chk_transactions_currency_not_empty" CHECK (currency IS NULL OR currency <> ''::text);

alter table only "public"."transactions" add constraint "chk_transactions_type_valid" CHECK (type = ANY (ARRAY['INCOME'::transaction_type, 'EXPENSE'::transaction_type, 'TRANSFER'::transaction_type]));

alter table only "public"."transactions" add constraint "transactions_amount_positive" CHECK (amount > 0::numeric);

alter table only "public"."transactions" add constraint "transactions_competence_date_first_of_month" CHECK (competence_date = date_trunc('month'::text, competence_date::timestamp with time zone)::date);

alter table only "public"."transactions" add constraint "transactions_description_not_empty" CHECK (TRIM(BOTH FROM description) <> ''::text);

alter table only "public"."transactions" add constraint "transactions_frequency_check" CHECK (frequency IS NULL OR (frequency = ANY (ARRAY['DAILY'::text, 'WEEKLY'::text, 'MONTHLY'::text, 'YEARLY'::text])));

alter table only "public"."transactions" add constraint "transactions_installment_valid" CHECK (is_installment = false OR is_installment = true AND total_installments IS NOT NULL AND current_installment IS NOT NULL AND current_installment >= 1 AND current_installment <= total_installments AND total_installments > 1);

alter table only "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY (id);

alter table only "public"."transactions" add constraint "transactions_status_check" CHECK (status = ANY (ARRAY['PENDING'::text, 'CONFIRMED'::text, 'CANCELLED'::text]));

alter table only "public"."trip_checklist" add constraint "trip_checklist_pkey" PRIMARY KEY (id);

alter table only "public"."trip_exchange_purchases" add constraint "trip_exchange_purchases_pkey" PRIMARY KEY (id);

alter table only "public"."trip_invitations" add constraint "trip_invitations_pkey" PRIMARY KEY (id);

alter table only "public"."trip_invitations" add constraint "trip_invitations_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text]));

alter table only "public"."trip_invitations" add constraint "trip_invitations_trip_id_invitee_id_key" UNIQUE (trip_id, invitee_id);

alter table only "public"."trip_itinerary" add constraint "trip_itinerary_latitude_range" CHECK (latitude IS NULL OR latitude >= '-90'::integer::double precision AND latitude <= 90::double precision);

alter table only "public"."trip_itinerary" add constraint "trip_itinerary_longitude_range" CHECK (longitude IS NULL OR longitude >= '-180'::integer::double precision AND longitude <= 180::double precision);

alter table only "public"."trip_itinerary" add constraint "trip_itinerary_pkey" PRIMARY KEY (id);

alter table only "public"."trip_members" add constraint "trip_members_identity_check" CHECK (user_id IS NOT NULL OR guest_name IS NOT NULL);

alter table only "public"."trip_members" add constraint "trip_members_pkey" PRIMARY KEY (id);

alter table only "public"."trip_members" add constraint "trip_members_role_check" CHECK (role = ANY (ARRAY['owner'::text, 'member'::text, 'viewer'::text]));

alter table only "public"."trip_members" add constraint "trip_members_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text]));

alter table only "public"."trip_members" add constraint "unique_trip_member" UNIQUE (trip_id, user_id);

alter table only "public"."trips" add constraint "trips_pkey" PRIMARY KEY (id);

alter table only "public"."user_category_learning" add constraint "user_category_learning_confidence_check" CHECK (confidence >= 0::numeric AND confidence <= 1::numeric);

alter table only "public"."user_category_learning" add constraint "user_category_learning_pkey" PRIMARY KEY (id);

alter table only "public"."account_reconciliations" add constraint "account_reconciliations_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

alter table only "public"."account_reconciliations" add constraint "account_reconciliations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."accounts" add constraint "accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."admin_users" add constraint "admin_users_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id);

alter table only "public"."admin_users" add constraint "admin_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."asset_transactions" add constraint "asset_transactions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id);

alter table only "public"."asset_transactions" add constraint "asset_transactions_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;

alter table only "public"."asset_transactions" add constraint "asset_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table only "public"."assets" add constraint "assets_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;

alter table only "public"."assets" add constraint "assets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."audit_log" add constraint "audit_log_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES profiles(id);

alter table only "public"."balance_changes" add constraint "balance_changes_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

alter table only "public"."budgets" add constraint "budgets_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

alter table only "public"."budgets" add constraint "budgets_creator_user_id_fkey" FOREIGN KEY (creator_user_id) REFERENCES auth.users(id);

alter table only "public"."budgets" add constraint "budgets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."categories" add constraint "categories_parent_category_id_fkey" FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE CASCADE;

alter table only "public"."categories" add constraint "categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."category_keywords" add constraint "category_keywords_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

alter table only "public"."credit_card_closing_overrides" add constraint "credit_card_closing_overrides_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

alter table only "public"."credit_card_invoices" add constraint "credit_card_invoices_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

alter table only "public"."error_logs" add constraint "error_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table only "public"."families" add constraint "families_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES profiles(id);

alter table only "public"."families" add constraint "families_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."family_invitations" add constraint "family_invitations_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

alter table only "public"."family_invitations" add constraint "family_invitations_from_user_id_fkey" FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."family_invitations" add constraint "family_invitations_scope_trip_id_fkey" FOREIGN KEY (scope_trip_id) REFERENCES trips(id) ON DELETE SET NULL;

alter table only "public"."family_invitations" add constraint "family_invitations_to_user_id_fkey" FOREIGN KEY (to_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."family_members" add constraint "family_members_family_id_fkey" FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

alter table only "public"."family_members" add constraint "family_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES profiles(id);

alter table only "public"."family_members" add constraint "family_members_linked_user_id_fkey" FOREIGN KEY (linked_user_id) REFERENCES auth.users(id);

alter table only "public"."family_members" add constraint "family_members_removed_by_fkey" FOREIGN KEY (removed_by) REFERENCES profiles(id);

alter table only "public"."family_members" add constraint "family_members_scope_trip_id_fkey" FOREIGN KEY (scope_trip_id) REFERENCES trips(id) ON DELETE SET NULL;

alter table only "public"."family_members" add constraint "family_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."goal_milestones" add constraint "goal_milestones_goal_id_fkey" FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;

alter table only "public"."goal_milestones" add constraint "goal_milestones_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."goals" add constraint "goals_creator_user_id_fkey" FOREIGN KEY (creator_user_id) REFERENCES auth.users(id);

alter table only "public"."goals" add constraint "goals_linked_account_id_fkey" FOREIGN KEY (linked_account_id) REFERENCES accounts(id) ON DELETE SET NULL;

alter table only "public"."goals" add constraint "goals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."notification_preferences" add constraint "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."pin_attempts" add constraint "pin_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."profiles" add constraint "profiles_default_account_id_fkey" FOREIGN KEY (default_account_id) REFERENCES accounts(id) ON DELETE SET NULL;

alter table only "public"."profiles" add constraint "profiles_default_credit_card_id_fkey" FOREIGN KEY (default_credit_card_id) REFERENCES accounts(id) ON DELETE SET NULL;

alter table only "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."profiles" add constraint "profiles_shared_sync_credit_card_id_fkey" FOREIGN KEY (shared_sync_credit_card_id) REFERENCES accounts(id) ON DELETE SET NULL;

alter table only "public"."push_subscriptions" add constraint "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."settlement_reversals" add constraint "settlement_reversals_original_transaction_id_fkey" FOREIGN KEY (original_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;

alter table only "public"."settlement_reversals" add constraint "settlement_reversals_payment_transaction_id_fkey" FOREIGN KEY (payment_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;

alter table only "public"."settlement_reversals" add constraint "settlement_reversals_reversed_by_fkey" FOREIGN KEY (reversed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table only "public"."settlement_reversals" add constraint "settlement_reversals_split_id_fkey" FOREIGN KEY (split_id) REFERENCES transaction_splits(id) ON DELETE RESTRICT;

alter table only "public"."shared_credit_cards" add constraint "shared_credit_cards_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

alter table only "public"."shared_credit_cards" add constraint "shared_credit_cards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."transaction_auto_share_rules" add constraint "transaction_auto_share_rules_member_id_fkey" FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE;

alter table only "public"."transaction_auto_share_rules" add constraint "transaction_auto_share_rules_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."transaction_splits" add constraint "transaction_splits_creditor_settlement_tx_id_fkey" FOREIGN KEY (creditor_settlement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL;

alter table only "public"."transaction_splits" add constraint "transaction_splits_debtor_settlement_tx_id_fkey" FOREIGN KEY (debtor_settlement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL;

alter table only "public"."transaction_splits" add constraint "transaction_splits_member_id_fkey" FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE SET NULL;

alter table only "public"."transaction_splits" add constraint "transaction_splits_settled_transaction_id_fkey" FOREIGN KEY (settled_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

alter table only "public"."transaction_splits" add constraint "transaction_splits_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;

alter table only "public"."transaction_splits" add constraint "transaction_splits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."transactions" add constraint "transactions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;

alter table only "public"."transactions" add constraint "transactions_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;

alter table only "public"."transactions" add constraint "transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

alter table only "public"."transactions" add constraint "transactions_creator_user_id_fkey" FOREIGN KEY (creator_user_id) REFERENCES profiles(id);

alter table only "public"."transactions" add constraint "transactions_destination_account_id_fkey" FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE CASCADE;

alter table only "public"."transactions" add constraint "transactions_goal_id_fkey" FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL;

alter table only "public"."transactions" add constraint "transactions_payer_id_fkey" FOREIGN KEY (payer_id) REFERENCES family_members(id) ON DELETE SET NULL;

alter table only "public"."transactions" add constraint "transactions_refund_of_transaction_id_fkey" FOREIGN KEY (refund_of_transaction_id) REFERENCES transactions(id);

alter table only "public"."transactions" add constraint "transactions_related_member_id_fkey" FOREIGN KEY (related_member_id) REFERENCES family_members(id);

alter table only "public"."transactions" add constraint "transactions_source_transaction_id_fkey" FOREIGN KEY (source_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;

alter table only "public"."transactions" add constraint "transactions_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

alter table only "public"."transactions" add constraint "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."trip_checklist" add constraint "trip_checklist_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES trip_members(id) ON DELETE SET NULL;

alter table only "public"."trip_checklist" add constraint "trip_checklist_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

alter table only "public"."trip_exchange_purchases" add constraint "trip_exchange_purchases_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

alter table only "public"."trip_exchange_purchases" add constraint "trip_exchange_purchases_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."trip_invitations" add constraint "trip_invitations_invitee_id_fkey" FOREIGN KEY (invitee_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."trip_invitations" add constraint "trip_invitations_inviter_id_fkey" FOREIGN KEY (inviter_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."trip_invitations" add constraint "trip_invitations_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

alter table only "public"."trip_itinerary" add constraint "trip_itinerary_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

alter table only "public"."trip_members" add constraint "fk_trip_members_profiles" FOREIGN KEY (user_id) REFERENCES profiles(id);

alter table only "public"."trip_members" add constraint "trip_members_removed_by_fkey" FOREIGN KEY (removed_by) REFERENCES auth.users(id);

alter table only "public"."trip_members" add constraint "trip_members_trip_id_fkey" FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;

alter table only "public"."trip_members" add constraint "trip_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table only "public"."trips" add constraint "trips_creator_user_id_fkey" FOREIGN KEY (creator_user_id) REFERENCES auth.users(id);

alter table only "public"."trips" add constraint "trips_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES profiles(id);

alter table only "public"."trips" add constraint "trips_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table only "public"."trips" add constraint "trips_source_trip_id_fkey" FOREIGN KEY (source_trip_id) REFERENCES trips(id);

alter table only "public"."user_category_learning" add constraint "user_category_learning_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

alter table only "public"."user_category_learning" add constraint "user_category_learning_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION private.authenticated_uid()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  return v_uid;
end;
$function$;

CREATE OR REPLACE FUNCTION public.add_trip_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Só tenta inserir se o owner_id não for nulo
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO trip_members (trip_id, user_id, role, status)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'active')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_trip_budget_on_settlement()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trip_id UUID;
  v_settlement_amount NUMERIC;
  v_current_budget NUMERIC;
BEGIN
  -- Verificar se é um split de viagem e se foi marcado como pago
  IF NEW.is_settled = TRUE AND (OLD.is_settled IS NULL OR OLD.is_settled = FALSE) THEN
    -- Buscar trip_id da transação original
    SELECT trip_id INTO v_trip_id
    FROM transactions
    WHERE id = NEW.transaction_id;

    -- Se não for transação de viagem, não fazer nada
    IF v_trip_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Valor do acerto
    v_settlement_amount := NEW.amount;

    -- Buscar orçamento atual da viagem
    SELECT budget INTO v_current_budget
    FROM trips
    WHERE id = v_trip_id;

    -- Se não houver orçamento definido, não fazer nada
    IF v_current_budget IS NULL THEN
      RETURN NEW;
    END IF;

    -- LÓGICA DO AJUSTE:
    -- Quando alguém acerta uma dívida de viagem, esse dinheiro "volta" para o orçamento
    -- Exemplo: Orçamento $ 100, gastou $ 10 (dividido), acertou $ 5 → Disponível $ 95
    --
    -- Mas atenção: O orçamento não deve aumentar além do original!
    -- Vamos apenas registrar que o acerto foi feito, sem alterar o orçamento base
    --
    -- DECISÃO: Não alterar o orçamento automaticamente
    -- Motivo: Orçamento é um limite de gastos, não um saldo de conta
    -- Acertos são entre participantes, não afetam o orçamento total da viagem

    -- Log para debug (opcional)
    RAISE NOTICE 'Split % da viagem % foi marcado como pago. Valor: %',
      NEW.id, v_trip_id, v_settlement_amount;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_all_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  DELETE FROM trip_checklist; DELETE FROM trip_itinerary; DELETE FROM trip_participants;
  DELETE FROM trip_members; DELETE FROM trip_exchange_purchases; DELETE FROM trip_invitations;
  DELETE FROM trips; DELETE FROM transaction_splits; DELETE FROM transactions;
  DELETE FROM budgets; DELETE FROM goals; DELETE FROM assets; DELETE FROM accounts;
  DELETE FROM family_invitations; DELETE FROM family_members; DELETE FROM families;
  DELETE FROM notifications; DELETE FROM category_keywords; DELETE FROM user_category_learning;
  DELETE FROM categories WHERE user_id IS NOT NULL; DELETE FROM audit_log;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_single_user(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  DELETE FROM trip_checklist WHERE user_id = target_user_id;
  DELETE FROM trip_itinerary WHERE user_id = target_user_id;
  DELETE FROM trip_participants WHERE user_id = target_user_id;
  DELETE FROM trip_members WHERE user_id = target_user_id;
  DELETE FROM trip_exchange_purchases WHERE user_id = target_user_id;
  DELETE FROM trip_invitations WHERE from_user_id = target_user_id OR to_user_id = target_user_id;
  DELETE FROM trips WHERE owner_id = target_user_id;
  DELETE FROM transaction_splits WHERE user_id = target_user_id;
  DELETE FROM transactions WHERE user_id = target_user_id OR creator_user_id = target_user_id;
  DELETE FROM budgets WHERE user_id = target_user_id;
  DELETE FROM goals WHERE user_id = target_user_id;
  DELETE FROM assets WHERE user_id = target_user_id;
  DELETE FROM accounts WHERE user_id = target_user_id;
  DELETE FROM family_invitations WHERE from_user_id = target_user_id OR to_user_id = target_user_id;
  DELETE FROM family_members WHERE family_id IN (SELECT id FROM families WHERE owner_id = target_user_id);
  DELETE FROM families WHERE owner_id = target_user_id;
  DELETE FROM family_members WHERE user_id = target_user_id;
  DELETE FROM notifications WHERE user_id = target_user_id;
  DELETE FROM user_category_learning WHERE user_id = target_user_id;
  DELETE FROM categories WHERE user_id = target_user_id;
  DELETE FROM audit_log WHERE changed_by = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_default_account_to_orphans(p_default_account_id uuid, p_user_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_count bigint;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_user_id is distinct from v_uid then raise exception 'Cannot manage transactions for another user' using errcode = '42501'; end if;
  if not exists (select 1 from public.accounts where id = p_default_account_id and user_id = v_uid) then
    raise exception 'Conta padrao nao encontrada';
  end if;
  update public.transactions set account_id = p_default_account_id where account_id is null and user_id = v_uid;
  get diagnostics v_count = row_count;
  return v_count;
end; $function$;

CREATE OR REPLACE FUNCTION public.audit_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
  v_changed_fields TEXT[];
  v_key TEXT;
  v_action TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_values := to_jsonb(OLD);
    INSERT INTO audit_log (table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', v_old_values, auth.uid());
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);

    -- Identificar campos que mudaram
    v_changed_fields := ARRAY[]::TEXT[];
    FOR v_key IN SELECT jsonb_object_keys(v_new_values) LOOP
      IF v_old_values->v_key IS DISTINCT FROM v_new_values->v_key THEN
        v_changed_fields := array_append(v_changed_fields, v_key);
      END IF;
    END LOOP;

    IF array_length(v_changed_fields, 1) > 0 THEN
      -- Usa to_jsonb para checar deleted_at de forma genérica (funciona em tabelas sem a coluna)
      v_action := CASE
        WHEN (v_new_values->>'deleted_at') IS NOT NULL AND (v_old_values->>'deleted_at') IS NULL THEN 'SOFT_DELETE'
        WHEN (v_new_values->>'deleted_at') IS NULL AND (v_old_values->>'deleted_at') IS NOT NULL THEN 'RESTORE'
        ELSE 'UPDATE'
      END;

      INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_fields, changed_by)
      VALUES (TG_TABLE_NAME, NEW.id, v_action, v_old_values, v_new_values, v_changed_fields, auth.uid());
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    v_new_values := to_jsonb(NEW);
    INSERT INTO audit_log (table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', v_new_values, auth.uid());
    RETURN NEW;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_link_family_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.email IS NOT NULL AND NEW.linked_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM profiles
    WHERE email = NEW.email
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      NEW.linked_user_id := v_user_id;
      RAISE NOTICE 'Auto-vinculado membro % (%) ao usuário %',
        NEW.name, NEW.email, v_user_id;
    ELSE
      RAISE NOTICE 'Membro % (%) não tem conta no sistema ainda',
        NEW.name, NEW.email;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_balance_between_users(p_user1_id uuid, p_user2_id uuid, p_currency text DEFAULT 'BRL'::text)
 RETURNS TABLE(user1_owes numeric, user2_owes numeric, net_balance numeric, currency text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user1_debits AS (
    SELECT COALESCE(SUM(fl.amount), 0) AS total
    FROM public.financial_ledger fl
    WHERE fl.user_id = p_user1_id
      AND fl.related_user_id = p_user2_id
      AND fl.entry_type = 'DEBIT'
      AND fl.is_settled = FALSE
      AND fl.currency = p_currency
  ),
  user2_debits AS (
    SELECT COALESCE(SUM(fl.amount), 0) AS total
    FROM public.financial_ledger fl
    WHERE fl.user_id = p_user2_id
      AND fl.related_user_id = p_user1_id
      AND fl.entry_type = 'DEBIT'
      AND fl.is_settled = FALSE
      AND fl.currency = p_currency
  )
  SELECT
    u1.total AS user1_owes,
    u2.total AS user2_owes,
    u1.total - u2.total AS net_balance,
    p_currency AS currency
  FROM user1_debits u1, user2_debits u2;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_budget_spent(p_user_id uuid, p_category_id uuid, p_start_date date, p_end_date date, p_currency text DEFAULT 'BRL'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN COALESCE((
    SELECT SUM(amount)
    FROM public.transactions
    WHERE user_id = p_user_id
      AND type = 'EXPENSE'
      AND competence_date >= p_start_date
      AND competence_date <= p_end_date
      AND date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
      AND (
        (p_category_id IS NULL) OR
        (category_id = p_category_id)
      )
      AND (currency = p_currency OR (currency IS NULL AND p_currency = 'BRL'))
      AND source_transaction_id IS NULL
  ), 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_credit_card_competence_date(p_transaction_date date, p_closing_day integer, p_due_day integer)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_closing_day INTEGER;
  v_closing_month DATE;
BEGIN
  v_closing_day := COALESCE(p_closing_day, 1);

  -- competence_date = mês em que a fatura FECHA
  -- Se a transação foi feita ATÉ o closing_day, entra na fatura que fecha NESTE mês
  -- Se a transação foi feita DEPOIS do closing_day, entra na fatura que fecha NO PRÓXIMO mês

  IF EXTRACT(DAY FROM p_transaction_date) <= v_closing_day THEN
    -- Entra na fatura que fecha neste mês
    v_closing_month := DATE_TRUNC('month', p_transaction_date)::DATE;
  ELSE
    -- Entra na fatura que fecha no próximo mês
    v_closing_month := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month')::DATE;
  END IF;

  RETURN v_closing_month;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_credit_card_invoice(p_account_id uuid, p_start_date date, p_end_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'EXPENSE' THEN amount
      WHEN type = 'INCOME' THEN -amount -- Pagamentos/estornos
      ELSE 0
    END
  ), 0) INTO v_total
  FROM public.transactions
  WHERE account_id = p_account_id
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND source_transaction_id IS NULL;

  RETURN v_total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_member_balance(p_user_id uuid, p_member_id uuid)
 RETURNS TABLE(credits numeric, debits numeric, net_balance numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_credits NUMERIC := 0;
  v_debits NUMERIC := 0;
BEGIN
  -- CRÉDITOS: Splits onde EU paguei e o membro me deve (não quitados)
  SELECT COALESCE(SUM(ts.amount), 0) INTO v_credits
  FROM public.transaction_splits ts
  JOIN public.transactions t ON t.id = ts.transaction_id
  WHERE t.user_id = p_user_id
    AND ts.member_id = p_member_id
    AND ts.is_settled = false
    AND t.type = 'EXPENSE'
    AND t.source_transaction_id IS NULL;

  -- DÉBITOS: Transações espelhadas onde EU devo para o membro (não quitadas)
  SELECT COALESCE(SUM(t.amount), 0) INTO v_debits
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND t.source_transaction_id IS NOT NULL
    AND t.is_settled = false
    AND t.type = 'EXPENSE'
    AND EXISTS (
      SELECT 1 FROM public.transactions orig
      JOIN public.family_members fm ON (fm.user_id = orig.user_id OR fm.linked_user_id = orig.user_id)
      WHERE orig.id = t.source_transaction_id
        AND fm.id = p_member_id
    );

  RETURN QUERY SELECT v_credits, v_debits, v_credits - v_debits;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_single_account_balance(p_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_account_id is null then
    raise exception 'Account ID is required' using errcode = '22004';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_uid and deleted_at is null
  ) then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;

  update public.accounts
  set balance = (
    select coalesce(sum(case
      when type = 'INCOME'::public.transaction_type then amount
      when type = 'EXPENSE'::public.transaction_type then -amount
      when type = 'TRANSFER'::public.transaction_type
        and destination_account_id = p_account_id then amount
      when type = 'TRANSFER'::public.transaction_type
        and account_id = p_account_id then -amount
      else 0
    end), 0)
    from public.transactions
    where (account_id = p_account_id or destination_account_id = p_account_id)
      and deleted_at is null
  )
  where id = p_account_id and user_id = v_uid;
end;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_trip_spent(p_trip_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_spent NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(COALESCE(destination_amount, amount)), 0) INTO v_spent
  FROM public.transactions
  WHERE trip_id = p_trip_id
    AND type = 'EXPENSE'
    AND source_transaction_id IS NULL
    AND (p_user_id IS NULL OR user_id = p_user_id);

  RETURN v_spent;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cascade_delete_settlement_transactions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log the operation
  RAISE NOTICE 'Cascade deleting settlement transactions for split: %', OLD.id;

  -- Delete debtor settlement transaction if exists
  IF OLD.debtor_settlement_tx_id IS NOT NULL THEN
    DELETE FROM transactions
    WHERE id = OLD.debtor_settlement_tx_id;
    RAISE NOTICE 'Deleted debtor settlement transaction: %', OLD.debtor_settlement_tx_id;
  END IF;

  -- Delete creditor settlement transaction if exists
  IF OLD.creditor_settlement_tx_id IS NOT NULL THEN
    DELETE FROM transactions
    WHERE id = OLD.creditor_settlement_tx_id;
    RAISE NOTICE 'Deleted creditor settlement transaction: %', OLD.creditor_settlement_tx_id;
  END IF;

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cascade_soft_delete_settlement_transactions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se a transação for deletada logicamente
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Limpar do lado do devedor caso pertença ao devedor
    UPDATE transaction_splits
    SET debtor_settlement_tx_id = null, settled_by_debtor = false, is_settled = false
    WHERE debtor_settlement_tx_id = NEW.id;

    -- Limpar do lado do credor caso pertença ao credor
    UPDATE transaction_splits
    SET creditor_settlement_tx_id = null, settled_by_creditor = false, is_settled = false
    WHERE creditor_settlement_tx_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_account_dependencies(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_transaction_count integer;
  v_future_installments integer;
  v_open_shared_expenses integer;
  v_linked_goals integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_account_id is null then
    raise exception 'Account ID is required' using errcode = '22004';
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_uid and deleted_at is null
  ) then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;

  select count(*) into v_transaction_count
  from public.transactions
  where (account_id = p_account_id or destination_account_id = p_account_id)
    and deleted_at is null;

  select count(*) into v_future_installments
  from public.transactions
  where account_id = p_account_id
    and date > current_date
    and (series_id is not null or is_recurring = true)
    and deleted_at is null;

  select count(distinct s.id) into v_open_shared_expenses
  from public.transaction_splits s
  join public.transactions t on t.id = s.transaction_id
  where t.account_id = p_account_id
    and t.deleted_at is null
    and s.deleted_at is null
    and coalesce(s.is_settled, false) = false;

  select count(*) into v_linked_goals
  from public.goals
  where linked_account_id = p_account_id;

  return jsonb_build_object(
    'can_delete', (
      v_transaction_count = 0
      and v_open_shared_expenses = 0
      and v_linked_goals = 0
    ),
    'total_transactions', v_transaction_count,
    'future_installments', v_future_installments,
    'open_shared_expenses', v_open_shared_expenses,
    'linked_goals', v_linked_goals
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.check_member_settlement_before_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pending_debts INT;
    v_pending_credits INT;
BEGIN
    -- Verificar se o membro tem dívidas não pagas (como devedor)
    SELECT COUNT(*) INTO v_pending_debts
    FROM transaction_splits
    WHERE user_id = OLD.user_id AND is_settled = false;

    -- Verificar se o membro tem créditos a receber (como credor)
    SELECT COUNT(*) INTO v_pending_credits
    FROM transactions t
    JOIN transaction_splits ts ON ts.transaction_id = t.id
    WHERE t.user_id = OLD.user_id AND ts.is_settled = false;

    IF (v_pending_debts > 0 OR v_pending_credits > 0) THEN
        RAISE EXCEPTION 'Não é possível remover este membro. Existem % dívidas pendentes e % créditos a receber vinculados a ele.', v_pending_debts, v_pending_credits;
    END IF;

    RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_split_access(p_transaction_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_user_id is distinct from v_uid then return false; end if;
  return exists (
    select 1 from public.transactions t
    where t.id = p_transaction_id
      and (t.user_id = v_uid or t.creator_user_id = v_uid or t.payer_id = v_uid)
  );
end; $function$;

CREATE OR REPLACE FUNCTION public.clean_old_audit_logs(p_days_to_keep integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_deleted integer := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  DELETE FROM public.audit_log WHERE changed_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_pending_operations()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.pending_operations
  WHERE status IN ('COMPLETED', 'FAILED')
    AND updated_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_error_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Acesso negado: requer privilegios de administrador.'
      using errcode = '42501';
  end if;

  delete from public.error_logs;
end;
$function$;

CREATE OR REPLACE FUNCTION public.clear_pin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  UPDATE profiles
  SET
    app_pin_hash = NULL,
    require_pin_on_open = false
  WHERE id = auth.uid();

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_settlement(p_split_ids uuid[], p_account_id uuid, p_user_id uuid, p_is_receiving boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_total_amount NUMERIC := 0;
  v_tx_id UUID;
  v_confirmed_count INTEGER := 0;
BEGIN
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  END IF;

  -- Lock and verify all splits atomically
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT * INTO v_split FROM transaction_splits WHERE id = v_split_id FOR UPDATE;
    IF v_split IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
    END IF;
    IF v_split.is_settled THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi totalmente liquidado.');
    END IF;

    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

  -- Cria transação com domain = 'SHARED'
  INSERT INTO transactions (
    user_id, account_id, amount, type, description, date, domain, is_shared, created_at, updated_at
  ) VALUES (
    p_user_id, p_account_id, v_total_amount,
    CASE WHEN p_is_receiving THEN 'INCOME'::transaction_type ELSE 'EXPENSE'::transaction_type END,
    CASE WHEN p_is_receiving THEN 'Recebimento confirmado (Acerto)' ELSE 'Pagamento confirmado (Acerto)' END,
    CURRENT_DATE, 'SHARED'::transaction_domain, false, NOW(), NOW()
  )
  RETURNING id INTO v_tx_id;

  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    IF p_is_receiving THEN
      UPDATE transaction_splits SET
        settled_by_creditor = true,
        creditor_settlement_tx_id = v_tx_id,
        is_settled = true,
        settled_at = NOW()
      WHERE id = v_split_id;
    ELSE
      UPDATE transaction_splits SET
        settled_by_debtor = true,
        debtor_settlement_tx_id = v_tx_id,
        is_settled = true,
        settled_at = NOW()
      WHERE id = v_split_id;
    END IF;

    INSERT INTO audit_logs (table_name, record_id, operation, new_data, user_id)
    VALUES (
      'transaction_splits', v_split_id, 'SETTLEMENT_CONFIRMED',
      jsonb_build_object('amount', v_split.amount, 'currency', 'BRL', 'is_receiving', p_is_receiving, 'transaction_id', v_tx_id),
      p_user_id
    );
    v_confirmed_count := v_confirmed_count + 1;
  END LOOP;

  IF p_is_receiving THEN
    UPDATE accounts SET balance = balance + v_total_amount WHERE id = p_account_id;
  ELSE
    UPDATE accounts SET balance = balance - v_total_amount WHERE id = p_account_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'confirmed_count', v_confirmed_count,
    'total_amount', v_total_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_settlement_receipt(p_split_ids uuid[], p_creditor_id uuid, p_account_id uuid, p_date date, p_category_id uuid DEFAULT NULL::uuid, p_exchange_rate numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_split_record RECORD;
    v_tx_id UUID;
    v_total_confirmed_amount NUMERIC := 0;
    v_processed_count INTEGER := 0;
    v_account_currency TEXT;
    v_item_amount NUMERIC;
    v_item_currency TEXT;
    v_exchange_rate NUMERIC;
BEGIN
    -- Validar inputs
    IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nenhum item selecionado.');
    END IF;

    -- Buscar moeda da conta de destino
    SELECT currency INTO v_account_currency FROM public.accounts WHERE id = p_account_id;
    IF v_account_currency IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Conta de destino não encontrada.');
    END IF;

    -- Loop pelos splits para processar
    FOR v_split_record IN
        SELECT
            s.*,
            t.description as tx_description,
            t.currency as tx_currency,
            t.category_id as tx_category_id
        FROM public.transaction_splits s
        JOIN public.transactions t ON s.transaction_id = t.id
        WHERE s.id = ANY(p_split_ids)
    LOOP
        v_processed_count := v_processed_count + 1;
        v_item_currency := COALESCE(v_split_record.tx_currency, 'BRL');

        -- Calcular valores com base na moeda
        IF upper(v_account_currency) = upper(v_item_currency) THEN
            v_item_amount := v_split_record.amount;
            v_exchange_rate := NULL;

            -- Criar transação de crédito (mesma moeda)
            INSERT INTO public.transactions (
                user_id, creator_user_id, account_id, amount, description, date, competence_date,
                type, domain, category_id, is_shared, currency, related_member_id, notes
            ) VALUES (
                p_creditor_id, p_creditor_id, p_account_id, v_item_amount,
                'Recebimento: ' || v_split_record.tx_description, p_date, date_trunc('month', p_date)::DATE,
                'INCOME', 'SHARED', COALESCE(p_category_id, v_split_record.tx_category_id),
                false, v_item_currency, v_split_record.member_id,
                'Acerto confirmado pelo credor'
            ) RETURNING id INTO v_tx_id;
        ELSE
            -- Moedas diferentes! Exige taxa de câmbio
            v_exchange_rate := COALESCE(p_exchange_rate, 1.0);
            IF v_exchange_rate <= 0 THEN
                RETURN jsonb_build_object('success', false, 'error', 'Taxa de câmbio inválida.');
            END IF;

            -- Se a conta de destino for USD e o item for BRL:
            -- v_item_amount (USD) = split.amount (BRL) / exchange_rate (BRL/USD)
            v_item_amount := round(v_split_record.amount / v_exchange_rate, 2);

            -- Criar transação de crédito (multi-moeda)
            INSERT INTO public.transactions (
                user_id, creator_user_id, account_id, amount, description, date, competence_date,
                type, domain, category_id, is_shared, currency, related_member_id, notes,
                exchange_rate, destination_amount, destination_currency
            ) VALUES (
                p_creditor_id, p_creditor_id, p_account_id, v_item_amount,
                'Recebimento: ' || v_split_record.tx_description, p_date, date_trunc('month', p_date)::DATE,
                'INCOME', 'SHARED', COALESCE(p_category_id, v_split_record.tx_category_id),
                false, upper(v_account_currency), v_split_record.member_id,
                'Acerto confirmado pelo credor com conversão de câmbio',
                v_exchange_rate, v_split_record.amount, v_item_currency
            ) RETURNING id INTO v_tx_id;
        END IF;

        v_total_confirmed_amount := v_total_confirmed_amount + v_item_amount;

        -- Atualizar o split
        UPDATE public.transaction_splits
        SET
            settled_by_creditor = true,
            creditor_settlement_tx_id = v_tx_id,
            is_settled = CASE WHEN settled_by_debtor THEN true ELSE is_settled END,
            settled_at = CASE WHEN settled_by_debtor THEN NOW() ELSE settled_at END,
            settled_transaction_id = CASE WHEN settled_by_debtor THEN v_tx_id ELSE settled_transaction_id END
        WHERE id = v_split_record.id;
    END LOOP;

    -- Atualizar o saldo da conta
    IF v_total_confirmed_amount > 0 THEN
        UPDATE public.accounts
        SET balance = balance + v_total_confirmed_amount
        WHERE id = p_account_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'total_amount', v_total_confirmed_amount
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.contribute_to_goal(p_goal_id uuid, p_amount numeric, p_account_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id UUID;
  v_goal RECORD;
  v_new_amount NUMERIC;
  v_is_completed BOOLEAN;
  v_category_id UUID;
  v_account_currency TEXT;
  v_today TEXT;
  v_competence TEXT;
  v_tx_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'O valor deve ser diferente de zero';
  END IF;

  -- 1. Buscar meta (com lock para evitar race condition)
  SELECT current_amount, target_amount, name, linked_account_id
  INTO v_goal
  FROM public.goals
  WHERE id = p_goal_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada';
  END IF;

  -- 2. Validar resgate não excede saldo
  IF p_amount < 0 AND ABS(p_amount) > v_goal.current_amount THEN
    RAISE EXCEPTION 'Resgate de % excede o saldo disponível na meta (%)',
      ABS(p_amount), v_goal.current_amount;
  END IF;

  v_new_amount := v_goal.current_amount + p_amount;
  v_is_completed := v_new_amount >= v_goal.target_amount;

  -- 3. Se tem conta associada, criar transação financeira
  IF p_account_id IS NOT NULL OR v_goal.linked_account_id IS NOT NULL THEN
    -- Buscar moeda da conta
    SELECT currency INTO v_account_currency
    FROM public.accounts
    WHERE id = COALESCE(p_account_id, v_goal.linked_account_id)
      AND user_id = v_user_id;

    -- Buscar categoria "Metas"
    SELECT id INTO v_category_id
    FROM public.categories
    WHERE user_id = v_user_id
      AND name ILIKE '%meta%'
    LIMIT 1;

    v_today := to_char(NOW(), 'YYYY-MM-DD');
    v_competence := to_char(DATE_TRUNC('month', NOW()), 'YYYY-MM-DD');

    INSERT INTO public.transactions (
      user_id, creator_user_id, account_id, type, amount,
      description, category_id, date, competence_date,
      domain, is_shared, is_installment, is_recurring,
      currency, notes, goal_id
    ) VALUES (
      v_user_id, v_user_id,
      COALESCE(p_account_id, v_goal.linked_account_id),
      (CASE WHEN p_amount > 0 THEN 'EXPENSE' ELSE 'INCOME' END)::public.transaction_type,
      ABS(p_amount),
      COALESCE(p_description,
        CASE WHEN p_amount > 0
          THEN 'Aporte: ' || v_goal.name
          ELSE 'Resgate: ' || v_goal.name
        END
      ),
      v_category_id, v_today, v_competence,
      'PERSONAL'::public.transaction_domain, false, false, false,
      COALESCE(v_account_currency, 'BRL'),
      CASE WHEN p_amount > 0
        THEN 'Contribuição para a meta "' || v_goal.name || '"'
        ELSE 'Resgate da meta "' || v_goal.name || '" para a conta'
      END,
      p_goal_id
    )
    RETURNING id INTO v_tx_id;
  END IF;

  -- 4. Atualizar meta
  UPDATE public.goals
  SET current_amount = v_new_amount,
      status = CASE WHEN v_is_completed THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
      completed_at = CASE WHEN v_is_completed THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_goal_id;

  -- 5. Retornar resultado
  SELECT jsonb_build_object(
    'goal_id', p_goal_id,
    'current_amount', v_new_amount,
    'is_completed', v_is_completed,
    'transaction_id', v_tx_id
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_account_with_balance(p_name text, p_type text, p_initial_balance numeric DEFAULT 0, p_bank_id text DEFAULT NULL::text, p_bank_color text DEFAULT NULL::text, p_currency text DEFAULT 'BRL'::text, p_is_international boolean DEFAULT false, p_closing_day integer DEFAULT NULL::integer, p_due_day integer DEFAULT NULL::integer, p_credit_limit numeric DEFAULT NULL::numeric, p_yield_rate numeric DEFAULT NULL::numeric, p_yield_type text DEFAULT NULL::text, p_hide_balance boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id UUID;
  v_account_id UUID;
  v_category_id UUID;
  v_today DATE;
  v_competence DATE;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  INSERT INTO public.accounts (
    user_id, name, type, balance, initial_balance,
    bank_id, bank_color, currency, is_international,
    closing_day, due_day, credit_limit,
    yield_rate, yield_type, hide_balance
  ) VALUES (
    v_user_id, p_name, p_type::public.account_type, 0, 0,
    p_bank_id, p_bank_color, p_currency, p_is_international,
    p_closing_day, p_due_day, p_credit_limit,
    p_yield_rate, p_yield_type, p_hide_balance
  )
  RETURNING id INTO v_account_id;

  IF p_initial_balance > 0 AND p_type != 'CREDIT_CARD' THEN
    SELECT id INTO v_category_id
    FROM public.categories
    WHERE user_id = v_user_id
      AND name = 'Saldo Inicial'
      AND type = 'income'
    LIMIT 1;

    v_today := CURRENT_DATE;
    v_competence := DATE_TRUNC('month', CURRENT_DATE);

    INSERT INTO public.transactions (
      user_id, creator_user_id, account_id, type, amount,
      description, category_id, date, competence_date,
      domain, is_shared, is_installment, is_recurring
    ) VALUES (
      v_user_id, v_user_id, v_account_id, 'INCOME', p_initial_balance,
      'Saldo inicial', v_category_id, v_today, v_competence,
      'PERSONAL', false, false, false
    );
  END IF;

  SELECT row_to_json(a) INTO v_result
  FROM public.accounts a
  WHERE a.id = v_account_id;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_account_with_initial_deposit(p_name text, p_type text, p_bank text DEFAULT NULL::text, p_initial_balance numeric DEFAULT 0, p_currency text DEFAULT 'BRL'::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id UUID;
  v_transaction_id UUID;
  v_user_id UUID;
  v_account_type account_type;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_initial_balance < 0 THEN
    RAISE EXCEPTION 'Saldo inicial não pode ser negativo';
  END IF;

  -- Converter texto para enum
  v_account_type := p_type::account_type;

  -- Criar conta com bank_id
  -- FIX: Sempre gravar initial_balance = 0 pois vamos criar uma transação para representar esse valor
  INSERT INTO accounts (user_id, name, type, bank_id, balance, initial_balance, currency, is_active)
  VALUES (v_user_id, p_name, v_account_type, p_bank, 0, 0, p_currency, true)
  RETURNING id INTO v_account_id;

  -- Criar transação de depósito inicial se houver saldo
  IF p_initial_balance > 0 THEN
    INSERT INTO transactions (
      user_id, account_id, type, amount, description, date, category, domain
    ) VALUES (
      v_user_id, v_account_id, 'INCOME', p_initial_balance,
      'Depósito inicial', CURRENT_DATE, 'Depósito', 'PERSONAL'
    ) RETURNING id INTO v_transaction_id;

    -- Atualizar saldo da conta para refletir a transação
    -- (Embora o trigger update_account_balance_on_insert deva cuidar disso, garantimos aqui)
    PERFORM recalculate_account_balance(v_account_id);
  END IF;

  RETURN json_build_object(
    'success', true,
    'account_id', v_account_id,
    'initial_balance', p_initial_balance,
    'deposit_transaction_id', v_transaction_id,
    'has_initial_deposit', p_initial_balance > 0
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_installment_series(p_transactions jsonb, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_record jsonb;
  v_tx_id uuid;
  v_uid uuid := auth.uid();
  v_result jsonb;
  v_splits jsonb;
  v_created boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Cannot create transactions for another user' USING ERRCODE = '42501';
  END IF;

  FOR v_tx_record IN SELECT value FROM jsonb_array_elements(p_transactions)
  LOOP
    v_tx_id := NULL;
    INSERT INTO public.transactions (
      user_id, creator_user_id, amount, description, date, competence_date, type,
      account_id, category_id, is_shared, domain, payer_id, is_installment,
      is_recurring, recurrence_pattern, recurrence_day, total_installments,
      current_installment, series_id, trip_id, currency, notes, idempotency_key
    ) VALUES (
      v_uid, v_uid, (v_tx_record->>'amount')::numeric,
      v_tx_record->>'description', (v_tx_record->>'date')::date,
      (v_tx_record->>'competence_date')::date,
      (v_tx_record->>'type')::transaction_type,
      NULLIF(v_tx_record->>'account_id', '')::uuid,
      NULLIF(v_tx_record->>'category_id', '')::uuid,
      COALESCE((v_tx_record->>'is_shared')::boolean, false),
      COALESCE((v_tx_record->>'domain')::transaction_domain, 'PERSONAL'),
      NULLIF(v_tx_record->>'payer_id', '')::uuid,
      COALESCE((v_tx_record->>'is_installment')::boolean, true),
      COALESCE((v_tx_record->>'is_recurring')::boolean, false),
      NULLIF(v_tx_record->>'recurrence_pattern', ''),
      NULLIF(v_tx_record->>'recurrence_day', '')::integer,
      NULLIF(v_tx_record->>'total_installments', '')::integer,
      NULLIF(v_tx_record->>'current_installment', '')::integer,
      NULLIF(v_tx_record->>'series_id', '')::uuid,
      NULLIF(v_tx_record->>'trip_id', '')::uuid,
      NULLIF(v_tx_record->>'currency', ''), NULLIF(v_tx_record->>'notes', ''),
      NULLIF(v_tx_record->>'idempotency_key', '')
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING id INTO v_tx_id;

    v_created := v_tx_id IS NOT NULL;
    IF NOT v_created THEN
      SELECT id INTO v_tx_id FROM public.transactions
      WHERE user_id = v_uid
        AND idempotency_key = NULLIF(v_tx_record->>'idempotency_key', '');
    END IF;

    v_splits := v_tx_record->'splits';
    IF v_created AND v_splits IS NOT NULL AND jsonb_array_length(v_splits) > 0 THEN
      INSERT INTO public.transaction_splits (
        transaction_id, member_id, user_id, percentage, amount, name, is_settled
      )
      SELECT v_tx_id, NULLIF(split->>'member_id', '')::uuid,
        NULLIF(split->>'user_id', '')::uuid, (split->>'percentage')::numeric,
        (split->>'amount')::numeric, split->>'name',
        COALESCE((split->>'is_settled')::boolean, false)
      FROM jsonb_array_elements(v_splits) AS split;
    END IF;
  END LOOP;

  SELECT jsonb_agg(to_jsonb(t) ORDER BY t.date) INTO v_result
  FROM public.transactions t
  WHERE t.user_id = v_uid
    AND t.series_id = (p_transactions->0->>'series_id')::uuid;
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_installment_series_v2(p_transactions jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public.create_installment_series(p_transactions, private.authenticated_uid()) $function$;

CREATE OR REPLACE FUNCTION public.create_transaction_with_splits(p_transaction jsonb, p_splits jsonb DEFAULT '[]'::jsonb, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id uuid;
  v_uid uuid := auth.uid();
  v_result jsonb;
  v_created boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Cannot create a transaction for another user' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.transactions (
    user_id, creator_user_id, amount, description, date, competence_date, type,
    account_id, category_id, is_shared, domain, payer_id, is_installment,
    is_recurring, recurrence_pattern, recurrence_day, total_installments,
    current_installment, series_id, trip_id, currency, notes,
    destination_account_id, destination_amount, destination_currency,
    exchange_rate, related_member_id, is_refund, refund_of_transaction_id,
    import_hash, idempotency_key
  ) VALUES (
    v_uid, v_uid, (p_transaction->>'amount')::numeric,
    p_transaction->>'description', (p_transaction->>'date')::date,
    (p_transaction->>'competence_date')::date,
    (p_transaction->>'type')::transaction_type,
    NULLIF(p_transaction->>'account_id', '')::uuid,
    NULLIF(p_transaction->>'category_id', '')::uuid,
    COALESCE((p_transaction->>'is_shared')::boolean, false),
    COALESCE((p_transaction->>'domain')::transaction_domain, 'PERSONAL'),
    NULLIF(p_transaction->>'payer_id', '')::uuid,
    COALESCE((p_transaction->>'is_installment')::boolean, false),
    COALESCE((p_transaction->>'is_recurring')::boolean, false),
    NULLIF(p_transaction->>'recurrence_pattern', ''),
    NULLIF(p_transaction->>'recurrence_day', '')::integer,
    NULLIF(p_transaction->>'total_installments', '')::integer,
    NULLIF(p_transaction->>'current_installment', '')::integer,
    NULLIF(p_transaction->>'series_id', '')::uuid,
    NULLIF(p_transaction->>'trip_id', '')::uuid,
    NULLIF(p_transaction->>'currency', ''), NULLIF(p_transaction->>'notes', ''),
    NULLIF(p_transaction->>'destination_account_id', '')::uuid,
    NULLIF(p_transaction->>'destination_amount', '')::numeric,
    NULLIF(p_transaction->>'destination_currency', ''),
    NULLIF(p_transaction->>'exchange_rate', '')::numeric,
    NULLIF(p_transaction->>'related_member_id', '')::uuid,
    NULLIF(p_transaction->>'is_refund', '')::boolean,
    NULLIF(p_transaction->>'refund_of_transaction_id', '')::uuid,
    NULLIF(p_transaction->>'import_hash', ''),
    NULLIF(p_transaction->>'idempotency_key', '')
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_tx_id;

  v_created := v_tx_id IS NOT NULL;
  IF NOT v_created THEN
    SELECT id INTO v_tx_id FROM public.transactions
    WHERE user_id = v_uid
      AND idempotency_key = NULLIF(p_transaction->>'idempotency_key', '');
  END IF;

  IF v_created AND jsonb_array_length(COALESCE(p_splits, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.transaction_splits (
      transaction_id, member_id, user_id, percentage, amount, name, is_settled
    )
    SELECT v_tx_id, NULLIF(split->>'member_id', '')::uuid,
      NULLIF(split->>'user_id', '')::uuid, (split->>'percentage')::numeric,
      (split->>'amount')::numeric, split->>'name',
      COALESCE((split->>'is_settled')::boolean, false)
    FROM jsonb_array_elements(p_splits) AS split;
  END IF;

  SELECT to_jsonb(t) INTO v_result FROM public.transactions t WHERE t.id = v_tx_id;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_transaction_with_splits_v2(p_transaction jsonb, p_splits jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public.create_transaction_with_splits(p_transaction, p_splits, private.authenticated_uid()) $function$;

CREATE OR REPLACE FUNCTION public.create_trip_invitation_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trip_name TEXT;
  inviter_name TEXT;
BEGIN
  -- Buscar nome da viagem
  SELECT name INTO trip_name
  FROM trips
  WHERE id = NEW.trip_id;

  -- Buscar nome do convidador
  SELECT full_name INTO inviter_name
  FROM profiles
  WHERE id = NEW.inviter_id;

  -- Criar notificação para o convidado
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    icon,
    action_url,
    action_label,
    related_id,
    related_type,
    priority
  ) VALUES (
    NEW.invitee_id,
    'TRIP_INVITE',
    'Convite para viagem',
    COALESCE(inviter_name, 'Alguém') || ' convidou você para participar da viagem "' || COALESCE(trip_name, 'Sem nome') || '"',
    '✈️',
    '/viagens',
    'Ver convite',
    NEW.id,
    'trip_invitation',
    'HIGH'
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_installment_series(p_series_id uuid)
 RETURNS TABLE(deleted_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_creator_id UUID;
BEGIN
  v_user_id := auth.uid();
  SELECT creator_user_id INTO v_creator_id FROM transactions WHERE series_id = p_series_id LIMIT 1;
  IF v_creator_id IS NULL THEN RAISE EXCEPTION 'Série não encontrada'; END IF;
  IF v_creator_id != v_user_id THEN RAISE EXCEPTION 'Apenas o criador da série pode excluí-la'; END IF;
  RETURN QUERY
    WITH deleted AS (DELETE FROM transactions WHERE series_id = p_series_id AND date >= CURRENT_DATE RETURNING id)
    SELECT COUNT(*)::BIGINT FROM deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_pending_settlements()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_expired_count INTEGER := 0;
    v_split         RECORD;
BEGIN
    FOR v_split IN
        SELECT ts.id, ts.debtor_settlement_tx_id
        FROM transaction_splits ts
        WHERE ts.settled_by_debtor = true
          AND ts.is_settled = false
          AND ts.debtor_settlement_expires_at IS NOT NULL
          AND ts.debtor_settlement_expires_at < NOW()
    LOOP
        -- Reverte o split para pendente
        UPDATE transaction_splits
        SET settled_by_debtor = false,
            debtor_settlement_tx_id = NULL,
            debtor_settlement_expires_at = NULL
        WHERE id = v_split.id;

        -- Marca a transação de débito como deletada (soft delete)
        IF v_split.debtor_settlement_tx_id IS NOT NULL THEN
            UPDATE transactions
            SET deleted_at = NOW()
            WHERE id = v_split.debtor_settlement_tx_id
              AND deleted_at IS NULL;
        END IF;

        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'expired_count', v_expired_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fill_transaction_split_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se user_id não foi preenchido mas member_id foi
  IF NEW.user_id IS NULL AND NEW.member_id IS NOT NULL THEN
    -- Buscar linked_user_id do membro
    SELECT linked_user_id INTO NEW.user_id
    FROM family_members
    WHERE id = NEW.member_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_auto_update_trip_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.deleted, false) = false THEN
    IF CURRENT_DATE < NEW.start_date THEN
      IF NEW.status NOT IN ('CANCELLED') THEN
        NEW.status := 'PLANNING';
      END IF;
    ELSIF CURRENT_DATE BETWEEN NEW.start_date AND NEW.end_date THEN
      IF NEW.status NOT IN ('CANCELLED') THEN
        NEW.status := 'ACTIVE';
      END IF;
    ELSIF CURRENT_DATE > NEW.end_date THEN
      IF NEW.status NOT IN ('CANCELLED') THEN
        NEW.status := 'COMPLETED';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_notification(p_user_id uuid, p_title text, p_message text, p_type text, p_related_id text, p_metadata jsonb, p_link text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_related_uuid uuid;
BEGIN
    -- Tentar converter o p_related_id para UUID se for um UUID válido
    BEGIN
        v_related_uuid := p_related_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_related_uuid := NULL;
    END;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        related_id,
        related_type,
        metadata,
        action_url,
        is_read,
        created_at
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        v_related_uuid,
        CASE WHEN v_related_uuid IS NOT NULL THEN p_type ELSE NULL END,
        p_metadata,
        p_link,
        false,
        NOW()
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_notification(p_user_id uuid, p_title text, p_message text, p_type text, p_link text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.notifications (
        user_id, title, message, type, action_url, is_read, created_at
    ) VALUES (
        p_user_id, p_title, p_message, p_type, p_link, false, NOW()
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_handle_recurring_transactions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next_date DATE;
  v_next_competence DATE;
BEGIN
  -- Only process if:
  -- 1. Transaction is recurring
  -- 2. Not a mirror (has no source_transaction_id)
  -- 3. Not already generated (last_generated_date is NULL)
  IF NEW.is_recurring = true
     AND NEW.source_transaction_id IS NULL
     AND NEW.last_generated_date IS NULL
  THEN
    v_next_date := NEW.date + INTERVAL '1 month';
    v_next_competence := NEW.competence_date + INTERVAL '1 month';

    -- Avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM transactions
      WHERE user_id = NEW.user_id
        AND description = NEW.description
        AND date = v_next_date
        AND is_recurring = true
        AND source_transaction_id IS NULL
    ) THEN
      INSERT INTO transactions (
        user_id, creator_user_id, amount, description, date, competence_date,
        type, account_id, category_id, domain, is_shared, is_recurring,
        recurrence_pattern, recurrence_day, is_installment, source_transaction_id
      ) VALUES (
        NEW.user_id, NEW.creator_user_id, NEW.amount, NEW.description,
        v_next_date, v_next_competence, NEW.type, NEW.account_id, NEW.category_id,
        COALESCE(NEW.domain, 'PERSONAL'), NEW.is_shared, true,
        NEW.recurrence_pattern, NEW.recurrence_day, false, NEW.id
      );
    END IF;

    -- Mark as generated to prevent re-triggering
    UPDATE transactions SET last_generated_date = CURRENT_DATE WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_notify_shared_transaction_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_participant_id UUID;
BEGIN
    -- Se a transação é compartilhada (is_shared = true)
    IF OLD.is_shared = true OR NEW.is_shared = true THEN

        -- Notificar cada participante nos splits
        FOR v_participant_id IN
            SELECT DISTINCT user_id FROM public.transaction_splits
            WHERE transaction_id = COALESCE(NEW.id, OLD.id)
            AND user_id != auth.uid()
        LOOP
            PERFORM public.fn_create_notification(
                v_participant_id,
                CASE
                    WHEN TG_OP = 'UPDATE' THEN 'Despesa Alterada'
                    ELSE 'Despesa Excluída'
                END,
                CASE
                    WHEN TG_OP = 'UPDATE' THEN 'A despesa "' || OLD.description || '" que você divide foi alterada.'
                    ELSE 'A despesa "' || OLD.description || '" que você dividia foi removida.'
                END,
                'SHARED_EXPENSE',
                COALESCE(NEW.id, OLD.id)::TEXT,
                jsonb_build_object(
                    'transaction_id', COALESCE(NEW.id, OLD.id),
                    'operation', TG_OP
                ),
                '/compartilhados'
            );
        END LOOP;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_respond_family_invitation(p_invitation_id uuid, p_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_invitation RECORD;
BEGIN
  v_user_id := auth.uid();
  IF p_status NOT IN ('accepted', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Status inválido');
  END IF;
  SELECT * INTO v_invitation FROM family_invitations WHERE id = p_invitation_id;
  IF v_invitation IS NULL THEN RETURN json_build_object('success', false, 'error', 'Convite não encontrado'); END IF;
  IF v_invitation.to_user_id != v_user_id THEN RETURN json_build_object('success', false, 'error', 'Este convite não é para você'); END IF;
  IF v_invitation.status != 'pending' THEN RETURN json_build_object('success', false, 'error', 'Convite já respondido'); END IF;
  UPDATE family_invitations SET status = p_status, updated_at = NOW() WHERE id = p_invitation_id;
  IF p_status = 'accepted' THEN
    INSERT INTO family_members (family_id, linked_user_id, member_name, role)
    VALUES (v_invitation.family_id, v_user_id, v_invitation.member_name, v_invitation.role);
  END IF;
  RETURN json_build_object('success', true, 'status', p_status);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_respond_trip_invitation(p_invitation_id uuid, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_invitation RECORD;
    v_trip_name TEXT;
    v_invitee_name TEXT;
    v_result JSONB;
BEGIN
    -- Buscar dados do convite
    SELECT * INTO v_invitation FROM public.trip_invitations WHERE id = p_invitation_id;

    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Convite não encontrado';
    END IF;

    -- Validar se o usuário atual é o convidado
    IF v_invitation.invitee_id != auth.uid() THEN
        RAISE EXCEPTION 'Acesso negado: Você não tem permissão para responder a este convite.';
    END IF;

    IF v_invitation.status != 'pending' THEN
        RAISE EXCEPTION 'Este convite já foi respondido';
    END IF;

    -- Buscar nomes para notificação
    SELECT name INTO v_trip_name FROM public.trips WHERE id = v_invitation.trip_id;
    SELECT full_name INTO v_invitee_name FROM public.profiles WHERE id = v_invitation.invitee_id;

    -- Atualizar status do convite
    UPDATE public.trip_invitations
    SET status = p_status,
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invitation_id;

    IF p_status = 'accepted' THEN
        -- Adicionar em trip_members
        INSERT INTO public.trip_members (trip_id, user_id, role, status)
        VALUES (v_invitation.trip_id, v_invitation.invitee_id, 'member', 'active')
        ON CONFLICT (trip_id, user_id) DO UPDATE SET status = 'active';

        -- Notificar o convidador
        PERFORM public.fn_create_notification(
            v_invitation.inviter_id,
            'Convite Aceito',
            COALESCE(v_invitee_name, 'Alguém') || ' aceitou seu convite para a viagem "' || COALESCE(v_trip_name, 'Sem nome') || '".',
            'GENERAL',
            v_invitation.trip_id::TEXT,
            jsonb_build_object('trip_id', v_invitation.trip_id),
            '/viagens'
        );
    ELSE
        -- Notificar o convidador da rejeição
        PERFORM public.fn_create_notification(
            v_invitation.inviter_id,
            'Convite Recusado',
            COALESCE(v_invitee_name, 'Alguém') || ' recusou seu convite para a viagem "' || COALESCE(v_trip_name, 'Sem nome') || '".',
            'GENERAL',
            v_invitation.trip_id::TEXT,
            jsonb_build_object('trip_id', v_invitation.trip_id),
            '/viagens'
        );
    END IF;

    -- Limpar notificação do convidado
    UPDATE public.notifications
    SET is_read = true, read_at = NOW(), is_dismissed = true, dismissed_at = NOW()
    WHERE related_id = p_invitation_id AND related_type = 'trip_invitation';

    RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sanitize_transaction_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_category_name TEXT;
    v_category_type TEXT;
    v_target_category_id UUID;
    v_is_income BOOLEAN;
    v_is_settlement BOOLEAN;
BEGIN
    -- Determinar se é receita ou despesa
    v_is_income := (NEW.type = 'INCOME' OR NEW.type = 'DEPOSIT');

    -- Determinar se é acerto de compartilhamento
    v_is_settlement := (
        NEW.is_settled = true
        OR NEW.description ILIKE '%acerto%'
        OR NEW.description ILIKE '%compensação%'
        OR NEW.description ILIKE '%liquidação%'
        OR NEW.description ILIKE '%compensacao%'
    );

    -- Caso 1: category_id é fornecido
    IF NEW.category_id IS NOT NULL THEN
        -- Verificar se a categoria pertence ao usuário da transação
        SELECT name, type INTO v_category_name, v_category_type
        FROM public.categories
        WHERE id = NEW.category_id AND user_id = NEW.user_id;

        -- Se a categoria não pertence ao usuário da transação (pode ser de outro usuário)
        IF v_category_name IS NULL THEN
            -- Buscar o nome e tipo da categoria original usando privilégios de SECURITY DEFINER
            SELECT name, type INTO v_category_name, v_category_type
            FROM public.categories
            WHERE id = NEW.category_id;

            IF v_category_name IS NOT NULL THEN
                -- Tentar encontrar uma categoria correspondente com o mesmo nome e tipo para o usuário da transação
                SELECT id INTO v_target_category_id
                FROM public.categories
                WHERE user_id = NEW.user_id
                  AND lower(name) = lower(v_category_name)
                  AND lower(type) = lower(v_category_type)
                LIMIT 1;

                IF v_target_category_id IS NOT NULL THEN
                    NEW.category_id := v_target_category_id;
                ELSE
                    -- Não encontrou por nome, forçar re-avaliação como nulo
                    v_category_name := NULL;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Caso 2: category_id é nulo OU falhou na resolução por nome
    IF NEW.category_id IS NULL OR v_category_name IS NULL THEN
        -- Se for acerto financeiro
        IF v_is_settlement THEN
            SELECT id INTO v_target_category_id
            FROM public.categories
            WHERE user_id = NEW.user_id
              AND name = 'Acerto Financeiro'
              AND type = CASE WHEN v_is_income THEN 'income' ELSE 'expense' END
            LIMIT 1;
        END IF;

        -- Se não for acerto ou não encontrou a categoria de acerto, usar "Outros"
        IF v_target_category_id IS NULL THEN
            SELECT id INTO v_target_category_id
            FROM public.categories
            WHERE user_id = NEW.user_id
              AND name = 'Outros'
              AND type = CASE WHEN v_is_income THEN 'income' ELSE 'expense' END
            LIMIT 1;
        END IF;

        -- Atribuir a categoria sanitizada
        IF v_target_category_id IS NOT NULL THEN
            NEW.category_id := v_target_category_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sync_asset_summary()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_quantity NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_avg_price NUMERIC := 0;
    v_asset_id UUID;
    r RECORD;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_asset_id := OLD.asset_id;
    ELSE
        v_asset_id := NEW.asset_id;
    END IF;

    FOR r IN (SELECT type, quantity, price FROM public.asset_transactions WHERE asset_id = v_asset_id ORDER BY date ASC, created_at ASC) LOOP
        IF r.type = 'BUY' THEN
            v_total_cost := v_total_cost + (r.quantity * r.price);
            v_total_quantity := v_total_quantity + r.quantity;
        ELSIF r.type = 'SELL' THEN
            IF v_total_quantity > 0 THEN
                v_avg_price := v_total_cost / v_total_quantity;
                v_total_quantity := v_total_quantity - r.quantity;
                v_total_cost := v_total_quantity * v_avg_price;
            END IF;
        END IF;
    END LOOP;

    IF v_total_quantity > 0 THEN
        v_avg_price := v_total_cost / v_total_quantity;
    ELSE
        v_avg_price := 0;
        v_total_quantity := 0;
    END IF;

    UPDATE public.assets
    SET
        quantity = v_total_quantity,
        purchase_price = v_avg_price, -- purchase_price é o PM na sua tabela
        updated_at = NOW()
    WHERE id = v_asset_id;

    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_trg_goal_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        PERFORM public.fn_create_notification(
            NEW.user_id,
            'Meta Atingida! 🎉',
            'Parabéns! Você alcançou o objetivo: ' || NEW.name,
            'GOAL',
            '/goals'
        );
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_pending_recurring_transactions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
  v_last_date DATE;
  v_next_date DATE;
  v_next_competence DATE;
  v_interval TEXT;
BEGIN
  -- Find all original recurring transactions (not copies/generated ones)
  FOR r IN
    SELECT t.id, t.user_id, t.creator_user_id, t.amount, t.description,
           t.type, t.account_id, t.category_id, t.domain, t.is_shared,
           t.recurrence_pattern, t.recurrence_day, t.competence_date, t.currency,
           t.last_generated_date,
           COALESCE(
             (SELECT MAX(t2.date) FROM public.transactions t2
              WHERE t2.source_transaction_id = t.id
                 OR (t2.description = t.description
                     AND t2.account_id = t.account_id
                     AND t2.is_recurring = true)),
             t.date
           ) AS most_recent_date
    FROM public.transactions t
    WHERE t.is_recurring = true
      AND t.source_transaction_id IS NULL
      AND t.deleted_at IS NULL
      AND t.last_generated_date IS NOT NULL  -- already processed at least once
      AND t.last_generated_date < CURRENT_DATE - INTERVAL '1 day'
  LOOP
    -- Calculate interval based on pattern
    v_interval := UPPER(COALESCE(r.recurrence_pattern, 'MONTHLY'));
    v_next_date := r.most_recent_date;

    CASE v_interval
      WHEN 'DAILY'   THEN v_next_date := v_next_date + INTERVAL '1 day';
      WHEN 'WEEKLY'  THEN v_next_date := v_next_date + INTERVAL '7 days';
      WHEN 'MONTHLY' THEN v_next_date := v_next_date + INTERVAL '1 month';
      WHEN 'YEARLY'  THEN v_next_date := v_next_date + INTERVAL '1 year';
      ELSE v_next_date := v_next_date + INTERVAL '1 month'; -- default monthly
    END CASE;

    -- Only generate if the expected next date has already passed
    IF v_next_date <= CURRENT_DATE THEN
      v_next_competence := DATE_TRUNC('month', v_next_date)::date;

      -- Avoid duplicate
      IF NOT EXISTS (
        SELECT 1 FROM public.transactions t2
        WHERE t2.user_id = r.user_id
          AND t2.description = r.description
          AND t2.date = v_next_date
          AND t2.is_recurring = true
          AND t2.deleted_at IS NULL
      ) THEN
        INSERT INTO public.transactions (
          user_id, creator_user_id, amount, description, date, competence_date,
          type, account_id, category_id, domain, is_shared, is_recurring,
          recurrence_pattern, recurrence_day, currency
        ) VALUES (
          r.user_id, r.creator_user_id, r.amount, r.description,
          v_next_date, v_next_competence, r.type, r.account_id, r.category_id,
          COALESCE(r.domain, 'PERSONAL'), r.is_shared, true,
          r.recurrence_pattern, r.recurrence_day, r.currency
        );

        v_count := v_count + 1;
      END IF;

      -- Mark original as processed so we don't re-check immediately
      UPDATE public.transactions
      SET last_generated_date = CURRENT_DATE
      WHERE id = r.id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_account_balance_at_date(p_account_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_initial_balance NUMERIC;
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(initial_balance, 0) INTO v_initial_balance
  FROM public.accounts WHERE id = p_account_id;

  SELECT v_initial_balance + COALESCE(SUM(
    CASE
      WHEN type = 'INCOME' THEN amount
      WHEN type = 'EXPENSE' THEN -amount
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN amount
      ELSE 0
    END
  ), 0) INTO v_balance
  FROM public.transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND (
      payer_id IS NULL
      OR payer_id = ANY(
        ARRAY(SELECT id FROM public.family_members WHERE user_id = public.transactions.user_id)
      )
    )
    AND date <= p_date
    AND deleted_at IS NULL;

  RETURN v_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_account_balance_at_date_v2(p_account_id uuid, p_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := private.authenticated_uid();
begin
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_uid and deleted_at is null
  ) then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;
  return public.get_account_balance_at_date(p_account_id, p_date);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_actual_closing_date(p_year_month date, p_closing_day integer, p_mode text)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_day DATE;
  v_result DATE;
BEGIN
  p_mode := COALESCE(p_mode, 'FIXED_DAY');
  p_closing_day := COALESCE(p_closing_day, 1);

  CASE p_mode
    WHEN 'LAST_DAY' THEN
      v_result := (DATE_TRUNC('month', p_year_month) + INTERVAL '1 month' - INTERVAL '1 day')::date;

    WHEN 'LAST_BUSINESS_DAY' THEN
      v_last_day := (DATE_TRUNC('month', p_year_month) + INTERVAL '1 month' - INTERVAL '1 day')::date;
      WHILE EXTRACT(DOW FROM v_last_day) IN (0, 6) LOOP
        v_last_day := v_last_day - INTERVAL '1 day';
      END LOOP;
      v_result := v_last_day;

    ELSE -- FIXED_DAY
      v_result := (DATE_TRUNC('month', p_year_month) +
        make_interval(days => LEAST(p_closing_day,
          EXTRACT(DAY FROM (DATE_TRUNC('month', p_year_month) + INTERVAL '1 month' - INTERVAL '1 day'))::int) - 1))::date;
  END CASE;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_audit_logs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT COALESCE(jsonb_agg(l ORDER BY l.changed_at DESC), '[]'::jsonb) INTO v_result
  FROM (SELECT * FROM public.audit_log ORDER BY changed_at DESC LIMIT 500) l;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_error_logs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: requer privilegios de administrador.' using errcode = '42501';
  end if;
  select jsonb_agg(jsonb_build_object(
    'id', e.id, 'user_id', e.user_id, 'user_email', p.email,
    'error_message', e.message, 'stack_trace', e.stack,
    'context', coalesce(e.url, e.extra::text), 'status', e.status,
    'created_at', e.created_at, 'updated_at', e.updated_at
  ) order by e.created_at desc)
  into v_result
  from public.error_logs e left join public.profiles p on p.id = e.user_id;
  return coalesce(v_result, '[]'::jsonb);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_system_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN jsonb_build_object(
    'totalUsers', (SELECT COUNT(*) FROM profiles),
    'totalTransactions', (SELECT COUNT(*) FROM transactions WHERE COALESCE(deleted, false) = false),
    'totalVolume', COALESCE((SELECT SUM(amount) FROM transactions WHERE COALESCE(deleted, false) = false AND COALESCE(currency, 'BRL') = 'BRL'), 0),
    'totalAccounts', (SELECT COUNT(*) FROM accounts WHERE COALESCE(deleted, false) = false),
    'totalFamilies', (SELECT COUNT(*) FROM families),
    'totalAssets', (SELECT COUNT(*) FROM assets)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_user_dossier(target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = target_user_id),
    'accounts', (SELECT COALESCE(jsonb_agg(a), '[]') FROM accounts a WHERE a.user_id = target_user_id AND COALESCE(a.deleted,false)=false),
    'transactionCount', (SELECT COUNT(*) FROM transactions t WHERE t.user_id = target_user_id AND COALESCE(t.deleted,false)=false)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_users_detailed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT COALESCE(jsonb_agg(u), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      p.id, p.email, p.full_name, p.created_at,
      COALESCE((SELECT COUNT(*)::int FROM accounts a WHERE a.user_id = p.id AND COALESCE(a.deleted,false)=false), 0) AS "accountsCount",
      COALESCE((SELECT COUNT(*)::int FROM transactions t WHERE t.user_id = p.id AND COALESCE(t.deleted,false)=false), 0) AS "transactionsCount"
    FROM profiles p
    ORDER BY p.created_at DESC
  ) u;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_asset_performance(p_asset_id uuid)
 RETURNS TABLE(asset_id uuid, invested_amount numeric, current_value numeric, profit_loss numeric, profit_loss_percentage numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    (a.quantity * a.purchase_price) as invested,
    (a.quantity * a.current_price) as current_val,
    (a.quantity * a.current_price) - (a.quantity * a.purchase_price) as pl,
    CASE
      WHEN (a.quantity * a.purchase_price) > 0
      THEN (((a.quantity * a.current_price) - (a.quantity * a.purchase_price)) / (a.quantity * a.purchase_price) * 100)
      ELSE 0
    END as pl_percentage
  FROM assets a
  WHERE a.id = p_asset_id AND a.user_id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_credit_card_invoice(p_account_id uuid, p_user_id uuid, p_month_start date, p_month_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_result JSONB;
BEGIN
    WITH invoice_tx AS (
        SELECT
            t.id, t.description, t.amount, t.date, t.type,
            t.current_installment, t.total_installments, t.series_id,
            t.is_shared, t.currency, t.account_id, t.destination_account_id,
            t.user_id,
            jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon) AS category,
            jsonb_build_object('id', p.id, 'name', p.full_name, 'avatar_url', p.avatar_url) AS creator
        FROM transactions t
        LEFT JOIN categories cat ON cat.id = t.category_id
        LEFT JOIN profiles p ON p.id = t.user_id
        WHERE (
            t.user_id = p_user_id
            OR
            p_user_id = (SELECT user_id FROM accounts WHERE id = p_account_id)
          )
          AND (
            -- Transações onde este cartão é a conta principal (gastos)
            (t.account_id = p_account_id AND t.source_transaction_id IS NULL)
            OR
            -- Pagamentos de fatura (transferências para este cartão)
            (t.destination_account_id = p_account_id AND t.type = 'TRANSFER')
          )
          AND t.deleted_at IS NULL
          AND t.competence_date >= p_month_start
          AND t.competence_date <= p_month_end
        ORDER BY t.date DESC
        LIMIT 200
    )
    SELECT jsonb_build_object(
        'total',        COALESCE(SUM(
                            CASE
                                WHEN type = 'EXPENSE' THEN amount
                                WHEN type = 'INCOME' THEN -amount
                                WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN -amount
                                WHEN type = 'TRANSFER' AND account_id = p_account_id THEN amount
                                ELSE 0
                            END
                        ), 0),
        'tx_count',     COUNT(*),
        'transactions', COALESCE(jsonb_agg(row_to_json(i)::jsonb), '[]'::jsonb)
    ) INTO v_result FROM invoice_tx i;

    RETURN COALESCE(v_result, '{"total":0,"tx_count":0,"transactions":[]}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_shared_debts(p_user_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(member_id uuid, currency text, total_credits numeric, total_debits numeric, net_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH
    -- IDs dos family_members que representam o próprio usuário
    my_member_ids AS (
        SELECT fm.id AS fmid
        FROM family_members fm
        WHERE fm.linked_user_id = p_user_id
          AND fm.removed_at IS NULL
    ),

    -- CRÉDITOS: eu paguei, outras pessoas têm split pendente (elas me devem)
    -- member_id retornado = family_members.id da outra pessoa
    creds AS (
        SELECT
            ts.member_id                        AS mem_id,
            COALESCE(t.currency, 'BRL')         AS cur,
            SUM(ts.amount)                      AS amt
        FROM transactions t
        JOIN transaction_splits ts ON ts.transaction_id = t.id
        WHERE
            t.user_id  = p_user_id
            AND t.type = 'EXPENSE'
            AND t.deleted_at IS NULL
            AND ts.deleted_at IS NULL
            AND ts.member_id NOT IN (SELECT fmid FROM my_member_ids)
            AND ts.is_settled        = false
            AND ts.settled_by_creditor = false
            AND (
                p_start_date IS NULL
                OR COALESCE(t.competence_date, t.date) >= p_start_date
            )
            AND (
                p_end_date IS NULL
                OR COALESCE(t.competence_date, t.date) <= p_end_date
            )
        GROUP BY ts.member_id, t.currency
    ),

    -- DÉBITOS: outra pessoa pagou, eu tenho split pendente (eu devo)
    -- member_id retornado = family_members.id de QUEM PAGOU (a outra pessoa)
    debs AS (
        SELECT
            (
                SELECT fm2.id
                FROM family_members fm2
                WHERE fm2.linked_user_id = t.user_id
                  AND fm2.removed_at IS NULL
                LIMIT 1
            )                                   AS mem_id,
            COALESCE(t.currency, 'BRL')         AS cur,
            SUM(ts.amount)                      AS amt
        FROM transactions t
        JOIN transaction_splits ts ON ts.transaction_id = t.id
        WHERE
            t.user_id  != p_user_id
            AND t.type  = 'EXPENSE'
            AND t.deleted_at IS NULL
            AND ts.deleted_at IS NULL
            AND ts.member_id IN (SELECT fmid FROM my_member_ids)
            AND ts.is_settled        = false
            AND ts.settled_by_debtor = false
            AND (
                p_start_date IS NULL
                OR COALESCE(t.competence_date, t.date) >= p_start_date
            )
            AND (
                p_end_date IS NULL
                OR COALESCE(t.competence_date, t.date) <= p_end_date
            )
        GROUP BY t.user_id, t.currency
    ),

    -- Une créditos e débitos
    combined AS (
        SELECT mem_id, cur, amt AS credit_amt, 0::NUMERIC AS debit_amt FROM creds
        UNION ALL
        SELECT mem_id, cur, 0::NUMERIC,        amt          FROM debs
    ),

    totals AS (
        SELECT
            c.mem_id,
            c.cur,
            SUM(c.credit_amt) AS tot_credits,
            SUM(c.debit_amt)  AS tot_debits
        FROM combined c
        WHERE c.mem_id IS NOT NULL
        GROUP BY c.mem_id, c.cur
    )

    SELECT
        t.mem_id                           AS member_id,
        t.cur                              AS currency,
        t.tot_credits                      AS total_credits,
        t.tot_debits                       AS total_debits,
        (t.tot_credits - t.tot_debits)     AS net_balance
    FROM totals t
    WHERE t.tot_credits > 0 OR t.tot_debits > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_shared_debts_v2(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(member_id uuid, currency text, total_credits numeric, total_debits numeric, net_balance numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select * from public.get_current_shared_debts(private.authenticated_uid(), p_start_date, p_end_date) $function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_member_id UUID;
BEGIN
    IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

    SELECT id INTO v_member_id
    FROM public.family_members
    WHERE linked_user_id = p_user_id
    LIMIT 1;

    WITH tx_raw AS (
        SELECT
            t.type,
            t.amount,
            t.is_refund,
            COALESCE(t.currency, 'BRL') as currency,
            COALESCE(t.competence_date, t.date) AS ref_date
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = p_user_id
          AND t.deleted_at IS NULL
          AND t.source_transaction_id IS NULL
          AND t.type != 'TRANSFER'
          AND COALESCE(a.type, 'CHECKING') != 'CREDIT_CARD'
          AND (
            t.payer_id IS NULL
            OR (v_member_id IS NOT NULL AND t.payer_id = v_member_id)
          )
    ),
    tx AS (
        SELECT * FROM tx_raw
        WHERE ref_date >= p_start_date AND ref_date <= p_end_date
    ),
    recent AS (
        SELECT t.id, t.type, t.amount, COALESCE(t.currency, 'BRL') as currency, t.date, t.description,
               t.is_shared, t.payer_id, t.account_id, t.source_transaction_id,
               jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon) AS category,
               jsonb_build_object('id', acc.id, 'name', acc.name, 'currency', COALESCE(acc.currency, 'BRL')) AS account
        FROM transactions t
        LEFT JOIN categories cat ON cat.id = t.category_id
        LEFT JOIN accounts acc ON acc.id = t.account_id
        WHERE t.deleted_at IS NULL
          AND t.source_transaction_id IS NULL
          AND t.status != 'PENDING'
          AND COALESCE(t.competence_date, t.date) >= p_start_date
          AND COALESCE(t.competence_date, t.date) <= p_end_date
          AND t.date <= CURRENT_DATE
          AND (
            (t.user_id = p_user_id AND t.payer_id IS NULL)
            OR (v_member_id IS NOT NULL AND t.payer_id = v_member_id)
          )
        ORDER BY t.created_at DESC
        LIMIT 5
    ),
    totals_by_curr AS (
        SELECT
            currency,
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND (is_refund IS FALSE OR is_refund IS NULL) AND ref_date <= CURRENT_DATE), 0) AS income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND ref_date <= CURRENT_DATE), 0) -
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND is_refund IS TRUE AND ref_date <= CURRENT_DATE), 0) AS expense,
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND ref_date > CURRENT_DATE), 0) AS pending_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND ref_date > CURRENT_DATE), 0) AS pending_expense
        FROM tx
        GROUP BY currency
    ),
    totals_brl AS (
        SELECT
            COALESCE((SELECT income FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_income,
            COALESCE((SELECT expense FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_expense,
            COALESCE((SELECT pending_income FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_pending_income,
            COALESCE((SELECT pending_expense FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_pending_expense
    )
    SELECT jsonb_build_object(
        'total_income',    (SELECT total_income FROM totals_brl),
        'total_expense',   (SELECT total_expense FROM totals_brl),
        'pending_income',  (SELECT total_pending_income FROM totals_brl),
        'pending_expense', (SELECT total_pending_expense FROM totals_brl),
        'balance',         (SELECT total_income - total_expense FROM totals_brl),
        'totals_by_currency', COALESCE((SELECT jsonb_agg(jsonb_build_object('currency', currency, 'income', income, 'expense', expense, 'pending_income', pending_income, 'pending_expense', pending_expense, 'balance', income - expense)) FROM totals_by_curr), '[]'::jsonb),
        'recent_transactions', COALESCE((SELECT jsonb_agg(r) FROM recent r), '[]'::jsonb)
    ) INTO v_result;

    RETURN COALESCE(v_result, '{"total_income":0,"total_expense":0,"pending_income":0,"pending_expense":0,"balance":0,"totals_by_currency":[],"recent_transactions":[]}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary_v2(p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public.get_dashboard_summary(private.authenticated_uid(), p_start_date, p_end_date) $function$;

CREATE OR REPLACE FUNCTION public.get_expenses_by_category(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(category_id uuid, category_name text, category_icon text, total_amount numeric, transaction_count bigint, percentage numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total NUMERIC;
BEGIN
  -- Calcular total geral primeiro (APENAS até hoje)
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'EXPENSE'
    AND competence_date >= p_start_date
    AND competence_date <= p_end_date
    AND date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
    AND source_transaction_id IS NULL;

  RETURN QUERY
  SELECT
    c.id AS category_id,
    COALESCE(c.name, 'Sem categoria') AS category_name,
    c.icon AS category_icon,
    COALESCE(SUM(t.amount), 0) AS total_amount,
    COUNT(t.id) AS transaction_count,
    CASE
      WHEN v_total > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / v_total) * 100, 2)
      ELSE 0
    END AS percentage
  FROM public.transactions t
  LEFT JOIN public.categories c ON c.id = t.category_id
  WHERE t.user_id = p_user_id
    AND t.type = 'EXPENSE'
    AND t.competence_date >= p_start_date
    AND t.competence_date <= p_end_date
    AND t.date <= CURRENT_DATE  -- ✅ FIX: Ignorar transações futuras
    AND t.source_transaction_id IS NULL
  GROUP BY c.id, c.name, c.icon
  ORDER BY total_amount DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_family_consolidated_summary(p_family_id uuid, p_month_start date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date)
 RETURNS TABLE(member_id uuid, linked_user_id uuid, member_name text, balance numeric, patrimony numeric, income numeric, expense numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_family_id uuid;
  v_month_end date;
BEGIN
  -- Verificar que o chamador pertence à mesma família
  SELECT fm.family_id INTO v_caller_family_id
  FROM family_members fm
  WHERE fm.linked_user_id = auth.uid()
    AND fm.family_id = p_family_id
  LIMIT 1;

  IF v_caller_family_id IS NULL THEN
    -- Verificar se é o owner da família
    SELECT f.id INTO v_caller_family_id
    FROM families f
    WHERE f.id = p_family_id AND f.owner_id = auth.uid()
    LIMIT 1;
  END IF;

  IF v_caller_family_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: não pertence a esta família';
  END IF;

  v_month_end := (p_month_start + interval '1 month - 1 day')::date;

  RETURN QUERY
  SELECT
    fm.id                                    AS member_id,
    fm.linked_user_id                        AS linked_user_id,
    COALESCE(p.full_name, p.email, 'Membro') AS member_name,

    -- Saldo: soma das contas correntes/poupança (excluindo investimento e reserva)
    COALESCE((
      SELECT SUM(a.balance)
      FROM accounts a
      WHERE a.user_id = fm.linked_user_id
        AND a.deleted_at IS NULL
        AND a.type NOT IN ('CREDIT_CARD','INVESTMENT','EMERGENCY_FUND')
        AND a.currency = 'BRL'
    ), 0) AS balance,

    -- Patrimônio: todas as contas não-cartão
    COALESCE((
      SELECT SUM(a.balance)
      FROM accounts a
      WHERE a.user_id = fm.linked_user_id
        AND a.deleted_at IS NULL
        AND a.type != 'CREDIT_CARD'
        AND a.currency = 'BRL'
    ), 0) AS patrimony,

    -- Receita do mês
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions t
      WHERE t.user_id = fm.linked_user_id
        AND t.deleted_at IS NULL
        AND t.type = 'INCOME'
        AND t.date BETWEEN p_month_start AND v_month_end
        AND t.currency = 'BRL'
    ), 0) AS income,

    -- Despesa do mês
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions t
      WHERE t.user_id = fm.linked_user_id
        AND t.deleted_at IS NULL
        AND t.type = 'EXPENSE'
        AND t.date BETWEEN p_month_start AND v_month_end
        AND t.currency = 'BRL'
    ), 0) AS expense

  FROM family_members fm
  JOIN profiles p ON p.id = fm.linked_user_id
  WHERE fm.family_id = p_family_id
    AND fm.linked_user_id IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_goal_progress(p_goal_id uuid)
 RETURNS TABLE(goal_id uuid, target_amount numeric, current_amount numeric, remaining_amount numeric, percentage_complete numeric, days_remaining integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.target_amount,
    g.current_amount,
    g.target_amount - g.current_amount as remaining,
    CASE
      WHEN g.target_amount > 0 THEN (g.current_amount / g.target_amount * 100)
      ELSE 0
    END as percentage,
    CASE
      WHEN g.target_date IS NOT NULL THEN (g.target_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_left
  FROM goals g
  WHERE g.id = p_goal_id AND g.user_id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_evolution(p_user_id uuid, p_months integer DEFAULT 12)
 RETURNS TABLE(month_year text, month_start date, income numeric, expenses numeric, savings numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT
      TO_CHAR(d, 'YYYY-MM') AS month_year,
      DATE_TRUNC('month', d)::DATE AS month_start,
      (DATE_TRUNC('month', d) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS month_end
    FROM generate_series(
      DATE_TRUNC('month', CURRENT_DATE - (p_months || ' months')::INTERVAL),
      DATE_TRUNC('month', CURRENT_DATE),
      '1 month'::INTERVAL
    ) d
  )
  SELECT
    m.month_year,
    m.month_start,
    COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) AS income,
    COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS expenses,
    COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS savings
  FROM months m
  LEFT JOIN public.transactions t ON
    t.user_id = p_user_id
    AND t.competence_date >= m.month_start
    AND t.competence_date <= m.month_end
    AND t.source_transaction_id IS NULL
    AND (t.currency = 'BRL' OR t.currency IS NULL)
  GROUP BY m.month_year, m.month_start
  ORDER BY m.month_start;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_evolution_report(p_user_id uuid, p_months integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result JSONB;
BEGIN
    IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

    WITH months AS (
        SELECT generate_series(
            date_trunc('month', CURRENT_DATE) - (p_months - 1 || ' months')::interval,
            date_trunc('month', CURRENT_DATE),
            '1 month'::interval
        )::date AS month_date
    ),
    tx_with_ref AS (
        SELECT
            t.type,
            t.amount,
            COALESCE(t.currency, 'BRL') AS currency,
            CASE
                WHEN a.type = 'CREDIT_CARD' THEN
                    CASE
                        WHEN COALESCE(a.due_day, 10) <= COALESCE(a.closing_day, 1) THEN
                            (DATE_TRUNC('month', COALESCE(t.competence_date, t.date)) + INTERVAL '1 month')::date
                        ELSE
                            DATE_TRUNC('month', COALESCE(t.competence_date, t.date))::date
                    END
                ELSE
                    COALESCE(t.competence_date, t.date)
            END AS ref_date
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = p_user_id
          AND t.deleted_at IS NULL
          AND t.source_transaction_id IS NULL
          AND t.type != 'TRANSFER'
    ),
    monthly_data AS (
        SELECT
            m.month_date,
            COALESCE(tw.currency, 'BRL') AS currency,
            COALESCE(SUM(tw.amount) FILTER (WHERE tw.type = 'INCOME'), 0) AS total_income,
            COALESCE(SUM(tw.amount) FILTER (WHERE tw.type = 'EXPENSE'), 0) AS total_expense
        FROM months m
        LEFT JOIN tx_with_ref tw ON DATE_TRUNC('month', tw.ref_date) = m.month_date
        GROUP BY m.month_date, COALESCE(tw.currency, 'BRL')
        ORDER BY m.month_date
    )
    SELECT jsonb_agg(row_to_json(md)) INTO v_result FROM monthly_data md;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_evolution_report_v2(p_months integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public.get_monthly_evolution_report(private.authenticated_uid(), p_months) $function$;

CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(total_balance numeric, total_income numeric, total_expenses numeric, net_savings numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
BEGIN
  SELECT id INTO v_member_id FROM public.family_members WHERE linked_user_id = p_user_id LIMIT 1;

  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(balance)
      FROM public.accounts
      WHERE user_id = p_user_id
        AND is_active = true
        AND deleted_at IS NULL
        AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        AND (is_international = false OR is_international IS NULL)
    ), 0) AS total_balance,

    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type = 'INCOME'
        AND deleted_at IS NULL
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND date <= CURRENT_DATE
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
        AND (payer_id IS NULL OR (v_member_id IS NOT NULL AND payer_id = v_member_id))
    ), 0) AS total_income,

    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type = 'EXPENSE'
        AND deleted_at IS NULL
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND date <= CURRENT_DATE
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
        AND (payer_id IS NULL OR (v_member_id IS NOT NULL AND payer_id = v_member_id))
    ), 0) AS total_expenses,

    COALESCE((
      SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type IN ('INCOME', 'EXPENSE')
        AND deleted_at IS NULL
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND date <= CURRENT_DATE
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
        AND (payer_id IS NULL OR (v_member_id IS NOT NULL AND payer_id = v_member_id))
    ), 0) AS net_savings;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary_v2(p_start_date date, p_end_date date)
 RETURNS TABLE(total_balance numeric, total_income numeric, total_expenses numeric, net_savings numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select * from public.get_monthly_financial_summary(private.authenticated_uid(), p_start_date, p_end_date) $function$;

CREATE OR REPLACE FUNCTION public.get_monthly_projection(p_user_id uuid, p_end_date date, p_currency character varying DEFAULT 'BRL'::character varying)
 RETURNS TABLE(current_balance numeric, future_income numeric, future_expenses numeric, credit_card_invoices numeric, shared_debts numeric, projected_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_balance NUMERIC := 0;
  v_future_income NUMERIC := 0;
  v_future_expenses NUMERIC := 0;
  v_credit_invoices NUMERIC := 0;
  v_shared_debts NUMERIC := 0;
  v_shared_credits NUMERIC := 0;
  v_shared_net NUMERIC := 0;
  v_projected NUMERIC := 0;
  v_start_of_month DATE;
  v_end_of_month DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  v_start_of_month := date_trunc('month', p_end_date)::date;
  v_end_of_month := (date_trunc('month', p_end_date) + interval '1 month - 1 day')::date;

  -- 1. SALDO ATUAL
  SELECT COALESCE(SUM(balance), 0) INTO v_current_balance
  FROM public.accounts
  WHERE user_id = p_user_id AND deleted_at IS NULL
    AND is_active = true
    AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
    AND (
      (p_currency = 'BRL' AND (currency = 'BRL' OR currency IS NULL))
      OR
      (p_currency != 'BRL' AND currency = p_currency)
    );

  IF p_end_date < date_trunc('month', v_today)::date THEN
    -- Subtrair receitas lançadas após p_end_date
    SELECT v_current_balance - COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
      AND t.type = 'INCOME'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (
        (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
        OR
        (p_currency != 'BRL' AND a.currency = p_currency)
      );

    -- Somar despesas lançadas após p_end_date
    SELECT v_current_balance + COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
      AND t.type = 'EXPENSE'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (
        (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
        OR
        (p_currency != 'BRL' AND a.currency = p_currency)
      );

    -- Transferências
    SELECT v_current_balance + COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a_src ON a_src.id = t.account_id
    INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
    WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
      AND t.type = 'TRANSFER'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a_src.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (
        (p_currency = 'BRL' AND (a_src.currency = 'BRL' OR a_src.currency IS NULL))
        OR
        (p_currency != 'BRL' AND a_src.currency = p_currency)
      )
      AND (
        a_dst.type IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        OR (p_currency = 'BRL' AND a_dst.currency != 'BRL' AND a_dst.currency IS NOT NULL)
        OR (p_currency != 'BRL' AND (a_dst.currency != p_currency OR a_dst.currency IS NULL))
      );

    SELECT v_current_balance - COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a_src ON a_src.id = t.account_id
    INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
    WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
      AND t.type = 'TRANSFER'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a_dst.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (
        (p_currency = 'BRL' AND (a_dst.currency = 'BRL' OR a_dst.currency IS NULL))
        OR
        (p_currency != 'BRL' AND a_dst.currency = p_currency)
      )
      AND (
        a_src.type IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        OR (p_currency = 'BRL' AND a_src.currency != 'BRL' AND a_src.currency IS NOT NULL)
        OR (p_currency != 'BRL' AND (a_src.currency != p_currency OR a_src.currency IS NULL))
      );
  END IF;

  -- 2. RECEITAS FUTURAS
  SELECT COALESCE(SUM(t.amount), 0) INTO v_future_income
  FROM public.transactions t
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
    AND t.type = 'INCOME'
    AND (
      (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
      OR
      (p_currency != 'BRL' AND t.currency = p_currency)
    )
    AND t.source_transaction_id IS NULL
    AND (a.type IS NULL OR a.type != 'CREDIT_CARD')
    AND (
      (v_start_of_month <= v_today AND v_end_of_month >= v_today
       AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month
       AND t.date > v_today)
      OR
      (v_start_of_month > v_today AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month)
    );

  -- 3. DESPESAS FUTURAS
  SELECT COALESCE(SUM(t.amount), 0) INTO v_future_expenses
  FROM public.transactions t
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
    AND t.type = 'EXPENSE'
    AND (
      (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
      OR
      (p_currency != 'BRL' AND t.currency = p_currency)
    )
    AND t.source_transaction_id IS NULL
    AND (a.type IS NULL OR a.type != 'CREDIT_CARD')
    AND (
      (v_start_of_month <= v_today AND v_end_of_month >= v_today
       AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month
       AND t.date > v_today)
      OR
      (v_start_of_month > v_today AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month)
    );

  -- 4. FATURAS DE CARTÃO
  SELECT COALESCE(SUM(
    GREATEST(
      (
        SELECT COALESCE(SUM(
          CASE
            WHEN t.type = 'EXPENSE' THEN t.amount
            WHEN t.type = 'INCOME' THEN -t.amount
            WHEN t.type = 'TRANSFER' AND t.destination_account_id = a.id THEN -t.amount
            WHEN t.type = 'TRANSFER' AND t.account_id = a.id THEN t.amount
            ELSE 0
          END
        ), 0)
        FROM public.transactions t
        WHERE t.deleted_at IS NULL AND (t.account_id = a.id OR t.destination_account_id = a.id)
          AND t.competence_date >= v_start_of_month
          AND t.competence_date <= v_end_of_month
      ), 0
    )
  ), 0) INTO v_credit_invoices
  FROM public.accounts a
  WHERE a.user_id = p_user_id AND a.deleted_at IS NULL
    AND a.type = 'CREDIT_CARD'
    AND a.is_active = true
    AND (
      (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
      OR
      (p_currency != 'BRL' AND a.currency = p_currency)
    );

  -- 5. COMPARTILHADOS (Atualizado para englobar todas as formas de compartilhamento e dívidas passadas)
  WITH my_members AS (
      SELECT id FROM public.family_members WHERE linked_user_id = p_user_id
  ),
  credits_split AS (
      SELECT
          SUM(CASE WHEN t.type = 'INCOME' THEN -ts.amount ELSE ts.amount END) AS amount
      FROM public.transactions t
      JOIN public.transaction_splits ts ON t.id = ts.transaction_id
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL) AND
          (t.user_id = p_user_id AND t.payer_id IS NULL OR t.payer_id IN (SELECT id FROM my_members))
          AND ts.member_id NOT IN (SELECT id FROM my_members)
          AND ts.is_settled = false
          AND ts.settled_by_creditor = false
          AND (t.type = 'EXPENSE' OR t.type = 'INCOME')
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  ),
  credits_related AS (
      SELECT
          SUM(t.amount) AS amount
      FROM public.transactions t
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE
          t.user_id = p_user_id
          AND t.is_shared = false
          AND t.domain = 'SHARED'
          AND t.related_member_id IS NOT NULL
          AND t.is_settled = false
          AND t.type = 'EXPENSE'
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  ),
  debits_split AS (
      SELECT
          SUM(ts.amount) AS amount
      FROM public.transactions t
      JOIN public.transaction_splits ts ON t.id = ts.transaction_id
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL) AND
          (t.user_id != p_user_id OR (t.user_id = p_user_id AND t.payer_id IS NOT NULL AND t.payer_id NOT IN (SELECT id FROM my_members)))
          AND ts.member_id IN (SELECT id FROM my_members)
          AND ts.is_settled = false
          AND ts.settled_by_debtor = false
          AND t.type = 'EXPENSE'
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  ),
  debits_direct AS (
      SELECT
          SUM(CASE WHEN t.type = 'INCOME' THEN -t.amount ELSE t.amount END) AS amount
      FROM public.transactions t
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE
          t.user_id = p_user_id
          AND t.payer_id IS NOT NULL
          AND t.payer_id NOT IN (SELECT id FROM my_members)
          AND t.source_transaction_id IS NULL
          AND t.is_settled = false
          AND (t.type = 'EXPENSE' OR t.type = 'INCOME')
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  ),
  debits_related AS (
      SELECT
          SUM(t.amount) AS amount
      FROM public.transactions t
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL) AND
          t.user_id != p_user_id
          AND t.is_shared = false
          AND t.domain = 'SHARED'
          AND t.related_member_id IN (SELECT id FROM my_members)
          AND t.is_settled = false
          AND t.type = 'EXPENSE'
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  )
  SELECT
      COALESCE((SELECT SUM(amount) FROM credits_split), 0) + COALESCE((SELECT SUM(amount) FROM credits_related), 0),
      COALESCE((SELECT SUM(amount) FROM debits_split), 0) + COALESCE((SELECT SUM(amount) FROM debits_direct), 0) + COALESCE((SELECT SUM(amount) FROM debits_related), 0)
  INTO v_shared_credits, v_shared_debts;

  v_shared_net := v_shared_debts - v_shared_credits;

  v_projected := v_current_balance + v_future_income - v_future_expenses - v_credit_invoices - v_shared_net;

  RETURN QUERY SELECT
    v_current_balance,
    v_future_income,
    v_future_expenses,
    v_credit_invoices,
    v_shared_net,
    v_projected;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_projection_v2(p_end_date date, p_currency character varying DEFAULT 'BRL'::character varying)
 RETURNS TABLE(current_balance numeric, future_income numeric, future_expenses numeric, credit_card_invoices numeric, shared_debts numeric, projected_balance numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select * from public.get_monthly_projection(private.authenticated_uid(), p_end_date, p_currency) $function$;

CREATE OR REPLACE FUNCTION public.get_net_worth(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    -- SECURITY LOCK: IDOR Protection
    IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

    SELECT jsonb_build_object(
        'bank_balance', bank_balance,
        'assets_value', assets_value,
        'credit_card_debt', ABS(credit_card_debt),
        'shared_debt', shared_debt,
        'shared_credit', shared_credit,
        'total_net_worth', (bank_balance + assets_value - ABS(credit_card_debt) - shared_debt + shared_credit)
    ) INTO v_result
    FROM user_net_worth
    WHERE user_id = p_user_id;

    RETURN COALESCE(v_result, '{"total_net_worth": 0}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_net_worth_v2()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public.get_net_worth(private.authenticated_uid()) $function$;

CREATE OR REPLACE FUNCTION public.get_pending_splits_for_settlement(p_debtor_user_id uuid, p_creditor_user_id uuid, p_currency text DEFAULT 'BRL'::text)
 RETURNS TABLE(split_id uuid, transaction_id uuid, description text, date date, amount numeric, currency text, days_overdue integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ts.id AS split_id,
    t.id AS transaction_id,
    t.description,
    t.date,
    ts.amount,
    t.currency,
    EXTRACT(DAY FROM NOW() - t.date)::INTEGER AS days_overdue
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.user_id = p_debtor_user_id
    AND t.user_id = p_creditor_user_id
    AND ts.is_settled = FALSE
    AND t.currency = p_currency
    AND t.deleted_at IS NULL
  ORDER BY t.date ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_record_history(p_table_name text, p_record_id uuid)
 RETURNS TABLE(action text, changed_at timestamp with time zone, changed_by_email text, changed_fields text[], old_values jsonb, new_values jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    al.action,
    al.changed_at,
    p.email AS changed_by_email,
    al.changed_fields,
    al.old_values,
    al.new_values
  FROM audit_log al
  LEFT JOIN profiles p ON p.id = al.changed_by
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.changed_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shared_expense_summary_by_person(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result JSONB;
BEGIN
    -- SECURITY LOCK: IDOR Protection
    IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

    WITH shared_splits AS (
        SELECT ts.member_id, ts.name AS member_name, ts.amount, ts.is_settled, t.payer_id, t.series_id, t.is_installment, t.date
        FROM transactions t
        JOIN transaction_splits ts ON ts.transaction_id = t.id
        WHERE t.user_id = p_user_id
          AND t.is_shared = true
          AND t.deleted_at IS NULL
          AND t.date >= p_start_date
          AND t.date <= p_end_date
    ),
    grouped AS (
        SELECT member_id, member_name, COALESCE(SUM(amount) FILTER (WHERE payer_id = member_id), 0) AS paid, COALESCE(SUM(amount) FILTER (WHERE payer_id != member_id OR payer_id IS NULL), 0) AS owes, COUNT(*) AS tx_count
        FROM shared_splits
        GROUP BY member_id, member_name
    )
    SELECT jsonb_agg(row_to_json(g)) INTO v_result FROM grouped g WHERE g.paid > 0 OR g.owes > 0;
    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shared_expense_summary_by_person_v2(p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public.get_shared_expense_summary_by_person(private.authenticated_uid(), p_start_date, p_end_date) $function$;

CREATE OR REPLACE FUNCTION public.get_shared_finances_summary(p_user_id uuid)
 RETURNS TABLE(member_id uuid, member_name text, credits numeric, debits numeric, net_balance numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    fm.id AS member_id,
    fm.name AS member_name,
    (public.calculate_member_balance(p_user_id, fm.id)).credits,
    (public.calculate_member_balance(p_user_id, fm.id)).debits,
    (public.calculate_member_balance(p_user_id, fm.id)).net_balance
  FROM public.family_members fm
  JOIN public.families f ON f.id = fm.family_id
  WHERE f.owner_id = p_user_id OR fm.user_id = p_user_id OR fm.linked_user_id = p_user_id
  ORDER BY fm.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shared_invoice_data(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_family_id UUID;
    v_result    JSONB;
BEGIN
    -- SECURITY LOCK: IDOR Protection
    IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

    SELECT family_id INTO v_family_id FROM family_members WHERE user_id = p_user_id OR linked_user_id = p_user_id LIMIT 1;

    WITH relevant_tx AS (
        SELECT t.id FROM transactions t WHERE (t.user_id = p_user_id OR t.creator_user_id = p_user_id) AND (t.is_shared = true OR t.domain = 'SHARED') AND t.source_transaction_id IS NULL AND t.deleted_at IS NULL
        UNION
        SELECT ts.transaction_id FROM transaction_splits ts WHERE ts.user_id = p_user_id OR ts.member_id IN (SELECT id FROM family_members WHERE user_id = p_user_id OR linked_user_id = p_user_id)
    ),
    tx_data AS (
        SELECT t.id, t.user_id, t.description, t.amount, t.type, t.date, t.competence_date, t.account_id, t.is_shared, t.is_settled, t.settled_at, t.trip_id, t.payer_id, t.is_installment, t.current_installment, t.total_installments, t.series_id, t.source_transaction_id, t.currency, t.creator_user_id, t.domain, t.related_member_id,
               CASE WHEN cat.id IS NOT NULL THEN jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon, 'color', cat.color) ELSE NULL END AS category
        FROM transactions t INNER JOIN relevant_tx rt ON rt.id = t.id LEFT JOIN categories cat ON cat.id = t.category_id
        WHERE t.deleted_at IS NULL
        ORDER BY t.date DESC LIMIT 500
    ),
    splits_data AS (
        SELECT ts.id, ts.transaction_id, ts.user_id, ts.member_id, ts.name, ts.amount, ts.percentage, ts.is_settled, ts.settled_at, ts.settled_by_debtor, ts.settled_by_creditor
        FROM transaction_splits ts INNER JOIN tx_data td ON td.id = ts.transaction_id
    ),
    accounts_data AS (
        SELECT DISTINCT ON (a.id) a.id, a.type, a.closing_day, a.due_day, a.user_id FROM accounts a INNER JOIN tx_data td ON td.account_id = a.id
    ),
    splits_grouped AS (
        SELECT transaction_id, jsonb_agg(row_to_json(s)::jsonb) AS splits FROM splits_data s GROUP BY transaction_id
    )
    SELECT jsonb_build_object(
        'transactions', COALESCE((SELECT jsonb_agg(to_jsonb(td) || jsonb_build_object('transaction_splits', COALESCE(sg.splits, '[]'::jsonb))) FROM tx_data td LEFT JOIN splits_grouped sg ON sg.transaction_id = td.id), '[]'::jsonb),
        'accounts', COALESCE((SELECT jsonb_agg(row_to_json(a)) FROM accounts_data a), '[]'::jsonb),
        'members', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', fm.id, 'user_id', fm.user_id, 'linked_user_id', fm.linked_user_id, 'name', COALESCE(p.full_name, fm.name), 'role', fm.role, 'family_id', fm.family_id, 'sharing_scope', fm.sharing_scope, 'scope_start_date', fm.scope_start_date, 'scope_end_date', fm.scope_end_date, 'scope_trip_id', fm.scope_trip_id)) FROM family_members fm LEFT JOIN profiles p ON p.id = COALESCE(fm.linked_user_id, fm.user_id) WHERE fm.family_id = v_family_id), '[]'::jsonb)
    ) INTO v_result;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shared_invoice_data_v2()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public.get_shared_invoice_data(private.authenticated_uid()) $function$;

CREATE OR REPLACE FUNCTION public.get_shared_transactions_for_current_user()
 RETURNS TABLE(transaction_id uuid, owner_user_id uuid, account_id uuid, category_id uuid, total_amount numeric, description text, date date, type text, domain text, is_shared boolean, payer_id uuid, source_transaction_id uuid, is_mirror boolean, root_owner_user_id uuid, root_amount numeric, splits jsonb, share_amount numeric, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    v.transaction_id,
    v.owner_user_id,
    v.account_id,
    v.category_id,
    v.total_amount,
    v.description,
    v.date,
    v.type,
    v.domain,
    v.is_shared,
    v.payer_id,
    v.source_transaction_id,
    v.is_mirror,
    v.root_owner_user_id,
    v.root_amount,
    v.splits,
    -- calculate share_amount for current user: if owner is current user, full amount; else compute from splits
    CASE
      WHEN v.owner_user_id = (SELECT auth.uid())::uuid THEN v.total_amount
      ELSE (
        SELECT COALESCE(sum((elem->>'amount')::numeric), 0)
        FROM jsonb_array_elements(v.splits) AS elem
        WHERE (elem->>'user_id') = (SELECT auth.uid())::text
      )
    END AS share_amount,
    v.created_at,
    v.updated_at
  FROM public.shared_transactions_view v
  WHERE
    -- visible if current user is owner OR is in splits OR is payer
    (
      v.owner_user_id = (SELECT auth.uid())::uuid
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(v.splits) AS s WHERE (s->>'user_id') = (SELECT auth.uid())::text
      )
      OR v.payer_id = (SELECT auth.uid())::uuid
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_trip_financial_summary(p_trip_id uuid)
 RETURNS TABLE(total_budget numeric, total_spent numeric, total_settled numeric, remaining numeric, percentage_used numeric, currency text, participants_count bigint, transactions_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.budget AS total_budget,
    public.calculate_trip_spent(p_trip_id) AS total_spent,
    -- Total de acertos feitos (splits marcados como pagos)
    COALESCE((
      SELECT SUM(ts.amount)
      FROM public.transaction_splits ts
      JOIN public.transactions tx ON ts.transaction_id = tx.id
      WHERE tx.trip_id = p_trip_id
        AND ts.is_settled = TRUE
    ), 0) AS total_settled,
    COALESCE(t.budget, 0) - public.calculate_trip_spent(p_trip_id) AS remaining,
    CASE
      WHEN t.budget > 0 THEN
        ROUND((public.calculate_trip_spent(p_trip_id) / t.budget) * 100, 2)
      ELSE 0
    END AS percentage_used,
    t.currency,
    (SELECT COUNT(*) FROM public.trip_members WHERE trip_id = p_trip_id) AS participants_count,
    (SELECT COUNT(*) FROM public.transactions WHERE trip_id = p_trip_id AND source_transaction_id IS NULL) AS transactions_count
  FROM public.trips t
  WHERE t.id = p_trip_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_trip_participant_balances(p_trip_id uuid)
 RETURNS TABLE(participant_id uuid, user_id uuid, name text, paid numeric, owes numeric, balance numeric, currency text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH trip_tx AS (
    SELECT t.id, t.amount, t.currency, t.user_id AS payer_id, t.domain
    FROM transactions t
    WHERE t.trip_id = p_trip_id
      AND t.deleted_at IS NULL
      AND t.source_transaction_id IS NULL -- FIX A-3: prevent double counting mirror txs
  ),
  splits_data AS (
    SELECT
      ts.member_id,
      ts.user_id,
      ts.amount AS split_amount,
      tt.amount AS tx_amount,
      tt.currency,
      tt.payer_id,
      tt.id AS tx_id
    FROM transaction_splits ts
    JOIN trip_tx tt ON ts.transaction_id = tt.id
  ),
  participant_paid AS (
    SELECT
      tt.payer_id AS user_id,
      tt.currency,
      COALESCE(SUM(tt.amount), 0) AS paid
    FROM trip_tx tt
    GROUP BY tt.payer_id, tt.currency
  ),
  participant_owes AS (
    SELECT
      sd.user_id,
      sd.currency,
      COALESCE(SUM(sd.split_amount), 0) AS owes
    FROM splits_data sd
    GROUP BY sd.user_id, sd.currency
  ),
  all_participants AS (
    SELECT DISTINCT pp.user_id FROM participant_paid pp
    UNION
    SELECT DISTINCT po.user_id FROM participant_owes po
  )
  SELECT
    tm.id AS participant_id,
    ap.user_id,
    COALESCE(p.full_name, tm.guest_name, 'Participante') AS name,
    COALESCE(pp.paid, 0) AS paid,
    COALESCE(po.owes, 0) AS owes,
    COALESCE(pp.paid, 0) - COALESCE(po.owes, 0) AS balance,
    COALESCE(pp.currency, po.currency, 'BRL') AS currency
  FROM all_participants ap
  LEFT JOIN trip_members tm ON tm.user_id = ap.user_id AND tm.trip_id = p_trip_id
  LEFT JOIN profiles p ON p.id = ap.user_id
  LEFT JOIN participant_paid pp ON pp.user_id = ap.user_id
  LEFT JOIN participant_owes po ON po.user_id = ap.user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_trip_participant_balances_v2(p_trip_id uuid)
 RETURNS TABLE(participant_id uuid, user_id uuid, name text, paid numeric, owes numeric, balance numeric, currency text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := private.authenticated_uid();
begin
  if not public.is_trip_member(p_trip_id, v_uid) then
    raise exception 'User is not a trip participant' using errcode = '42501';
  end if;
  return query select * from public.get_trip_participant_balances(p_trip_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_budgets_progress(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(budget_id uuid, budget_name text, category_id uuid, category_name text, category_icon text, budget_amount numeric, spent_amount numeric, remaining_amount numeric, percentage_used numeric, currency text, period text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH budget_spent AS (
    SELECT
      b.id AS budget_id,
      COALESCE(SUM(t.amount), 0) AS spent
    FROM public.budgets b
    LEFT JOIN public.transactions t
      ON t.user_id = b.user_id
      AND t.type = 'EXPENSE'
      AND t.competence_date >= p_start_date
      AND t.competence_date <= p_end_date
      AND t.date <= CURRENT_DATE
      AND (
        (b.category_id IS NULL) OR
        (t.category_id = b.category_id)
      )
      AND (t.currency = b.currency OR (t.currency IS NULL AND b.currency = 'BRL'))
      AND t.source_transaction_id IS NULL
    WHERE b.user_id = p_user_id
    GROUP BY b.id
  )
  SELECT
    b.id AS budget_id,
    b.name AS budget_name,
    b.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    b.amount AS budget_amount,
    bs.spent AS spent_amount,
    COALESCE(b.amount - bs.spent, 0) AS remaining_amount,
    CASE
      WHEN b.amount > 0 THEN
        ROUND((bs.spent / b.amount) * 100, 2)
      ELSE 0
    END AS percentage_used,
    b.currency,
    b.period
  FROM public.budgets b
  LEFT JOIN public.categories c ON c.id = b.category_id
  LEFT JOIN budget_spent bs ON bs.budget_id = b.id
  WHERE b.user_id = p_user_id
    AND (b.deleted IS NULL OR b.deleted = false)
  ORDER BY b.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_budgets_progress_v2(p_start_date date, p_end_date date)
 RETURNS TABLE(budget_id uuid, budget_name text, category_id uuid, category_name text, category_icon text, budget_amount numeric, spent_amount numeric, remaining_amount numeric, percentage_used numeric, currency text, period text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select * from public.get_user_budgets_progress(private.authenticated_uid(), p_start_date, p_end_date) $function$;

CREATE OR REPLACE FUNCTION public.get_user_budgets_progress_with_rollover(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(budget_id uuid, budget_name text, category_id uuid, category_name text, category_icon text, budget_amount numeric, spent_amount numeric, remaining_amount numeric, percentage_used numeric, currency text, period text, _original_budget numeric, _rollover numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_prev_start_date DATE;
    v_prev_end_date DATE;
BEGIN
    v_prev_start_date := (p_start_date - INTERVAL '1 month')::DATE;
    v_prev_end_date := ((p_start_date - INTERVAL '1 day'))::DATE;

    RETURN QUERY
    WITH current_progress AS (
        SELECT * FROM get_user_budgets_progress(p_user_id, p_start_date, p_end_date)
    ),
    prev_progress AS (
        SELECT * FROM get_user_budgets_progress(p_user_id, v_prev_start_date, v_prev_end_date)
    )
    SELECT
        c.budget_id,
        c.budget_name,
        c.category_id,
        c.category_name,
        c.category_icon,
        -- Calculate new budget amount capping rollover to the original budget
        (c.budget_amount + COALESCE(
            CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END,
            0
        ))::NUMERIC AS budget_amount,
        c.spent_amount,
        -- Calculate new remaining
        ((c.budget_amount + COALESCE(
            CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END,
            0
        )) - c.spent_amount)::NUMERIC AS remaining_amount,
        -- Calculate new percentage
        CASE WHEN (c.budget_amount + COALESCE(
            CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END,
            0
        )) > 0 THEN
            LEAST(ROUND((c.spent_amount / (c.budget_amount + COALESCE(
                CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END,
                0
            ))) * 100), 1000)::NUMERIC
        ELSE 0::NUMERIC END AS percentage_used,
        c.currency,
        c.period,
        c.budget_amount AS _original_budget,
        COALESCE(
            CASE WHEN p.remaining_amount > 0 THEN LEAST(p.remaining_amount, c.budget_amount) ELSE 0 END,
            0
        )::NUMERIC AS _rollover
    FROM current_progress c
    LEFT JOIN prev_progress p ON c.budget_id = p.budget_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_budgets_progress_with_rollover_v2(p_start_date date, p_end_date date)
 RETURNS TABLE(budget_id uuid, budget_name text, category_id uuid, category_name text, category_icon text, budget_amount numeric, spent_amount numeric, remaining_amount numeric, percentage_used numeric, currency text, period text, _original_budget numeric, _rollover numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select * from public.get_user_budgets_progress_with_rollover(private.authenticated_uid(), p_start_date, p_end_date) $function$;

CREATE OR REPLACE FUNCTION public.get_user_family_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.families WHERE owner_id = _user_id LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_transactions_ssot(p_user_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_type text DEFAULT NULL::text, p_account_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid, p_trip_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 1000)
 RETURNS SETOF transactions
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.*
  FROM transactions t
  LEFT JOIN transaction_splits ts ON t.id = ts.transaction_id
  WHERE (t.user_id = p_user_id OR ts.user_id = p_user_id)
    AND (p_start_date IS NULL OR t.date >= p_start_date)
    AND (p_end_date IS NULL OR t.date <= p_end_date)
    AND (p_type IS NULL OR t.type::text = p_type)
    AND (p_account_id IS NULL OR t.account_id = p_account_id OR t.destination_account_id = p_account_id)
    AND (p_category_id IS NULL OR t.category_id = p_category_id)
    AND (p_trip_id IS NULL OR t.trip_id = p_trip_id)
    AND (t.source_transaction_id IS NULL) -- Removido dependência de is_mirror
  ORDER BY t.date DESC, t.created_at DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_trip_ids(p_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT trip_id FROM trip_members WHERE user_id = p_user_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_wealth_evolution(p_user_id uuid, p_months integer DEFAULT 6, p_currency character varying DEFAULT 'BRL'::character varying)
 RETURNS TABLE(month_label text, balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_balance NUMERIC := 0;
  v_month_start DATE;
  v_month_end DATE;
  v_today DATE := CURRENT_DATE;
  v_i INT;
  v_temp_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(a.balance), 0) INTO v_current_balance
  FROM public.accounts a
  WHERE a.user_id = p_user_id
    AND a.is_active = true
    AND a.deleted_at IS NULL
    AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
    AND (
      (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
      OR
      (p_currency != 'BRL' AND a.currency = p_currency)
    );

  FOR v_i IN REVERSE (p_months - 1)..0 LOOP
    v_month_end := (date_trunc('month', v_today - (v_i || ' month')::interval) + interval '1 month - 1 day')::date;
    v_month_start := date_trunc('month', v_month_end)::date;

    v_temp_balance := v_current_balance;

    IF v_month_end < v_today THEN
      v_temp_balance := v_temp_balance - COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a ON a.id = t.account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'INCOME'
           AND t.deleted_at IS NULL
           AND COALESCE(t.competence_date, t.date) > v_month_end
           AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
           AND (
             (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
             OR
             (p_currency != 'BRL' AND a.currency = p_currency)
           )
        ), 0
      );

      v_temp_balance := v_temp_balance + COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a ON a.id = t.account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'EXPENSE'
           AND t.deleted_at IS NULL
           AND COALESCE(t.competence_date, t.date) > v_month_end
           AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
           AND (
             (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
             OR
             (p_currency != 'BRL' AND a.currency = p_currency)
           )
        ), 0
      );

      v_temp_balance := v_temp_balance + COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a_src ON a_src.id = t.account_id
         INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'TRANSFER'
           AND t.deleted_at IS NULL
           AND COALESCE(t.competence_date, t.date) > v_month_end
           AND a_src.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
           AND (
             (p_currency = 'BRL' AND (a_src.currency = 'BRL' OR a_src.currency IS NULL))
             OR
             (p_currency != 'BRL' AND a_src.currency = p_currency)
           )
           AND (
             a_dst.type IN ('CREDIT_CARD', 'EMERGENCY_FUND')
             OR (p_currency = 'BRL' AND a_dst.currency != 'BRL' AND a_dst.currency IS NOT NULL)
             OR (p_currency != 'BRL' AND (a_dst.currency != p_currency OR a_dst.currency IS NULL))
           )
        ), 0
      );

      v_temp_balance := v_temp_balance - COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a_src ON a_src.id = t.account_id
         INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'TRANSFER'
           AND t.deleted_at IS NULL
           AND COALESCE(t.competence_date, t.date) > v_month_end
           AND a_dst.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
           AND (
             (p_currency = 'BRL' AND (a_dst.currency = 'BRL' OR a_dst.currency IS NULL))
             OR
             (p_currency != 'BRL' AND a_dst.currency = p_currency)
           )
           AND (
             a_src.type IN ('CREDIT_CARD', 'EMERGENCY_FUND')
             OR (p_currency = 'BRL' AND a_src.currency != 'BRL' AND a_src.currency IS NOT NULL)
             OR (p_currency != 'BRL' AND (a_src.currency != p_currency OR a_src.currency IS NULL))
           )
        ), 0
      );
    END IF;

    month_label := CASE to_char(v_month_end, 'MM')
      WHEN '01' THEN 'Jan'
      WHEN '02' THEN 'Fev'
      WHEN '03' THEN 'Mar'
      WHEN '04' THEN 'Abr'
      WHEN '05' THEN 'Mai'
      WHEN '06' THEN 'Jun'
      WHEN '07' THEN 'Jul'
      WHEN '08' THEN 'Ago'
      WHEN '09' THEN 'Set'
      WHEN '10' THEN 'Out'
      WHEN '11' THEN 'Nov'
      WHEN '12' THEN 'Dez'
    END || '/' || to_char(v_month_end, 'YY');

    balance := v_temp_balance;
    RETURN NEXT;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_wealth_evolution_v2(p_months integer DEFAULT 6, p_currency character varying DEFAULT 'BRL'::character varying)
 RETURNS TABLE(month_label text, balance numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select * from public.get_wealth_evolution(private.authenticated_uid(), p_months, p_currency) $function$;

CREATE OR REPLACE FUNCTION public.handle_auto_connection()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_user_id UUID;
  v_transaction RECORD;
BEGIN
  IF NEW.linked_user_id IS NOT NULL
     AND (OLD.linked_user_id IS NULL OR OLD.linked_user_id IS DISTINCT FROM NEW.linked_user_id) THEN

    FOR v_transaction IN
      SELECT DISTINCT t.*
      FROM transactions t
      INNER JOIN transaction_splits ts ON ts.transaction_id = t.id
      WHERE t.is_shared = true
      AND t.source_transaction_id IS NULL
      AND ts.member_id = NEW.id
    LOOP
      UPDATE transactions
      SET updated_at = updated_at
      WHERE id = v_transaction.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_family_invitation_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_member_id UUID;
  inviter_profile RECORD;
  invitee_profile RECORD;
  invitee_family_id UUID;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN

    -- Buscar perfis
    SELECT id, full_name, email INTO inviter_profile
    FROM profiles WHERE id = NEW.from_user_id;

    SELECT id, full_name, email INTO invitee_profile
    FROM profiles WHERE id = NEW.to_user_id;

    -- Buscar família do convidado
    SELECT id INTO invitee_family_id
    FROM families WHERE owner_id = NEW.to_user_id;

    -- 1. Adicionar convidado na família do convidador
    SELECT id INTO existing_member_id
    FROM family_members
    WHERE family_id = NEW.family_id
      AND (linked_user_id = NEW.to_user_id OR user_id = NEW.to_user_id)
    LIMIT 1;

    IF existing_member_id IS NOT NULL THEN
      UPDATE family_members
      SET status = 'active',
          role = NEW.role,
          user_id = NEW.to_user_id, -- Garantir que user_id está preenchido
          linked_user_id = NEW.to_user_id,
          name = COALESCE(invitee_profile.full_name, name)
      WHERE id = existing_member_id;
    ELSE
      INSERT INTO family_members (
        family_id,
        user_id, -- Adicionado
        linked_user_id,
        name,
        email,
        role,
        status,
        invited_by
      ) VALUES (
        NEW.family_id,
        NEW.to_user_id, -- Adicionado
        NEW.to_user_id,
        COALESCE(invitee_profile.full_name, NEW.member_name),
        invitee_profile.email,
        NEW.role,
        'active',
        NEW.from_user_id
      );
    END IF;

    -- 2. Vínculo bidirecional (se o convidado tiver família própria)
    IF invitee_family_id IS NOT NULL AND invitee_family_id != NEW.family_id THEN
        SELECT id INTO existing_member_id
        FROM family_members
        WHERE family_id = invitee_family_id
          AND (linked_user_id = NEW.from_user_id OR user_id = NEW.from_user_id)
        LIMIT 1;

        IF existing_member_id IS NULL THEN
          INSERT INTO family_members (
            family_id,
            user_id,
            linked_user_id,
            name,
            email,
            role,
            status,
            invited_by
          ) VALUES (
            invitee_family_id,
            NEW.from_user_id,
            NEW.from_user_id,
            COALESCE(inviter_profile.full_name, 'Usuário'),
            inviter_profile.email,
            'editor',
            'active',
            NEW.to_user_id
          );
        END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_family_invitation_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_family_name text;
  v_inviter_name text;
  v_invitee_name text;
BEGIN
  -- Buscar nome da família
  SELECT name INTO v_family_name FROM public.families WHERE id = COALESCE(NEW.family_id, OLD.family_id);

  -- Buscar nome de quem convidou
  SELECT COALESCE(full_name, 'Alguém') INTO v_inviter_name FROM public.profiles WHERE id = COALESCE(NEW.from_user_id, OLD.from_user_id);

  -- Buscar nome do convidado
  SELECT COALESCE(full_name, 'Alguém') INTO v_invitee_name FROM public.profiles WHERE id = COALESCE(NEW.to_user_id, OLD.to_user_id);

  -- Cenário 1: Novo Convite Inserido (INSERT)
  IF TG_OP = 'INSERT' THEN
    PERFORM public.fn_create_notification(
      NEW.to_user_id,
      'Convite para família: ' || COALESCE(v_family_name, 'Família'),
      v_inviter_name || ' te convidou para fazer parte da família compartilhada.',
      'FAMILY_INVITE',
      NEW.id::text,
      jsonb_build_object('family_id', NEW.family_id, 'invitation_id', NEW.id),
      '/familia'
    );
  END IF;

  -- Cenário 2: Convite Respondido (UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    IF NEW.status = 'accepted' THEN
      PERFORM public.fn_create_notification(
        NEW.from_user_id,
        'Convite de Família Aceito',
        v_invitee_name || ' aceitou seu convite e agora faz parte da família "' || COALESCE(v_family_name, 'Família') || '".',
        'GENERAL',
        NEW.id::text,
        jsonb_build_object('family_id', NEW.family_id, 'status', 'accepted'),
        '/familia'
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.fn_create_notification(
        NEW.from_user_id,
        'Convite de Família Recusado',
        v_invitee_name || ' recusou seu convite para a família "' || COALESCE(v_family_name, 'Família') || '".',
        'GENERAL',
        NEW.id::text,
        jsonb_build_object('family_id', NEW.family_id, 'status', 'rejected'),
        '/familia'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_family_member_removed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_family_name text;
  v_family_owner_id uuid;
  v_remover_id uuid;
BEGIN
  -- Buscar o nome da família e o ID do dono dela
  SELECT name, owner_id INTO v_family_name, v_family_owner_id
  FROM public.families
  WHERE id = OLD.family_id;

  -- Obter o ID do usuário que efetuou a exclusão no Supabase
  v_remover_id := auth.uid();

  -- Cenário A: O participante foi removido por outra pessoa
  -- Se o membro removido (OLD.linked_user_id) for diferente de quem deletou (v_remover_id)
  IF OLD.linked_user_id IS NOT NULL AND OLD.linked_user_id <> v_remover_id THEN
    PERFORM public.fn_create_notification(
      OLD.linked_user_id,
      'Remoção de Família',
      'Você foi removido da família compartilhada "' || COALESCE(v_family_name, 'Família') || '".',
      'GENERAL',
      OLD.family_id::text,
      jsonb_build_object('family_id', OLD.family_id, 'action', 'removed'),
      '/familia'
    );
  END IF;

  -- Cenário B: O participante saiu voluntariamente da família compartilhada
  -- Se o membro deletou a si próprio (OLD.linked_user_id = v_remover_id) e ele não é o dono da família
  IF OLD.linked_user_id IS NOT NULL AND OLD.linked_user_id = v_remover_id AND v_family_owner_id <> v_remover_id THEN
    PERFORM public.fn_create_notification(
      v_family_owner_id,
      'Saída de Membro',
      COALESCE(OLD.name, 'Um membro') || ' saiu voluntariamente da sua família "' || COALESCE(v_family_name, 'Família') || '".',
      'GENERAL',
      OLD.family_id::text,
      jsonb_build_object('family_id', OLD.family_id, 'action', 'left', 'member_name', OLD.name),
      '/familia'
    );
  END IF;

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_family_owner_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_profile RECORD;
BEGIN
  SELECT id, full_name, email INTO v_owner_profile
  FROM profiles WHERE id = NEW.owner_id;

  INSERT INTO public.family_members (
    family_id,
    user_id,
    linked_user_id,
    name,
    email,
    role,
    status,
    invited_by
  ) VALUES (
    NEW.id,
    NEW.owner_id,
    NEW.owner_id,
    COALESCE(v_owner_profile.full_name, 'Dono da Família'),
    v_owner_profile.email,
    'admin'::public.family_role,
    'active',
    NEW.owner_id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  extracted_name text;
BEGIN
  -- Tentar extrair nome do metadata
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name'
  );

  -- Se não encontrou, usar parte do email
  IF extracted_name IS NULL OR extracted_name = '' THEN
    extracted_name := INITCAP(SPLIT_PART(NEW.email, '@', 1));
  END IF;

  -- Criar profile
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    extracted_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name, extracted_name),
    updated_at = NOW();

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_trip_invitation_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO trip_members (trip_id, user_id)
    VALUES (NEW.trip_id, NEW.invitee_id)
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_trip_invitation_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trip_name text;
  v_inviter_name text;
  v_invitee_name text;
BEGIN
  -- Buscar nome da viagem
  SELECT name INTO v_trip_name FROM public.trips WHERE id = COALESCE(NEW.trip_id, OLD.trip_id);

  -- Buscar nome de quem convidou
  SELECT COALESCE(full_name, 'Alguém') INTO v_inviter_name FROM public.profiles WHERE id = COALESCE(NEW.inviter_id, OLD.inviter_id);

  -- Buscar nome do convidado
  SELECT COALESCE(full_name, 'Alguém') INTO v_invitee_name FROM public.profiles WHERE id = COALESCE(NEW.invitee_id, OLD.invitee_id);

  -- Cenário 1: Novo Convite Inserido (INSERT)
  IF TG_OP = 'INSERT' THEN
    PERFORM public.fn_create_notification(
      NEW.invitee_id,
      'Convite para viagem: ' || COALESCE(v_trip_name, 'Viagem'),
      v_inviter_name || ' te convidou para participar da viagem "' || COALESCE(v_trip_name, 'Viagem') || '".',
      'TRIP_INVITE',
      NEW.id::text,
      jsonb_build_object('trip_id', NEW.trip_id, 'invitation_id', NEW.id),
      '/viagens'
    );
  END IF;

  -- Cenário 2: Convite Respondido (UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    IF NEW.status = 'accepted' THEN
      PERFORM public.fn_create_notification(
        NEW.inviter_id,
        'Convite de Viagem Aceito',
        v_invitee_name || ' aceitou seu convite para participar da viagem "' || COALESCE(v_trip_name, 'Viagem') || '"!',
        'GENERAL',
        NEW.id::text,
        jsonb_build_object('trip_id', NEW.trip_id, 'status', 'accepted'),
        '/viagens'
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.fn_create_notification(
        NEW.inviter_id,
        'Convite de Viagem Recusado',
        v_invitee_name || ' recusou seu convite para a viagem "' || COALESCE(v_trip_name, 'Viagem') || '".',
        'GENERAL',
        NEW.id::text,
        jsonb_build_object('trip_id', NEW.trip_id, 'status', 'rejected'),
        '/viagens'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_trip_invitation_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('accepted', 'rejected') AND OLD.status = 'pending' THEN
    -- Marcar notificação como lida E dispensada
    UPDATE notifications
    SET is_read = true,
        read_at = NOW(),
        is_dismissed = true,
        dismissed_at = NOW()
    WHERE related_id = NEW.id
      AND related_type = 'trip_invitation'
      AND type = 'TRIP_INVITE';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_family_member_v2(p_family_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = p_family_id
      AND (linked_user_id = p_user_id OR user_id = p_user_id)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_trip_member(trip_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM trip_members
    WHERE trip_id = trip_id_param
    AND user_id = user_id_param
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_balance_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_triggered_by TEXT;
  v_tx_id UUID;
BEGIN
  -- Só loga se o balance REALMENTE mudou
  IF OLD.balance IS NOT DISTINCT FROM NEW.balance THEN
    RETURN NEW;
  END IF;

  -- Tenta identificar o trigger context
  v_triggered_by := TG_OP;
  v_tx_id := NULL;

  -- Se foi chamado de dentro de um trigger de transaction, captura o ID
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'accounts' THEN
    -- Não conseguimos saber o transaction_id aqui diretamente,
    -- mas registramos o timestamp e o contexto.
    v_triggered_by := 'RECALC';
  END IF;

  INSERT INTO public.balance_changes (
    account_id, old_balance, new_balance,
    triggered_by, transaction_id, changed_at
  ) VALUES (
    NEW.id, OLD.balance, NEW.balance,
    v_triggered_by, v_tx_id, NOW()
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_transaction_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.audit_log (table_name, record_id, action, old_values, changed_by, changed_at)
    VALUES ('transactions', OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid(), NOW());
    RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_as_paid_by_debtor(p_split_id uuid, p_settlement_tx_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_split RECORD;
BEGIN
  -- Buscar split
  SELECT * INTO v_split
  FROM transaction_splits
  WHERE id = p_split_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split não encontrado';
  END IF;

  -- Verificar se usuário é o devedor
  IF v_split.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o devedor pode marcar como pago';
  END IF;

  -- Marcar como pago pelo devedor
  UPDATE transaction_splits
  SET
    settled_by_debtor = TRUE,
    debtor_settlement_tx_id = p_settlement_tx_id,
    settled_at = CASE
      WHEN settled_by_creditor = TRUE THEN NOW()
      ELSE settled_at
    END,
    is_settled = CASE
      WHEN settled_by_creditor = TRUE THEN TRUE
      ELSE is_settled
    END
  WHERE id = p_split_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_as_received_by_creditor(p_split_id uuid, p_settlement_tx_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_split RECORD;
  v_transaction RECORD;
BEGIN
  -- Buscar split e transação
  SELECT ts.*, t.user_id AS creditor_user_id
  INTO v_split
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.id = p_split_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split não encontrado';
  END IF;

  -- Verificar se usuário é o credor
  IF v_split.creditor_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o credor pode marcar como recebido';
  END IF;

  -- Marcar como recebido pelo credor
  UPDATE transaction_splits
  SET
    settled_by_creditor = TRUE,
    creditor_settlement_tx_id = p_settlement_tx_id,
    settled_at = CASE
      WHEN settled_by_debtor = TRUE THEN NOW()
      ELSE settled_at
    END,
    is_settled = CASE
      WHEN settled_by_debtor = TRUE THEN TRUE
      ELSE is_settled
    END
  WHERE id = p_split_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.migrate_transactions_to_account(p_from_account_id uuid, p_to_account_id uuid, p_user_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_count bigint;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_user_id is distinct from v_uid then raise exception 'Cannot manage accounts for another user' using errcode = '42501'; end if;
  if not exists (select 1 from public.accounts where id = p_from_account_id and user_id = v_uid) then
    raise exception 'Conta de origem nao encontrada';
  end if;
  if not exists (select 1 from public.accounts where id = p_to_account_id and user_id = v_uid) then
    raise exception 'Conta de destino nao encontrada';
  end if;
  update public.transactions set account_id = p_to_account_id where account_id = p_from_account_id and user_id = v_uid;
  get diagnostics v_count = row_count;
  return v_count;
end; $function$;

CREATE OR REPLACE FUNCTION public.notify_shared_expense()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payer_name TEXT;
  v_description TEXT;
  v_amount NUMERIC;
  v_installments TEXT;
  v_split RECORD;
  v_member_user_id UUID;
BEGIN
  -- Apenas para transações compartilhadas novas
  IF NEW.is_shared = TRUE AND TG_OP = 'INSERT' THEN
    -- Buscar nome do pagador
    SELECT full_name INTO v_payer_name
    FROM profiles
    WHERE id = NEW.user_id;

    v_description := NEW.description;
    v_amount := NEW.amount;

    -- Formatar texto de parcelamento
    IF NEW.is_installment = TRUE AND NEW.total_installments > 1 THEN
      v_installments := ' em ' || NEW.total_installments || 'x de R$ ' ||
                        ROUND(NEW.amount / NEW.total_installments, 2);
    ELSE
      v_installments := '';
    END IF;

    -- Criar notificação para cada membro que recebeu split
    FOR v_split IN
      SELECT ts.member_id, ts.amount as split_amount
      FROM transaction_splits ts
      WHERE ts.transaction_id = NEW.id
    LOOP
      -- Buscar user_id do membro
      SELECT linked_user_id INTO v_member_user_id
      FROM family_members
      WHERE id = v_split.member_id;

      -- Criar notificação apenas se o membro não for o pagador e tiver user_id
      IF v_member_user_id IS NOT NULL AND v_member_user_id != NEW.user_id THEN
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          data,
          is_read
        ) VALUES (
          v_member_user_id,
          'SHARED_EXPENSE',
          'Nova despesa compartilhada',
          v_payer_name || ' compartilhou "' || v_description || '"' || v_installments ||
          '. Sua parte: R$ ' || ROUND(v_split.split_amount, 2),
          jsonb_build_object(
            'transaction_id', NEW.id,
            'series_id', NEW.series_id,
            'payer_id', NEW.user_id,
            'payer_name', v_payer_name,
            'description', v_description,
            'total_amount', v_amount,
            'split_amount', v_split.split_amount,
            'is_installment', NEW.is_installment,
            'total_installments', NEW.total_installments
          ),
          FALSE
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.permanent_delete_old_records()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  -- Deletar registros soft-deleted há mais de 90 dias
  v_cutoff_date := NOW() - INTERVAL '90 days';

  -- Deletar transações antigas
  DELETE FROM transactions
  WHERE deleted_at IS NOT NULL
    AND deleted_at < v_cutoff_date;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Deletar contas antigas
  DELETE FROM accounts
  WHERE deleted_at IS NOT NULL
    AND deleted_at < v_cutoff_date;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_delete_if_has_transactions()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  tx_count INTEGER;
BEGIN
  -- Se for um soft delete (marcando deleted_at) ou hard delete (DELETE físico)
  IF (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) OR (TG_OP = 'DELETE') THEN

    IF TG_TABLE_NAME = 'accounts' THEN
      SELECT COUNT(*) INTO tx_count FROM public.transactions WHERE account_id = OLD.id AND deleted_at IS NULL;
      IF tx_count > 0 THEN
        RAISE EXCEPTION 'Não é possível excluir a conta. Existem % transações vinculadas. Por favor, arquive.', tx_count;
      END IF;
    ELSIF TG_TABLE_NAME = 'categories' THEN
      SELECT COUNT(*) INTO tx_count FROM public.transactions WHERE category_id = OLD.id AND deleted_at IS NULL;
      IF tx_count > 0 THEN
        RAISE EXCEPTION 'Não é possível excluir a categoria. Existem % transações vinculadas. Por favor, arquive.', tx_count;
      END IF;
    END IF;

  END IF;

  -- Para UPDATE retorna NEW, para DELETE retorna OLD
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_credit_card_invoices()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_card RECORD;
  v_current_date DATE := CURRENT_DATE;
  v_closing_date DATE;
  v_due_date DATE;
  v_invoice_total NUMERIC;
  v_month INTEGER;
  v_year INTEGER;
BEGIN
  -- Iterar sobre todos os cartões de crédito
  FOR v_card IN
    SELECT id, closing_day, due_day
    FROM accounts
    WHERE type = 'CREDIT_CARD' AND deleted = false AND is_active = true
  LOOP
    IF v_card.closing_day IS NULL OR v_card.due_day IS NULL THEN
      CONTINUE;
    END IF;

    -- Calcular datas da fatura atual baseada na data atual
    v_year := EXTRACT(YEAR FROM v_current_date);
    v_month := EXTRACT(MONTH FROM v_current_date);

    -- Tentar encontrar faturas do mês passado que já passaram do dia de fechamento
    -- e fechá-las se ainda estiverem OPEN

    -- A lógica simples: para qualquer fatura onde CURRENT_DATE > closing_date, mude para CLOSED
    -- E se total == 0, mude para PAID?

    -- Para focar na regra de negócio atual, deixaremos isso para um cron no futuro.
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_daily_yields()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account RECORD;
  v_profile RECORD;
  v_daily_rate NUMERIC;
  v_yield_amount NUMERIC;
  v_category_id UUID;
  v_target_date DATE;
  v_dow INTEGER;
BEGIN
  -- We process yields for yesterday
  v_target_date := CURRENT_DATE - INTERVAL '1 day';

  -- Check day of week (0=Sunday, 6=Saturday)
  v_dow := EXTRACT(DOW FROM v_target_date);

  -- Se ontem foi fim de semana, não tem rendimento
  IF v_dow = 0 OR v_dow = 6 THEN
    RETURN;
  END IF;

  FOR v_account IN
    SELECT * FROM accounts
    WHERE is_active = true
      AND yield_type = 'CDI'
      AND yield_rate > 0
      AND balance > 0
  LOOP
    -- Get profile for global_cdi_rate
    SELECT * INTO v_profile FROM profiles WHERE id = v_account.user_id;

    IF v_profile.global_cdi_rate IS NOT NULL AND v_profile.global_cdi_rate > 0 THEN
      -- Calculate daily CDI rate based on 252 business days
      -- Formula: (1 + annual_rate/100)^(1/252) - 1
      v_daily_rate := POWER(1 + (v_profile.global_cdi_rate / 100.0), 1.0 / 252.0) - 1;

      -- Calculate yield
      v_yield_amount := v_account.balance * v_daily_rate * (v_account.yield_rate / 100.0);

      -- Arredondar para 2 casas
      v_yield_amount := ROUND(v_yield_amount, 2);

      IF v_yield_amount > 0 THEN
        -- Find or create a 'Rendimentos' category for this user
        SELECT id INTO v_category_id
        FROM categories
        WHERE user_id = v_account.user_id
          AND type = 'income'
          AND name ILIKE '%rendimento%'
        LIMIT 1;

        IF v_category_id IS NULL THEN
          INSERT INTO categories (user_id, name, type, icon, color)
          VALUES (v_account.user_id, 'Rendimentos', 'income', '📈', '#10b981')
          RETURNING id INTO v_category_id;
        END IF;

        -- Insert the transaction
        INSERT INTO transactions (
          user_id,
          account_id,
          category_id,
          amount,
          date,
          description,
          type,
          is_paid,
          competence_date
        ) VALUES (
          v_account.user_id,
          v_account.id,
          v_category_id,
          v_yield_amount,
          v_target_date,
          'Rendimento Automático (CDI)',
          'income',
          true,
          DATE_TRUNC('month', v_target_date)::date
        );
      END IF;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reactivate_family_member(p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  update public.family_members
  set
    status = 'active',
    removed_at = null,
    removed_by = null,
    removal_reason = null,
    updated_at = now()
  where id = p_member_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reactivate_trip_member(p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  update public.trip_members
  set
    status = 'active',
    removed_at = null,
    removed_by = null,
    removal_reason = null,
    updated_at = now()
  where id = p_member_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_account_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
BEGIN
  SELECT COALESCE(initial_balance, 0) INTO v_initial_balance
  FROM accounts WHERE id = p_account_id;

  SELECT v_initial_balance + COALESCE(SUM(
    CASE
      WHEN type = 'INCOME' THEN amount
      WHEN type = 'EXPENSE' THEN -amount
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN amount
      ELSE 0
    END
  ), 0) INTO v_calculated_balance
  FROM transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND (
      payer_id IS NULL
      OR payer_id = ANY(
        ARRAY(SELECT id FROM family_members WHERE user_id = transactions.user_id)
      )
    )
    AND date <= CURRENT_DATE
    AND deleted_at IS NULL;

  UPDATE accounts SET balance = v_calculated_balance, updated_at = NOW()
  WHERE id = p_account_id;

  RETURN v_calculated_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_all_balances(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_account_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_user_id is distinct from v_uid then raise exception 'Cannot recalculate balances for another user' using errcode = '42501'; end if;
  for v_account_id in select id from public.accounts where user_id = v_uid and deleted_at is null loop
    perform public.calculate_single_account_balance(v_account_id);
  end loop;
end; $function$;

CREATE OR REPLACE FUNCTION public.reject_settlement_request(p_split_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_split RECORD;
BEGIN
  SELECT * INTO v_split FROM transaction_splits WHERE id = p_split_id FOR UPDATE;

  IF v_split IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Split não encontrado.');
  END IF;

  IF v_split.is_settled THEN
    RETURN json_build_object('success', false, 'error', 'Split já foi liquidado.');
  END IF;

  -- Reset both settlement flags
  UPDATE transaction_splits SET
    settled_by_debtor = false,
    settled_by_creditor = false,
    debtor_settlement_tx_id = NULL,
    creditor_settlement_tx_id = NULL,
    is_settled = false,
    settled_at = NULL
  WHERE id = p_split_id;

  -- Delete associated settlement transactions if they exist
  IF v_split.debtor_settlement_tx_id IS NOT NULL THEN
    DELETE FROM transactions WHERE id = v_split.debtor_settlement_tx_id;
  END IF;
  IF v_split.creditor_settlement_tx_id IS NOT NULL THEN
    DELETE FROM transactions WHERE id = v_split.creditor_settlement_tx_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (table_name, record_id, operation, new_data)
  VALUES (
    'transaction_splits', p_split_id, 'SETTLEMENT_REJECTED',
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_family_member(p_member_id uuid, p_removed_by uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  update public.family_members
  set
    status = 'inactive',
    removed_at = now(),
    removed_by = p_removed_by,
    removal_reason = p_reason,
    updated_at = now()
  where id = p_member_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.remove_trip_member(p_member_id uuid, p_removed_by uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  update public.trip_members
  set
    status = 'inactive',
    removed_at = now(),
    removed_by = p_removed_by,
    removal_reason = p_reason,
    updated_at = now()
  where id = p_member_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_settlement(p_split_ids uuid[], p_account_id uuid, p_user_id uuid, p_is_payment boolean, p_amount numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_split_id uuid;
  v_split record;
  v_total_amount numeric := 0;
  v_tx_id uuid;
  v_processed_count integer := 0;
  v_month_name text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_user_id is distinct from v_uid then
    raise exception 'Cannot settle expenses for another user' using errcode = '42501';
  end if;
  if p_split_ids is null or cardinality(p_split_ids) = 0 then
    return json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  end if;
  if cardinality(p_split_ids) <> (
    select count(distinct split_id) from unnest(p_split_ids) as split_id
  ) then
    return json_build_object('success', false, 'error', 'A lista contem splits duplicados.');
  end if;
  if p_amount is not null and p_amount <= 0 then
    return json_build_object('success', false, 'error', 'O valor do acerto deve ser positivo.');
  end if;
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_uid and deleted_at is null
  ) then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;

  -- Acquire locks in deterministic order before validating or writing.
  perform 1
  from public.transaction_splits s
  where s.id = any(p_split_ids)
  order by s.id
  for update;

  if (select count(*) from public.transaction_splits where id = any(p_split_ids))
      <> cardinality(p_split_ids) then
    return json_build_object('success', false, 'error', 'Um ou mais splits nao foram encontrados.');
  end if;

  foreach v_split_id in array p_split_ids loop
    select s.*, t.user_id as creditor_user_id
    into v_split
    from public.transaction_splits s
    join public.transactions t on t.id = s.transaction_id
    where s.id = v_split_id;

    if v_split.is_settled then
      return json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' ja foi totalmente liquidado.'
      );
    end if;
    if v_split.user_id is distinct from v_uid
       and v_split.creditor_user_id is distinct from v_uid then
      raise exception 'User is not a participant in split %', v_split_id
        using errcode = '42501';
    end if;

    v_total_amount := v_total_amount + v_split.amount;
  end loop;

  if p_amount is not null then
    v_total_amount := p_amount;
  end if;
  if v_total_amount <= 0 then
    return json_build_object('success', false, 'error', 'O valor do acerto deve ser positivo.');
  end if;

  v_month_name := case extract(month from current_date)
    when 1 then 'Janeiro' when 2 then 'Fevereiro' when 3 then 'Marco'
    when 4 then 'Abril' when 5 then 'Maio' when 6 then 'Junho'
    when 7 then 'Julho' when 8 then 'Agosto' when 9 then 'Setembro'
    when 10 then 'Outubro' when 11 then 'Novembro' when 12 then 'Dezembro'
  end;

  insert into public.transactions (
    user_id, creator_user_id, account_id, amount, type, description, date,
    competence_date, domain, is_shared, created_at, updated_at
  ) values (
    v_uid, v_uid, p_account_id, v_total_amount,
    case when p_is_payment then 'EXPENSE'::public.transaction_type
         else 'INCOME'::public.transaction_type end,
    case when p_is_payment then 'Pagamento de despesa compartilhada - '
         else 'Recebimento de despesa compartilhada - ' end
      || v_month_name || '/' || extract(year from current_date),
    current_date, date_trunc('month', current_date)::date,
    'PERSONAL'::public.transaction_domain, false, now(), now()
  ) returning id into v_tx_id;

  foreach v_split_id in array p_split_ids loop
    select s.*, t.user_id as creditor_user_id
    into v_split
    from public.transaction_splits s
    join public.transactions t on t.id = s.transaction_id
    where s.id = v_split_id;

    if v_split.user_id = v_uid then
      update public.transaction_splits
      set settled_by_debtor = true,
          debtor_settlement_tx_id = v_tx_id
      where id = v_split_id;
    end if;

    if v_split.creditor_user_id = v_uid then
      update public.transaction_splits
      set settled_by_creditor = true,
          creditor_settlement_tx_id = v_tx_id
      where id = v_split_id;
    end if;

    update public.transaction_splits
    set is_settled = (settled_by_debtor = true and settled_by_creditor = true),
        settled_at = case
          when settled_by_debtor = true and settled_by_creditor = true then now()
          else null
        end,
        settled_transaction_id = case
          when settled_by_debtor = true and settled_by_creditor = true then v_tx_id
          else null
        end
    where id = v_split_id;

    v_processed_count := v_processed_count + 1;
  end loop;

  return json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'processed_count', v_processed_count,
    'total_amount', v_total_amount
  );
exception
  when insufficient_privilege then raise;
  when others then
    return json_build_object('success', false, 'error', sqlerrm);
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_settlement_confirmation(p_split_ids uuid[], p_debtor_id uuid, p_creditor_id uuid, p_amount numeric, p_currency text DEFAULT 'BRL'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_debtor_name text;
    v_msg text;
    v_item_count int;
    v_first_split_id uuid;
BEGIN
    SELECT full_name INTO v_debtor_name FROM public.profiles WHERE id = p_debtor_id;

    v_item_count := array_length(p_split_ids, 1);
    v_first_split_id := p_split_ids[1];

    v_msg := format('%s confirmou o pagamento de %s %s (%s item/ns). Clique para confirmar o recebimento.',
                    v_debtor_name, p_currency, p_amount, v_item_count);

    PERFORM public.fn_create_notification(
        p_creditor_id,
        'Confirmação de Recebimento 💰',
        v_msg,
        'SHARED_PENDING',
        '/compartilhados' || CASE WHEN v_first_split_id IS NOT NULL THEN '?confirmSettlement=' || v_first_split_id::text ELSE '' END
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_settlement_v2(p_split_ids uuid[], p_account_id uuid, p_is_payment boolean, p_amount numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.request_settlement(
    p_split_ids, p_account_id, private.authenticated_uid(), p_is_payment, p_amount
  )
$function$;

CREATE OR REPLACE FUNCTION public.resolve_error_report(p_report_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: requer privilegios de administrador.' using errcode = '42501';
  end if;
  update public.error_logs set status = 'RESOLVED' where id = p_report_id;
  if not found then
    raise exception 'Relatorio de erro nao encontrado.' using errcode = 'P0002';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.restore_transaction(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Restaurar transação
  UPDATE transactions
  SET
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = p_transaction_id
    AND user_id = auth.uid();

  -- Restaurar splits
  UPDATE transaction_splits
  SET
    deleted_at = NULL,
    deleted_by = NULL
  WHERE transaction_id = p_transaction_id;

  -- Restaurar espelhos
  UPDATE transactions
  SET
    deleted_at = NULL,
    deleted_by = NULL
  WHERE source_transaction_id = p_transaction_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_transactions(p_query text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, description text, amount numeric, type text, date date, currency text, category_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.description,
    t.amount,
    t.type::text,
    t.date,
    t.currency,
    t.category_id
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.description ILIKE '%' || p_query || '%'
  ORDER BY t.date DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_id UUID;
BEGIN
  -- ==========================================
  -- 1. CATEGORIAS DE SISTEMA
  -- ==========================================

  -- Saldo Inicial
  INSERT INTO public.categories (user_id, name, icon, type, color)
  VALUES (p_user_id, 'Saldo Inicial', '💰', 'income', NULL)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- Acerto Financeiro (Income e Expense)
  INSERT INTO public.categories (user_id, name, icon, type, color)
  VALUES (p_user_id, 'Acerto Financeiro', '🤝', 'income', NULL)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  INSERT INTO public.categories (user_id, name, icon, type, color)
  VALUES (p_user_id, 'Acerto Financeiro', '🤝', 'expense', NULL)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- ==========================================
  -- 2. DESPESAS HIERÁRQUICAS (defaultCategories.ts)
  -- ==========================================

  -- 1. Supermercado
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Supermercado' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Supermercado', '🛒', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Feira', '🥬', 'expense', v_parent_id),
    (p_user_id, 'Açougue', '🥩', 'expense', v_parent_id),
    (p_user_id, 'Padaria', '🥖', 'expense', v_parent_id),
    (p_user_id, 'Bebidas', '🥤', 'expense', v_parent_id),
    (p_user_id, 'Higiene e Limpeza', '🧼', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 2. Restaurantes e Lanches
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Restaurantes e Lanches' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Restaurantes e Lanches', '🍽️', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Restaurante', '🍽️', 'expense', v_parent_id),
    (p_user_id, 'Lanche', '🍔', 'expense', v_parent_id),
    (p_user_id, 'Café', '☕', 'expense', v_parent_id),
    (p_user_id, 'Bar', '🍺', 'expense', v_parent_id),
    (p_user_id, 'Fast Food', '🍟', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 3. Delivery
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Delivery' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Delivery', '🍕', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Marmita', '🍱', 'expense', v_parent_id),
    (p_user_id, 'Pizza', '🍕', 'expense', v_parent_id),
    (p_user_id, 'Hamburguer', '🍔', 'expense', v_parent_id),
    (p_user_id, 'Comida Japonesa', '🍣', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 4. Gasolina
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Gasolina' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Gasolina', '⛽', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Combustível', '⛽', 'expense', v_parent_id),
    (p_user_id, 'Etanol', '🌿', 'expense', v_parent_id),
    (p_user_id, 'Diesel', '🚚', 'expense', v_parent_id),
    (p_user_id, 'GNV', '🎈', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 5. Transporte
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Transporte' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Transporte', '🚗', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Uber/Taxi', '🚕', 'expense', v_parent_id),
    (p_user_id, 'Ônibus', '🚌', 'expense', v_parent_id),
    (p_user_id, 'Metrô', '🚇', 'expense', v_parent_id),
    (p_user_id, 'Trem', '🚆', 'expense', v_parent_id),
    (p_user_id, 'Estacionamento', '🅿️', 'expense', v_parent_id),
    (p_user_id, 'Pedágio', '🛣️', 'expense', v_parent_id),
    (p_user_id, 'Manutenção Veículo', '🔧', 'expense', v_parent_id),
    (p_user_id, 'Lavagem', '🚿', 'expense', v_parent_id),
    (p_user_id, 'IPVA', '🚗', 'expense', v_parent_id),
    (p_user_id, 'Seguro Veículo', '🛡️', 'expense', v_parent_id),
    (p_user_id, 'Licenciamento', '📋', 'expense', v_parent_id),
    (p_user_id, 'Multas', '🚨', 'expense', v_parent_id),
    (p_user_id, 'Financiamento Veículo', '💳', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 6. Moradia
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Moradia' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Moradia', '🏠', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Aluguel', '🏠', 'expense', v_parent_id),
    (p_user_id, 'Condomínio', '🏢', 'expense', v_parent_id),
    (p_user_id, 'Água', '💧', 'expense', v_parent_id),
    (p_user_id, 'Luz', '💡', 'expense', v_parent_id),
    (p_user_id, 'Gás', '🔥', 'expense', v_parent_id),
    (p_user_id, 'Internet', '🌐', 'expense', v_parent_id),
    (p_user_id, 'Telefone', '📱', 'expense', v_parent_id),
    (p_user_id, 'TV a Cabo', '📺', 'expense', v_parent_id),
    (p_user_id, 'IPTU', '🏘️', 'expense', v_parent_id),
    (p_user_id, 'Manutenção', '🔧', 'expense', v_parent_id),
    (p_user_id, 'Móveis', '🛋️', 'expense', v_parent_id),
    (p_user_id, 'Decoração', '🖼️', 'expense', v_parent_id),
    (p_user_id, 'Eletrodomésticos', '🔌', 'expense', v_parent_id),
    (p_user_id, 'Limpeza', '🧹', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 7. Contas e Assinaturas
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Contas e Assinaturas' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Contas e Assinaturas', '📺', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Netflix', '🎬', 'expense', v_parent_id),
    (p_user_id, 'Spotify', '🎵', 'expense', v_parent_id),
    (p_user_id, 'Amazon Prime', '📦', 'expense', v_parent_id),
    (p_user_id, 'Disney+', '🏰', 'expense', v_parent_id),
    (p_user_id, 'HBO Max', '🎭', 'expense', v_parent_id),
    (p_user_id, 'YouTube Premium', '▶️', 'expense', v_parent_id),
    (p_user_id, 'Cloud Storage', '☁️', 'expense', v_parent_id),
    (p_user_id, 'Lavanderia', '🧺', 'expense', v_parent_id),
    (p_user_id, 'Costureira', '🧵', 'expense', v_parent_id),
    (p_user_id, 'Encanador', '🚰', 'expense', v_parent_id),
    (p_user_id, 'Eletricista', '⚡', 'expense', v_parent_id),
    (p_user_id, 'Diarista', '🧹', 'expense', v_parent_id),
    (p_user_id, 'Jardineiro', '🌱', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 8. Saúde
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Saúde' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Saúde', '💊', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Plano de Saúde', '🏥', 'expense', v_parent_id),
    (p_user_id, 'Médico', '👨‍⚕️', 'expense', v_parent_id),
    (p_user_id, 'Dentista', '🦷', 'expense', v_parent_id),
    (p_user_id, 'Farmácia', '💊', 'expense', v_parent_id),
    (p_user_id, 'Exames', '🔬', 'expense', v_parent_id),
    (p_user_id, 'Cirurgia', '🏥', 'expense', v_parent_id),
    (p_user_id, 'Fisioterapia', '🧘', 'expense', v_parent_id),
    (p_user_id, 'Terapia', '🧠', 'expense', v_parent_id),
    (p_user_id, 'Psicólogo', '💭', 'expense', v_parent_id),
    (p_user_id, 'Óculos/Lentes', '👓', 'expense', v_parent_id),
    (p_user_id, 'Aparelho Ortodôntico', '😁', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 9. Educação
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Educação' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Educação', '📚', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Mensalidade Escolar', '🎓', 'expense', v_parent_id),
    (p_user_id, 'Mensalidade Faculdade', '🏫', 'expense', v_parent_id),
    (p_user_id, 'Curso Online', '💻', 'expense', v_parent_id),
    (p_user_id, 'Curso Presencial', '📚', 'expense', v_parent_id),
    (p_user_id, 'Livros', '📖', 'expense', v_parent_id),
    (p_user_id, 'Material Escolar', '✏️', 'expense', v_parent_id),
    (p_user_id, 'Idiomas', '🗣️', 'expense', v_parent_id),
    (p_user_id, 'Certificações', '📜', 'expense', v_parent_id),
    (p_user_id, 'Uniforme', '👔', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 10. Compras
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Compras' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Compras', '🛍️', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Roupas', '👕', 'expense', v_parent_id),
    (p_user_id, 'Calçados', '👟', 'expense', v_parent_id),
    (p_user_id, 'Acessórios', '👜', 'expense', v_parent_id),
    (p_user_id, 'Joias', '💍', 'expense', v_parent_id),
    (p_user_id, 'Relógios', '⌚', 'expense', v_parent_id),
    (p_user_id, 'Eletrônicos', '📱', 'expense', v_parent_id),
    (p_user_id, 'Informática', '💻', 'expense', v_parent_id),
    (p_user_id, 'Cosméticos', '💄', 'expense', v_parent_id),
    (p_user_id, 'Perfumes', '🌸', 'expense', v_parent_id),
    (p_user_id, 'Presentes', '🎁', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 11. Lazer
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Lazer' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Lazer', '🎮', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Cinema', '🎬', 'expense', v_parent_id),
    (p_user_id, 'Teatro', '🎭', 'expense', v_parent_id),
    (p_user_id, 'Shows', '🎵', 'expense', v_parent_id),
    (p_user_id, 'Eventos', '🎪', 'expense', v_parent_id),
    (p_user_id, 'Parque', '🎡', 'expense', v_parent_id),
    (p_user_id, 'Viagem Lazer', '🏖️', 'expense', v_parent_id),
    (p_user_id, 'Hobbies', '🎨', 'expense', v_parent_id),
    (p_user_id, 'Jogos', '🎮', 'expense', v_parent_id),
    (p_user_id, 'Esportes', '⚽', 'expense', v_parent_id),
    (p_user_id, 'Academia', '💪', 'expense', v_parent_id),
    (p_user_id, 'Clube', '🏊', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 12. Viagens
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Viagens' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Viagens', '✈️', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Passagem Aérea', '✈️', 'expense', v_parent_id),
    (p_user_id, 'Passagem Rodoviária', '🚌', 'expense', v_parent_id),
    (p_user_id, 'Hotel', '🏨', 'expense', v_parent_id),
    (p_user_id, 'Hospedagem', '🛏️', 'expense', v_parent_id),
    (p_user_id, 'Aluguel de Carro', '🚗', 'expense', v_parent_id),
    (p_user_id, 'Turismo', '🗺️', 'expense', v_parent_id),
    (p_user_id, 'Passeios', '🎢', 'expense', v_parent_id),
    (p_user_id, 'Seguro Viagem', '🛡️', 'expense', v_parent_id),
    (p_user_id, 'Visto', '📋', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 13. Família e Pets
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Família e Pets' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Família e Pets', '🐾', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Veterinário', '🐕', 'expense', v_parent_id),
    (p_user_id, 'Ração', '🦴', 'expense', v_parent_id),
    (p_user_id, 'Pet Shop', '🐾', 'expense', v_parent_id),
    (p_user_id, 'Banho e Tosa', '🛁', 'expense', v_parent_id),
    (p_user_id, 'Medicamentos Pet', '💊', 'expense', v_parent_id),
    (p_user_id, 'Hotel Pet', '🏨', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 14. Financeiro
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Financeiro' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Financeiro', '🏦', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Taxas', '📋', 'expense', v_parent_id),
    (p_user_id, 'Juros', '💸', 'expense', v_parent_id),
    (p_user_id, 'Tarifas Bancárias', '🏦', 'expense', v_parent_id),
    (p_user_id, 'Impostos', '🏛️', 'expense', v_parent_id),
    (p_user_id, 'IPTU', '🏘️', 'expense', v_parent_id),
    (p_user_id, 'IPVA', '🚗', 'expense', v_parent_id),
    (p_user_id, 'IR', '💼', 'expense', v_parent_id),
    (p_user_id, 'Multas', '🚨', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- 15. Outros
  SELECT id INTO v_parent_id FROM public.categories
  WHERE user_id = p_user_id AND name = 'Outros' AND type = 'expense' AND parent_category_id IS NULL;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
    VALUES (p_user_id, 'Outros', '📦', 'expense', NULL)
    RETURNING id INTO v_parent_id;
  END IF;

  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Diversos', '📦', 'expense', v_parent_id),
    (p_user_id, 'Emergência', '🚨', 'expense', v_parent_id)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  -- ==========================================
  -- 3. RECEITAS (defaultCategories.ts)
  -- ==========================================
  INSERT INTO public.categories (user_id, name, icon, type, parent_category_id) VALUES
    (p_user_id, 'Salário', '💰', 'income', NULL),
    (p_user_id, 'Freelance', '💻', 'income', NULL),
    (p_user_id, 'Vendas', '🏷️', 'income', NULL),
    (p_user_id, 'Investimentos', '📈', 'income', NULL),
    (p_user_id, 'Reembolso', '💳', 'income', NULL),
    (p_user_id, 'Cashback', '💸', 'income', NULL),
    (p_user_id, 'Benefícios', '🎁', 'income', NULL),
    (p_user_id, 'Presente', '🎉', 'income', NULL),
    (p_user_id, 'Transferência Recebida', '📥', 'income', NULL),
    (p_user_id, 'Outros', '💵', 'income', NULL)
  ON CONFLICT (user_id, name, type, parent_category_id) DO NOTHING;

  RETURN;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao criar categorias padrão corretas: %', SQLERRM;
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_credit_card_competence_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type TEXT;
  v_closing_day INTEGER;
  v_closing_mode TEXT;
  v_transaction_date DATE;
  v_transaction_day INTEGER;
  v_competence_date DATE;
  v_actual_closing_date DATE;
  v_month_start DATE;
BEGIN
  IF NEW.is_installment = true AND NEW.competence_date IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.type, a.closing_day, COALESCE(a.closing_day_mode, 'FIXED_DAY')
  INTO v_account_type, v_closing_day, v_closing_mode
  FROM accounts a
  WHERE a.id = NEW.account_id;

  IF v_account_type = 'CREDIT_CARD' THEN
    v_transaction_date := NEW.date::date;
    v_closing_day := COALESCE(v_closing_day, 1);

    -- Check for per-invoice override for this transaction's reference month
    v_month_start := DATE_TRUNC('month', v_transaction_date)::date;

    SELECT o.closing_date INTO v_actual_closing_date
    FROM credit_card_closing_overrides o
    WHERE o.account_id = NEW.account_id
      AND o.reference_date = v_month_start;

    -- No override → calculate using mode
    IF v_actual_closing_date IS NULL THEN
      v_actual_closing_date := public.get_actual_closing_date(v_month_start, v_closing_day, v_closing_mode);
    END IF;

    v_transaction_day := EXTRACT(DAY FROM v_transaction_date);

    IF v_transaction_day > EXTRACT(DAY FROM v_actual_closing_date) THEN
      v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
    ELSE
      v_competence_date := DATE_TRUNC('month', v_transaction_date)::date;
    END IF;

    NEW.competence_date := v_competence_date;
    RETURN NEW;
  END IF;

  -- Non credit-card: default month-based
  IF TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
  ELSIF TG_OP = 'INSERT' AND NEW.competence_date IS NULL THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_pin(p_pin text, p_require_on_open boolean DEFAULT true)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) < 4 THEN
    RAISE EXCEPTION 'PIN must be at least 4 digits' USING ERRCODE = 'P0002';
  END IF;

  IF p_pin !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'PIN must contain only digits' USING ERRCODE = 'P0003';
  END IF;

  UPDATE profiles
  SET
    app_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 8)),
    require_pin_on_open = p_require_on_open
  WHERE id = auth.uid();

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_transaction_currency_from_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_currency TEXT;
  v_account_is_international BOOLEAN;
BEGIN
  -- Buscar moeda e tipo da conta
  SELECT currency, is_international
  INTO v_account_currency, v_account_is_international
  FROM public.accounts
  WHERE id = NEW.account_id;

  -- Se a conta for internacional, usar a moeda da conta
  IF v_account_is_international = true THEN
    NEW.currency := v_account_currency;
  ELSE
    -- Se a conta for nacional, usar BRL
    NEW.currency := 'BRL';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_balance_between_users(p_user1_id uuid, p_user2_id uuid, p_settlement_transaction_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Marcar todas as entradas como acertadas
  UPDATE public.financial_ledger
  SET
    is_settled = TRUE,
    settled_at = NOW(),
    settlement_transaction_id = p_settlement_transaction_id
  WHERE (
    (user_id = p_user1_id AND related_user_id = p_user2_id)
    OR (user_id = p_user2_id AND related_user_id = p_user1_id)
  )
  AND is_settled = FALSE;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  -- Também marcar splits como acertados
  UPDATE public.transaction_splits
  SET
    is_settled = TRUE,
    settled_at = NOW(),
    settled_transaction_id = p_settlement_transaction_id
  WHERE (
    (user_id = p_user1_id AND transaction_id IN (
      SELECT id FROM public.transactions WHERE user_id = p_user2_id
    ))
    OR (user_id = p_user2_id AND transaction_id IN (
      SELECT id FROM public.transactions WHERE user_id = p_user1_id
    ))
  )
  AND is_settled = FALSE;

  RETURN rows_updated;
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_compensated_splits(p_split_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_split_id uuid;
  v_split record;
  v_counterparty_id uuid;
  v_expected_counterparty_id uuid;
  v_currency text;
  v_domain public.transaction_domain;
  v_trip_id uuid;
  v_signed_amount numeric;
  v_net_amount numeric := 0;
  v_positive_count integer := 0;
  v_negative_count integer := 0;
  v_processed_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_split_ids is null or cardinality(p_split_ids) = 0 then
    return jsonb_build_object('success', false, 'error', 'Nenhum split fornecido.');
  end if;
  if cardinality(p_split_ids) <> (
    select count(distinct split_id) from unnest(p_split_ids) as split_id
  ) then
    return jsonb_build_object('success', false, 'error', 'A lista contem splits duplicados.');
  end if;

  perform 1
  from public.transaction_splits s
  where s.id = any(p_split_ids)
  order by s.id
  for update;

  if (select count(*) from public.transaction_splits where id = any(p_split_ids))
      <> cardinality(p_split_ids) then
    return jsonb_build_object('success', false, 'error', 'Um ou mais splits nao foram encontrados.');
  end if;

  foreach v_split_id in array p_split_ids loop
    select
      s.*,
      t.user_id as creditor_user_id,
      t.type as transaction_type,
      t.currency as transaction_currency,
      t.domain as transaction_domain,
      t.trip_id as transaction_trip_id,
      t.deleted_at as transaction_deleted_at
    into v_split
    from public.transaction_splits s
    join public.transactions t on t.id = s.transaction_id
    where s.id = v_split_id;

    if v_split.deleted_at is not null or v_split.transaction_deleted_at is not null then
      return jsonb_build_object('success', false, 'error', 'Split removido nao pode ser compensado.');
    end if;
    if v_split.is_settled then
      return jsonb_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' ja foi totalmente liquidado.'
      );
    end if;
    if v_split.user_id is distinct from v_uid
       and v_split.creditor_user_id is distinct from v_uid then
      raise exception 'User is not a participant in split %', v_split_id
        using errcode = '42501';
    end if;
    if v_split.user_id = v_uid and coalesce(v_split.settled_by_debtor, false) then
      return jsonb_build_object('success', false, 'error', 'O pagamento deste split ja foi confirmado.');
    end if;
    if v_split.creditor_user_id = v_uid
       and coalesce(v_split.settled_by_creditor, false) then
      return jsonb_build_object('success', false, 'error', 'O recebimento deste split ja foi confirmado.');
    end if;
    if v_split.transaction_type not in (
      'EXPENSE'::public.transaction_type,
      'INCOME'::public.transaction_type
    ) then
      return jsonb_build_object('success', false, 'error', 'Tipo de transacao invalido para compensacao.');
    end if;

    v_counterparty_id := case
      when v_split.user_id = v_uid then v_split.creditor_user_id
      else v_split.user_id
    end;
    if v_counterparty_id is null or v_counterparty_id = v_uid then
      return jsonb_build_object('success', false, 'error', 'Contraparte vinculada e obrigatoria.');
    end if;

    if v_expected_counterparty_id is null then
      v_expected_counterparty_id := v_counterparty_id;
      v_currency := v_split.transaction_currency;
      v_domain := v_split.transaction_domain;
      v_trip_id := v_split.transaction_trip_id;
    elsif v_counterparty_id is distinct from v_expected_counterparty_id then
      return jsonb_build_object('success', false, 'error', 'Os splits devem pertencer a mesma contraparte.');
    elsif v_split.transaction_currency is distinct from v_currency then
      return jsonb_build_object('success', false, 'error', 'Os splits devem usar a mesma moeda.');
    elsif v_split.transaction_domain is distinct from v_domain
       or v_split.transaction_trip_id is distinct from v_trip_id then
      return jsonb_build_object('success', false, 'error', 'Os splits devem pertencer ao mesmo dominio.');
    end if;

    v_signed_amount := case
      when v_split.creditor_user_id = v_uid
        then case when v_split.transaction_type = 'EXPENSE'::public.transaction_type
          then v_split.amount else -v_split.amount end
      else case when v_split.transaction_type = 'EXPENSE'::public.transaction_type
        then -v_split.amount else v_split.amount end
    end;
    v_net_amount := v_net_amount + v_signed_amount;
    if v_signed_amount > 0 then
      v_positive_count := v_positive_count + 1;
    elsif v_signed_amount < 0 then
      v_negative_count := v_negative_count + 1;
    end if;
  end loop;

  if v_positive_count = 0 or v_negative_count = 0 then
    return jsonb_build_object('success', false, 'error', 'A compensacao exige valores a pagar e a receber.');
  end if;
  if round(v_net_amount, 2) <> 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'O saldo dos splits nao e zero.',
      'net_amount', round(v_net_amount, 2)
    );
  end if;

  foreach v_split_id in array p_split_ids loop
    select s.*, t.user_id as creditor_user_id
    into v_split
    from public.transaction_splits s
    join public.transactions t on t.id = s.transaction_id
    where s.id = v_split_id;

    update public.transaction_splits
    set settled_by_debtor = case
          when v_split.user_id = v_uid then true else settled_by_debtor
        end,
        settled_by_creditor = case
          when v_split.creditor_user_id = v_uid then true else settled_by_creditor
        end,
        is_settled = (
          (case when v_split.user_id = v_uid then true
            else coalesce(settled_by_debtor, false) end)
          and
          (case when v_split.creditor_user_id = v_uid then true
            else coalesce(settled_by_creditor, false) end)
        ),
        settled_at = case
          when (
            (case when v_split.user_id = v_uid then true
              else coalesce(settled_by_debtor, false) end)
            and
            (case when v_split.creditor_user_id = v_uid then true
              else coalesce(settled_by_creditor, false) end)
          ) then now()
          else null
        end
    where id = v_split_id;

    v_processed_count := v_processed_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'counterparty_id', v_expected_counterparty_id,
    'currency', v_currency,
    'net_amount', round(v_net_amount, 2)
  );
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$function$;

CREATE OR REPLACE FUNCTION public.settle_multiple_splits(p_split_ids uuid[], p_account_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_split_id UUID;
    v_total_amount NUMERIC := 0;
    v_settled_count INTEGER := 0;
    v_split RECORD;
    v_transaction_id UUID;
    v_is_creditor BOOLEAN;
    v_target_user_id UUID;
    v_user_name TEXT;
    v_split_ids_str TEXT;
BEGIN
    -- Validar inputs
    IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nenhum item selecionado para acerto.');
    END IF;

    -- Calcular o total e verificar pendências
    SELECT SUM(amount), COUNT(*) INTO v_total_amount, v_settled_count
    FROM public.transaction_splits
    WHERE id = ANY(p_split_ids) AND is_settled = false;

    IF v_settled_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Todos os itens selecionados já foram liquidados ou não existem.');
    END IF;

    -- Identificar papéis
    SELECT * INTO v_split FROM public.transaction_splits WHERE id = p_split_ids[1];
    v_is_creditor := (SELECT t.user_id FROM public.transactions t WHERE t.id = v_split.transaction_id) = p_user_id;

    -- Buscar nome do usuário atual para a notificação
    SELECT full_name INTO v_user_name FROM public.profiles WHERE id = p_user_id;
    v_user_name := COALESCE(v_user_name, 'Um membro da família');

    -- Criar a transação de acerto para quem está executando
    INSERT INTO public.transactions (
        user_id, creator_user_id, description, amount, date, competence_date,
        type, account_id, currency, domain, is_shared, notes
    ) VALUES (
        p_user_id, p_user_id,
        CASE WHEN v_is_creditor THEN 'Recebimento de Acerto' ELSE 'Pagamento de Acerto' END,
        v_total_amount, CURRENT_DATE, date_trunc('month', CURRENT_DATE)::DATE,
        CASE WHEN v_is_creditor THEN 'INCOME'::transaction_type ELSE 'EXPENSE'::transaction_type END,
        p_account_id, 'BRL', 'SHARED', false, 'Acerto consolidado de ' || v_settled_count || ' item(ns)'
    ) RETURNING id INTO v_transaction_id;

    -- Atualizar os splits
    FOREACH v_split_id IN ARRAY p_split_ids LOOP
        IF v_is_creditor THEN
            UPDATE public.transaction_splits SET
                settled_by_creditor = true,
                creditor_settlement_tx_id = v_transaction_id,
                is_settled = CASE WHEN settled_by_debtor THEN true ELSE false END,
                settled_at = CASE WHEN settled_by_debtor THEN NOW() ELSE settled_at END,
                settled_transaction_id = CASE WHEN settled_by_debtor THEN v_transaction_id ELSE settled_transaction_id END
            WHERE id = v_split_id;
        ELSE
            UPDATE public.transaction_splits SET
                settled_by_debtor = true,
                debtor_settlement_tx_id = v_transaction_id,
                is_settled = CASE WHEN settled_by_creditor THEN true ELSE false END,
                settled_at = CASE WHEN settled_by_creditor THEN NOW() ELSE settled_at END,
                settled_transaction_id = CASE WHEN settled_by_creditor THEN v_transaction_id ELSE settled_transaction_id END
            WHERE id = v_split_id;
        END IF;
    END LOOP;

    -- Atualizar saldo da conta local
    IF v_is_creditor THEN
        UPDATE public.accounts SET balance = balance + v_total_amount WHERE id = p_account_id;
        v_target_user_id := v_split.user_id; -- O alvo da notificação é o devedor
    ELSE
        UPDATE public.accounts SET balance = balance - v_total_amount WHERE id = p_account_id;
        v_target_user_id := (SELECT t.user_id FROM public.transactions t WHERE t.id = v_split.transaction_id);
    END IF;

    -- Converter array de IDs para string separada por vírgulas
    v_split_ids_str := array_to_string(p_split_ids, ',');

    -- DISPARAR NOTIFICAÇÃO COM LINK DE DEEP-LINK
    IF v_target_user_id IS NOT NULL AND v_target_user_id != p_user_id THEN
        PERFORM public.fn_create_notification(
            v_target_user_id,
            CASE WHEN v_is_creditor THEN 'Acerto Confirmado! ✅' ELSE 'Novo Pagamento Enviado! 💰' END,
            CASE
                WHEN v_is_creditor THEN format('%s confirmou o recebimento do acerto de R$ %s.', v_user_name, v_total_amount)
                ELSE format('%s marcou o acerto de R$ %s como PAGO. Confirme o recebimento!', v_user_name, v_total_amount)
            END,
            'SHARED_EXPENSE',
            format('/compartilhados?confirmSettlement=%s', v_split_ids_str)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'settled_count', v_settled_count,
        'total_amount', v_total_amount
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_partial_balance(p_user1_id uuid, p_user2_id uuid, p_amount numeric, p_currency text DEFAULT 'BRL'::text, p_settlement_transaction_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(splits_settled integer, amount_settled numeric, remaining_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_splits_settled INTEGER := 0;
  v_amount_settled NUMERIC := 0;
  v_remaining_amount NUMERIC := p_amount;
  v_split RECORD;
  v_amount_to_settle NUMERIC;
BEGIN
  -- Buscar splits não acertados, ordenados por data (mais antigos primeiro)
  FOR v_split IN
    SELECT
      ts.id,
      ts.amount,
      t.currency,
      t.date
    FROM transaction_splits ts
    JOIN transactions t ON t.id = ts.transaction_id
    WHERE ts.user_id = p_user1_id
      AND t.user_id = p_user2_id
      AND ts.is_settled = FALSE
      AND t.currency = p_currency
      AND t.deleted_at IS NULL
    ORDER BY t.date ASC
  LOOP
    -- Se ainda há valor para acertar
    IF v_remaining_amount > 0 THEN
      -- Determinar quanto acertar deste split
      v_amount_to_settle := LEAST(v_split.amount, v_remaining_amount);

      -- Se acerta o split completo
      IF v_amount_to_settle >= v_split.amount THEN
        UPDATE transaction_splits
        SET
          is_settled = TRUE,
          settled_by_debtor = TRUE,
          settled_by_creditor = TRUE,
          settled_at = NOW(),
          settled_transaction_id = p_settlement_transaction_id,
          debtor_settlement_tx_id = p_settlement_transaction_id,
          creditor_settlement_tx_id = p_settlement_transaction_id
        WHERE id = v_split.id;

        v_splits_settled := v_splits_settled + 1;
        v_amount_settled := v_amount_settled + v_split.amount;
        v_remaining_amount := v_remaining_amount - v_split.amount;
      ELSE
        -- Acerto parcial: criar novo split com valor restante
        -- e marcar split original como acertado com valor parcial

        -- Atualizar split original com valor acertado
        UPDATE transaction_splits
        SET amount = v_amount_to_settle
        WHERE id = v_split.id;

        -- Marcar como acertado
        UPDATE transaction_splits
        SET
          is_settled = TRUE,
          settled_by_debtor = TRUE,
          settled_by_creditor = TRUE,
          settled_at = NOW(),
          settled_transaction_id = p_settlement_transaction_id
        WHERE id = v_split.id;

        -- Criar novo split com valor restante
        INSERT INTO transaction_splits (
          transaction_id,
          user_id,
          member_id,
          name,
          amount,
          percentage,
          is_settled
        )
        SELECT
          transaction_id,
          user_id,
          member_id,
          name,
          v_split.amount - v_amount_to_settle,
          percentage,
          FALSE
        FROM transaction_splits
        WHERE id = v_split.id;

        v_splits_settled := v_splits_settled + 1;
        v_amount_settled := v_amount_settled + v_amount_to_settle;
        v_remaining_amount := 0;
      END IF;
    END IF;
  END LOOP;

  -- Calcular saldo restante
  SELECT
    COALESCE(SUM(ts.amount), 0)
  INTO remaining_balance
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.user_id = p_user1_id
    AND t.user_id = p_user2_id
    AND ts.is_settled = FALSE
    AND t.currency = p_currency
    AND t.deleted_at IS NULL;

  splits_settled := v_splits_settled;
  amount_settled := v_amount_settled;

  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_split(p_split_id uuid, p_amount numeric, p_account_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_transaction_id UUID;
    v_split RECORD;
    v_target_user_id UUID;
    v_is_creditor BOOLEAN;
    v_user_name TEXT;
BEGIN
    SELECT * INTO v_split FROM public.transaction_splits WHERE id = p_split_id;
    IF v_split IS NULL THEN RAISE EXCEPTION 'Split não encontrado'; END IF;
    IF v_split.is_settled THEN RAISE EXCEPTION 'Este item já foi totalmente liquidado!'; END IF;

    v_is_creditor := (SELECT t.user_id FROM public.transactions t WHERE t.id = v_split.transaction_id) = p_user_id;

    SELECT full_name INTO v_user_name FROM public.profiles WHERE id = p_user_id;
    v_user_name := COALESCE(v_user_name, 'Um membro da família');

    IF v_is_creditor THEN
        INSERT INTO public.transactions (
            user_id, creator_user_id, description, amount, date, competence_date,
            type, account_id, currency, domain, is_shared, notes
        ) VALUES (
            p_user_id, p_user_id, 'Recebimento: ' || v_split.name,
            p_amount, CURRENT_DATE, date_trunc('month', CURRENT_DATE)::DATE, 'INCOME', p_account_id, 'BRL', 'SHARED', false,
            'Ressarcimento de despesa compartilhada (' || v_split.name || ')'
        ) RETURNING id INTO v_transaction_id;

        UPDATE public.transaction_splits SET
            settled_by_creditor = true,
            creditor_settlement_tx_id = v_transaction_id,
            is_settled = CASE WHEN settled_by_debtor THEN true ELSE false END,
            settled_at = CASE WHEN settled_by_debtor THEN NOW() ELSE settled_at END,
            settled_transaction_id = CASE WHEN settled_by_debtor THEN v_transaction_id ELSE settled_transaction_id END
        WHERE id = p_split_id;

        UPDATE public.accounts SET balance = balance + p_amount WHERE id = p_account_id;

        v_target_user_id := v_split.user_id;
        IF v_target_user_id IS NOT NULL AND v_target_user_id != p_user_id THEN
            PERFORM public.fn_create_notification(
                v_target_user_id, 'Recebimento Confirmado ✅',
                format('%s confirmou o recebimento de R$ %s (%s).', v_user_name, p_amount, v_split.name),
                'SHARED_EXPENSE', '/compartilhados'
            );
        END IF;
    ELSE
        INSERT INTO public.transactions (
            user_id, creator_user_id, description, amount, date, competence_date,
            type, account_id, currency, domain, is_shared, notes
        ) VALUES (
            p_user_id, p_user_id, 'Pagamento: ' || v_split.name,
            p_amount, CURRENT_DATE, date_trunc('month', CURRENT_DATE)::DATE, 'EXPENSE', p_account_id, 'BRL', 'SHARED', false,
            'Pagamento de despesa compartilhada (' || v_split.name || ')'
        ) RETURNING id INTO v_transaction_id;

        UPDATE public.transaction_splits SET
            settled_by_debtor = true,
            debtor_settlement_tx_id = v_transaction_id,
            is_settled = CASE WHEN settled_by_creditor THEN true ELSE false END,
            settled_at = CASE WHEN settled_by_creditor THEN NOW() ELSE settled_at END,
            settled_transaction_id = CASE WHEN settled_by_creditor THEN v_transaction_id ELSE settled_transaction_id END
        WHERE id = p_split_id;

        UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_account_id;

        v_target_user_id := (SELECT t.user_id FROM public.transactions t WHERE t.id = v_split.transaction_id);
        IF v_target_user_id IS NOT NULL AND v_target_user_id != p_user_id THEN
            PERFORM public.fn_create_notification(
                v_target_user_id, 'Pagamento Realizado 💰',
                format('%s marcou o valor de R$ %s (%s) como PAGO. Confirme o recebimento!', v_user_name, p_amount, v_split.name),
                'SHARED_EXPENSE', format('/compartilhados?confirmSettlement=%s', p_split_id)
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('transaction_id', v_transaction_id, 'success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_account(p_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_account_id is null then
    raise exception 'Account ID is required' using errcode = '22004';
  end if;

  perform 1
  from public.accounts
  where id = p_account_id and user_id = v_uid and deleted_at is null
  for update;

  if not found then
    raise exception 'Account does not belong to authenticated user' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.transactions
    where (account_id = p_account_id or destination_account_id = p_account_id)
      and deleted_at is null
  ) then
    raise exception 'Account has active transactions and must be archived' using errcode = '23503';
  end if;
  if exists (
    select 1 from public.goals where linked_account_id = p_account_id
  ) then
    raise exception 'Account has linked goals and must be archived' using errcode = '23503';
  end if;

  update public.accounts
  set deleted_at = now(),
      deleted_by = v_uid,
      is_active = false
  where id = p_account_id and user_id = v_uid;
end;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_transaction(p_transaction_id uuid, p_cascade text DEFAULT 'NONE'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tx transactions%ROWTYPE;
  v_now timestamptz := now();
  v_count integer := 0;
  v_mirror_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_cascade NOT IN ('NONE', 'NEXT', 'ALL') THEN
    RAISE EXCEPTION 'Tipo de cascata inválido: %', p_cascade;
  END IF;

  SELECT * INTO v_tx
  FROM transactions
  WHERE id = p_transaction_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada ou já excluída';
  END IF;

  -- Permissão: dono, criador, ou admin/editor da família do dono
  IF v_tx.user_id <> v_uid
     AND COALESCE(v_tx.creator_user_id, v_tx.user_id) <> v_uid
     AND NOT EXISTS (
       SELECT 1
       FROM family_members fm
       JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = v_uid
         AND fm.role IN ('admin', 'editor')
         AND (
           f.owner_id = v_tx.user_id
           OR EXISTS (
             SELECT 1 FROM family_members fm2
             WHERE fm2.family_id = f.id AND fm2.user_id = v_tx.user_id
           )
         )
     )
  THEN
    RAISE EXCEPTION 'Sem permissão para excluir esta transação';
  END IF;

  -- Espelho: excluir o original, não o espelho
  IF v_tx.source_transaction_id IS NOT NULL THEN
    RAISE EXCEPTION 'Esta é uma transação espelhada. Exclua a transação original.';
  END IF;

  -- Alvos da exclusão conforme cascata
  CREATE TEMP TABLE IF NOT EXISTS _sdt_targets (id uuid PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _sdt_targets;

  IF p_cascade = 'ALL' AND v_tx.series_id IS NOT NULL THEN
    INSERT INTO _sdt_targets
    SELECT id FROM transactions
    WHERE series_id = v_tx.series_id AND deleted_at IS NULL;
  ELSIF p_cascade = 'NEXT' AND v_tx.series_id IS NOT NULL THEN
    INSERT INTO _sdt_targets
    SELECT id FROM transactions
    WHERE series_id = v_tx.series_id
      AND deleted_at IS NULL
      AND COALESCE(current_installment, 1) >= COALESCE(v_tx.current_installment, 1);
  ELSE
    INSERT INTO _sdt_targets VALUES (p_transaction_id);
  END IF;

  -- Bloqueio: alguma transação alvo já liquidada
  IF EXISTS (
    SELECT 1 FROM transactions t
    JOIN _sdt_targets tg ON tg.id = t.id
    WHERE t.is_settled = true
  ) THEN
    RAISE EXCEPTION 'Transação já liquidada/acertada. Desfaça o acerto antes de excluí-la.';
  END IF;

  -- Bloqueio: splits com acertos (totais ou parciais)
  IF EXISTS (
    SELECT 1 FROM transaction_splits s
    JOIN _sdt_targets tg ON tg.id = s.transaction_id
    WHERE s.is_settled = true OR s.settled_by_debtor = true OR s.settled_by_creditor = true
  ) THEN
    RAISE EXCEPTION 'Transação possui acertos. Desfaça os acertos antes de excluí-la.';
  END IF;

  -- Soft delete dos alvos
  UPDATE transactions t
  SET deleted_at = v_now
  FROM _sdt_targets tg
  WHERE t.id = tg.id AND t.deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Cascata para espelhos dos alvos
  UPDATE transactions t
  SET deleted_at = v_now
  WHERE t.source_transaction_id IN (SELECT id FROM _sdt_targets)
    AND t.deleted_at IS NULL;
  GET DIAGNOSTICS v_mirror_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma transação foi excluída';
  END IF;

  RETURN v_count + v_mirror_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_error_report(p_error_message text, p_stack_trace text, p_context text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_report_id uuid;
BEGIN
  v_user_id := auth.uid();

  INSERT INTO public.error_logs (user_id, error_type, message, stack, extra)
  VALUES (
    v_user_id,
    COALESCE(p_context, 'frontend'),
    p_error_message,
    p_stack_trace,
    jsonb_build_object('source', 'submit_error_report')
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.suggest_payment_plan(p_debtor_user_id uuid, p_creditor_user_id uuid, p_monthly_payment numeric, p_currency text DEFAULT 'BRL'::text)
 RETURNS TABLE(month integer, payment_amount numeric, splits_to_settle integer, remaining_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_debt NUMERIC;
  v_remaining NUMERIC;
  v_month INTEGER := 1;
  v_payment NUMERIC;
  v_splits INTEGER;
BEGIN
  -- Calcular dívida total
  SELECT COALESCE(SUM(ts.amount), 0)
  INTO v_total_debt
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.user_id = p_debtor_user_id
    AND t.user_id = p_creditor_user_id
    AND ts.is_settled = FALSE
    AND t.currency = p_currency
    AND t.deleted_at IS NULL;

  v_remaining := v_total_debt;

  -- Gerar plano de pagamento
  WHILE v_remaining > 0 LOOP
    v_payment := LEAST(p_monthly_payment, v_remaining);

    -- Contar quantos splits seriam acertados
    SELECT COUNT(*)
    INTO v_splits
    FROM (
      SELECT
        ts.amount,
        SUM(ts.amount) OVER (ORDER BY t.date) AS cumulative
      FROM transaction_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      WHERE ts.user_id = p_debtor_user_id
        AND t.user_id = p_creditor_user_id
        AND ts.is_settled = FALSE
        AND t.currency = p_currency
        AND t.deleted_at IS NULL
    ) sub
    WHERE cumulative <= (v_total_debt - v_remaining + v_payment);

    month := v_month;
    payment_amount := v_payment;
    splits_to_settle := v_splits;
    remaining_balance := v_remaining - v_payment;

    RETURN NEXT;

    v_remaining := v_remaining - v_payment;
    v_month := v_month + 1;

    -- Limite de segurança
    IF v_month > 120 THEN
      EXIT;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_is_settled()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualizar is_settled baseado nos campos novos
  NEW.is_settled := (NEW.settled_by_debtor = TRUE AND NEW.settled_by_creditor = TRUE);

  -- Se ambos confirmaram, definir settled_at
  IF NEW.is_settled = TRUE AND OLD.is_settled = FALSE THEN
    NEW.settled_at := NOW();
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_profile_to_family_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualizar family_members quando o profile for atualizado
  UPDATE family_members
  SET
    avatar_url = NEW.avatar_url,
    avatar_color = NEW.avatar_color,
    avatar_icon = NEW.avatar_icon
  WHERE linked_user_id = NEW.id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_transaction_settled_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_settled = TRUE AND OLD.is_settled = FALSE THEN
    UPDATE transactions
    SET is_settled = TRUE, settled_at = NEW.settled_at
    WHERE id = NEW.settled_transaction_id
      AND settled_transaction_id IS NOT NULL; -- Guard contra NULL
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.test_cascade_delete()
 RETURNS TABLE(test_name text, passed boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  test_tx_id UUID;
  test_split_id UUID;
  test_settlement_tx_id UUID;
  split_count INTEGER;
  settlement_count INTEGER;
BEGIN
  -- Test 1: Verify split cascade delete
  RETURN QUERY
  SELECT
    'Split Cascade Delete'::TEXT,
    EXISTS (
      SELECT 1
      FROM information_schema.referential_constraints rc
      WHERE rc.constraint_schema = 'public'
        AND rc.constraint_name LIKE '%transaction_splits_transaction_id%'
        AND rc.delete_rule = 'CASCADE'
    ),
    'Splits are automatically deleted when transaction is deleted'::TEXT;

  -- Test 2: Verify settlement transaction trigger exists
  RETURN QUERY
  SELECT
    'Settlement Transaction Trigger'::TEXT,
    EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'cascade_delete_settlement_transactions'
    ),
    'Trigger exists to delete settlement transactions when split is deleted'::TEXT;

  -- Test 3: Verify delete_installment_series function exists
  RETURN QUERY
  SELECT
    'Delete Installment Series Function'::TEXT,
    EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE proname = 'delete_installment_series'
    ),
    'Function exists to delete all installments in a series'::TEXT;

  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.transfer_between_accounts(p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_description text DEFAULT NULL::text, p_date date DEFAULT NULL::date, p_exchange_rate numeric DEFAULT NULL::numeric, p_destination_amount numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from_tx_id UUID;
  v_to_tx_id UUID;
  v_effective_date DATE;
  v_dest_amount NUMERIC;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_effective_date := COALESCE(p_date, CURRENT_DATE);
  v_dest_amount := COALESCE(p_destination_amount, p_amount);

  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_from_account_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Conta de origem não encontrada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_to_account_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Conta de destino não encontrada');
  END IF;
  IF p_from_account_id = p_to_account_id THEN
    RETURN json_build_object('success', false, 'error', 'Contas de origem e destino devem ser diferentes');
  END IF;

  INSERT INTO transactions (user_id, creator_user_id, account_id, type, amount, description, date, competence_date, domain)
  VALUES (v_user_id, v_user_id, p_from_account_id, 'EXPENSE', p_amount, COALESCE(p_description, 'Transferência entre contas'), v_effective_date, date_trunc('month', v_effective_date)::date, 'PERSONAL')
  RETURNING id INTO v_from_tx_id;

  INSERT INTO transactions (user_id, creator_user_id, account_id, type, amount, description, date, competence_date, domain)
  VALUES (v_user_id, v_user_id, p_to_account_id, 'INCOME', v_dest_amount, COALESCE(p_description, 'Transferência entre contas'), v_effective_date, date_trunc('month', v_effective_date)::date, 'PERSONAL')
  RETURNING id INTO v_to_tx_id;

  RETURN json_build_object('success', true, 'from_transaction_id', v_from_tx_id, 'to_transaction_id', v_to_tx_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_seed_default_categories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.seed_default_categories(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.undo_settlement(p_split_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_split record;
  v_is_debtor boolean;
  v_is_creditor boolean;
  v_settlement_tx_id uuid;
  v_affected integer := 0;
  v_side_affected integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_user_id is distinct from v_uid then
    raise exception 'Cannot undo a settlement for another user' using errcode = '42501';
  end if;

  select s.*, t.user_id as creditor_user_id
  into v_split
  from public.transaction_splits s
  join public.transactions t on t.id = s.transaction_id
  where s.id = p_split_id
  for update of s;

  if v_split is null then
    return jsonb_build_object('success', false, 'error', 'Split nao encontrado.');
  end if;

  v_is_debtor := v_split.user_id = v_uid;
  v_is_creditor := v_split.creditor_user_id = v_uid;
  if not v_is_debtor and not v_is_creditor then
    raise exception 'User is not a participant in this split' using errcode = '42501';
  end if;

  if v_is_debtor then
    v_settlement_tx_id := v_split.debtor_settlement_tx_id;
    if v_settlement_tx_id is not null and not exists (
      select 1 from public.transactions
      where id = v_settlement_tx_id and user_id = v_uid
    ) then
      raise exception 'Settlement transaction ownership mismatch' using errcode = '42501';
    end if;

    if v_settlement_tx_id is null then
      update public.transaction_splits
      set settled_by_debtor = false,
          debtor_settlement_tx_id = null,
          is_settled = false,
          settled_at = null,
          settled_transaction_id = null
      where id = p_split_id;
    else
      update public.transaction_splits
      set settled_by_debtor = false,
          debtor_settlement_tx_id = null,
          is_settled = false,
          settled_at = null,
          settled_transaction_id = null
      where debtor_settlement_tx_id = v_settlement_tx_id;
    end if;
    get diagnostics v_side_affected = row_count;
    v_affected := v_affected + v_side_affected;

    if v_settlement_tx_id is not null then
      delete from public.transactions
      where id = v_settlement_tx_id and user_id = v_uid;
    end if;
  end if;

  if v_is_creditor then
    v_settlement_tx_id := v_split.creditor_settlement_tx_id;
    if v_settlement_tx_id is not null and not exists (
      select 1 from public.transactions
      where id = v_settlement_tx_id and user_id = v_uid
    ) then
      raise exception 'Settlement transaction ownership mismatch' using errcode = '42501';
    end if;

    if v_settlement_tx_id is null then
      update public.transaction_splits
      set settled_by_creditor = false,
          creditor_settlement_tx_id = null,
          is_settled = false,
          settled_at = null,
          settled_transaction_id = null
      where id = p_split_id;
    else
      update public.transaction_splits
      set settled_by_creditor = false,
          creditor_settlement_tx_id = null,
          is_settled = false,
          settled_at = null,
          settled_transaction_id = null
      where creditor_settlement_tx_id = v_settlement_tx_id;
    end if;
    get diagnostics v_side_affected = row_count;
    v_affected := v_affected + v_side_affected;

    if v_settlement_tx_id is not null then
      delete from public.transactions
      where id = v_settlement_tx_id and user_id = v_uid;
    end if;
  end if;

  return jsonb_build_object('success', true, 'reverted_count', v_affected);
exception
  when insufficient_privilege then raise;
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$function$;

CREATE OR REPLACE FUNCTION public.undo_settlement_v2(p_split_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select public.undo_settlement(p_split_id, private.authenticated_uid()) $function$;

CREATE OR REPLACE FUNCTION public.undo_shared_settlements(p_split_ids uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_payment_tx_id uuid;
    v_payment_tx RECORD;
    v_processed_count integer := 0;
    v_processed_tx_ids uuid[] := '{}';
BEGIN
    -- 1. Deletar transações de acerto (O gatilho trará o saldo de volta!)
    FOR v_payment_tx IN
        SELECT DISTINCT t.id
        FROM transaction_splits s
        JOIN transactions t ON s.settled_transaction_id = t.id
        WHERE s.id = ANY(p_split_ids)
    LOOP
        IF NOT (v_payment_tx.id = ANY(v_processed_tx_ids)) THEN
            DELETE FROM transactions WHERE id = v_payment_tx.id;
            v_processed_tx_ids := array_append(v_processed_tx_ids, v_payment_tx.id);
        END IF;
    END LOOP;

    -- 2. Resetar splits
    UPDATE transaction_splits
    SET
        is_settled = false,
        settled_at = NULL,
        settled_transaction_id = NULL,
        settled_by_debtor = false,
        settled_by_creditor = false,
        debtor_settlement_tx_id = null,
        creditor_settlement_tx_id = null
    WHERE id = ANY(p_split_ids);

    GET DIAGNOSTICS v_processed_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'updated_splits_count', v_processed_count,
        'reverted_transactions_count', array_length(v_processed_tx_ids, 1)
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.unsettle_multiple_splits(p_split_ids uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_reverted_count INTEGER := 0;
  v_total_amount NUMERIC := 0;
  v_payment_tx_ids UUID[] := ARRAY[]::UUID[];
  v_account_id UUID;
  v_first_account_id UUID;
  v_owner_id UUID;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nenhum split fornecido para reversão.'
    );
  END IF;

  -- Collect payment transaction IDs and validate all splits
  FOREACH v_split_id IN ARRAY p_split_ids
  LOOP
    SELECT ts.*, t.user_id AS owner_id INTO v_split
    FROM transaction_splits ts
    JOIN transactions t ON t.id = ts.transaction_id
    WHERE ts.id = v_split_id
    FOR UPDATE OF ts;

    IF v_split IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' não encontrado.'
      );
    END IF;

    -- Verificar ownership
    IF v_owner_id IS NULL THEN
      v_owner_id := v_split.owner_id;
    ELSIF v_split.owner_id IS DISTINCT FROM v_owner_id THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Splits pertencem a usuários diferentes.'
      );
    END IF;

    IF v_split.owner_id IS DISTINCT FROM auth.uid() THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Acesso negado: você não é o dono do split ' || v_split_id::text || '.'
      );
    END IF;

    IF NOT v_split.is_settled THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' não foi liquidado.'
      );
    END IF;

    -- [B-13] Verificar que todos os payment_txs são da mesma conta
    SELECT account_id INTO v_account_id
    FROM transactions
    WHERE id = v_split.settled_transaction_id;

    IF v_first_account_id IS NULL THEN
      v_first_account_id := v_account_id;
    ELSIF v_account_id IS DISTINCT FROM v_first_account_id THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Splits foram liquidados em contas diferentes — reverta individualmente.'
      );
    END IF;

    v_payment_tx_ids := array_append(v_payment_tx_ids, v_split.settled_transaction_id);
    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

  -- Mark all splits as not settled
  UPDATE transaction_splits
  SET
    is_settled = false,
    settled_at = NULL,
    settled_transaction_id = NULL
  WHERE id = ANY(p_split_ids);

  GET DIAGNOSTICS v_reverted_count = ROW_COUNT;

  -- [B-06] Soft delete dos payment transactions
  UPDATE transactions
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(v_payment_tx_ids);

  -- [B-01] REMOVIDO: UPDATE accounts manual.

  -- Return success
  v_result := json_build_object(
    'success', true,
    'reverted_count', v_reverted_count,
    'total_amount', v_total_amount,
    'reverted_at', NOW()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unsettle_split(p_split_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_split RECORD;
  v_payment_tx_id UUID;
  v_amount NUMERIC;
  v_account_id UUID;
  v_owner_id UUID;
  v_result JSON;
BEGIN
  -- Get split details with ownership check
  SELECT ts.*, t.user_id AS owner_id INTO v_split
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.id = p_split_id
  FOR UPDATE OF ts;

  IF v_split IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Split não encontrado.'
    );
  END IF;

  -- Verificar ownership
  IF v_split.owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Acesso negado: você não é o dono desta transação.'
    );
  END IF;

  IF NOT v_split.is_settled THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este split não foi liquidado.'
    );
  END IF;

  -- Store values for later use
  v_payment_tx_id := v_split.settled_transaction_id;
  v_amount := v_split.amount;

  -- Get account_id from the payment transaction
  SELECT account_id INTO v_account_id
  FROM transactions
  WHERE id = v_payment_tx_id;

  -- Mark split as not settled
  UPDATE transaction_splits
  SET
    is_settled = false,
    settled_at = NULL,
    settled_transaction_id = NULL
  WHERE id = p_split_id;

  -- [B-06] Soft delete da transação de pagamento (não DELETE físico)
  UPDATE transactions
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_payment_tx_id;

  -- [B-01] REMOVIDO: UPDATE accounts manual.
  -- O trigger update_account_balance_on_delete já reverte o saldo
  -- quando a transação é soft-deletada (is_active = false).

  -- Return success
  v_result := json_build_object(
    'success', true,
    'split_id', p_split_id,
    'reverted_amount', v_amount,
    'reverted_at', NOW()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_account_balance_on_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Recalculate source account balance
  IF OLD.account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(OLD.account_id);
  END IF;

  -- Recalculate destination account balance (for transfers)
  IF OLD.destination_account_id IS NOT NULL AND OLD.destination_account_id != OLD.account_id THEN
    PERFORM public.recalculate_account_balance(OLD.destination_account_id);
  END IF;

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_account_balance_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Recalculate source account balance
  IF NEW.account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(NEW.account_id);
  END IF;

  -- Recalculate destination account balance (for transfers)
  IF NEW.destination_account_id IS NOT NULL AND NEW.destination_account_id != NEW.account_id THEN
    PERFORM public.recalculate_account_balance(NEW.destination_account_id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_account_balance_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF OLD.account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(OLD.account_id);
  END IF;

  IF NEW.account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(NEW.account_id);
  END IF;

  IF OLD.destination_account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(OLD.destination_account_id);
  END IF;

  IF NEW.destination_account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(NEW.destination_account_id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_family_invitations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_shared_competence_after_split()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction RECORD;
BEGIN
  SELECT t.*, a.type as account_type INTO v_transaction
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.id = NEW.transaction_id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_can_view_trip(p_trip_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips t
    LEFT JOIN trip_members tm ON t.id = tm.trip_id
    WHERE t.id = p_trip_id
    AND (t.owner_id = p_user_id OR tm.user_id = p_user_id)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_is_trip_member(p_trip_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_shared_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Apenas garante que se for compartilhada e houver um pagador externo, ele existe
  IF NEW.is_shared = true AND NEW.payer_id IS NOT NULL AND NEW.payer_id != NEW.user_id THEN
    -- Verificação básica de existência de membro (opcional, mas bom para integridade)
    IF NOT EXISTS (SELECT 1 FROM family_members WHERE id = NEW.payer_id) THEN
      -- Se não encontrou o membro, pode ser que seja o próprio user_id do criador vindo como payer_id
      -- (Algumas partes do front podem mandar o profile_id no campo payer_id)
      NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pin(p_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pin_hash TEXT;
  v_locked_until TIMESTAMPTZ;
  v_attempts INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT locked_until INTO v_locked_until
  FROM pin_attempts WHERE user_id = auth.uid();

  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RAISE EXCEPTION 'Conta bloqueada temporariamente. Tente novamente em % segundos.',
      EXTRACT(EPOCH FROM (v_locked_until - NOW()))::INT
      USING ERRCODE = 'P0004';
  END IF;

  SELECT app_pin_hash INTO v_pin_hash
  FROM profiles WHERE id = auth.uid();

  IF v_pin_hash IS NULL THEN
    RETURN false;
  END IF;

  IF extensions.crypt(p_pin, v_pin_hash) = v_pin_hash THEN
    DELETE FROM pin_attempts WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  INSERT INTO pin_attempts (user_id, attempt_count, last_attempt_at)
  VALUES (auth.uid(), 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET attempt_count = pin_attempts.attempt_count + 1,
      last_attempt_at = NOW();

  SELECT attempt_count INTO v_attempts
  FROM pin_attempts WHERE user_id = auth.uid();

  IF v_attempts >= 5 THEN
    UPDATE pin_attempts
    SET locked_until = NOW() + INTERVAL '60 seconds',
        attempt_count = 0
    WHERE user_id = auth.uid();
  END IF;

  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.withdraw_from_account(p_account_id uuid, p_amount numeric, p_description text, p_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = p_account_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Conta não encontrada');
  END IF;
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Valor deve ser maior que zero');
  END IF;
  INSERT INTO transactions (user_id, creator_user_id, account_id, type, amount, description, date, competence_date, domain)
  VALUES (v_user_id, v_user_id, p_account_id, 'EXPENSE', p_amount, p_description, p_date, date_trunc('month', p_date)::date, 'PERSONAL')
  RETURNING id INTO v_tx_id;
  RETURN json_build_object('success', true, 'transaction_id', v_tx_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

create view "public"."active_families" as
 SELECT id,
    name,
    owner_id,
    created_at,
    updated_at,
    deleted,
    deleted_at,
    deleted_by
   FROM families
  WHERE deleted = false;;

create view "public"."active_family_members" as
 SELECT id,
    family_id,
    user_id,
    linked_user_id,
    name,
    email,
    avatar_url,
    avatar_color,
    avatar_icon,
    role,
    status,
    member_type,
    sharing_scope,
    scope_trip_id,
    scope_start_date,
    scope_end_date,
    invited_by,
    removal_reason,
    removed_at,
    removed_by,
    created_at,
    updated_at
   FROM family_members
  WHERE removed_at IS NULL AND status = 'active'::text;;

create view "public"."active_trip_members" as
 SELECT id,
    trip_id,
    user_id,
    role,
    can_edit_details,
    can_manage_expenses,
    created_at,
    updated_at,
    personal_budget,
    status,
    removed_at,
    removed_by,
    removal_reason
   FROM trip_members
  WHERE status = 'active'::text;;

create view "public"."active_trips" as
 SELECT id,
    owner_id,
    name,
    destination,
    start_date,
    end_date,
    currency,
    budget,
    status,
    cover_image,
    notes,
    created_at,
    updated_at,
    shopping_list,
    exchange_entries,
    source_trip_id,
    deleted,
    deleted_at,
    deleted_by
   FROM trips
  WHERE deleted = false;;

create view "public"."shared_transactions_for_current_user" as
 SELECT transaction_id,
    owner_user_id,
    account_id,
    category_id,
    total_amount,
    description,
    date,
    type,
    domain,
    is_shared,
    payer_id,
    source_transaction_id,
    is_mirror,
    root_owner_user_id,
    root_amount,
    splits,
    share_amount,
    created_at,
    updated_at
   FROM get_shared_transactions_for_current_user() get_shared_transactions_for_current_user(transaction_id, owner_user_id, account_id, category_id, total_amount, description, date, type, domain, is_shared, payer_id, source_transaction_id, is_mirror, root_owner_user_id, root_amount, splits, share_amount, created_at, updated_at);;

create view "public"."shared_transactions_view" as
 SELECT t.id AS transaction_id,
    t.user_id AS owner_user_id,
    t.account_id,
    t.category_id,
    t.amount::numeric AS total_amount,
    t.description,
    t.date,
    t.type,
    t.domain,
    t.is_shared,
    t.payer_id,
    t.source_transaction_id,
    t.source_transaction_id IS NOT NULL AS is_mirror,
    COALESCE(orig.user_id, t.user_id) AS root_owner_user_id,
    orig.amount::numeric AS root_amount,
    jsonb_agg(jsonb_build_object('split_id', ts.id, 'member_id', ts.member_id, 'user_id', ts.user_id, 'percentage', ts.percentage, 'amount', ts.amount) ORDER BY ts.created_at) FILTER (WHERE ts.id IS NOT NULL) AS splits,
    t.created_at,
    t.updated_at
   FROM transactions t
     LEFT JOIN transactions orig ON t.source_transaction_id = orig.id
     LEFT JOIN transaction_splits ts ON ts.transaction_id = COALESCE(t.source_transaction_id, t.id)
  WHERE t.is_shared = true
  GROUP BY t.id, orig.user_id, orig.amount, t.user_id, t.account_id, t.category_id, t.amount, t.description, t.date, t.type, t.domain, t.is_shared, t.payer_id, t.source_transaction_id, t.created_at, t.updated_at;;

create view "public"."transaction_splits_with_settlement" as
 SELECT id,
    transaction_id,
    member_id,
    user_id,
    name,
    percentage,
    amount,
    is_settled,
    settled_at,
    settled_transaction_id,
    created_at,
    settled_by_debtor,
    settled_by_creditor,
    debtor_settlement_tx_id,
    creditor_settlement_tx_id,
    deleted_at,
    deleted_by,
    settled_by_debtor = true AND settled_by_creditor = true AS is_fully_settled,
        CASE
            WHEN settled_by_debtor = true AND settled_by_creditor = true THEN 'FULLY_SETTLED'::text
            WHEN settled_by_debtor = true AND settled_by_creditor = false THEN 'DEBTOR_CONFIRMED'::text
            WHEN settled_by_debtor = false AND settled_by_creditor = true THEN 'CREDITOR_CONFIRMED'::text
            ELSE 'PENDING'::text
        END AS settlement_status
   FROM transaction_splits ts;;

create view "public"."transactions_ssot" as
 SELECT id,
    user_id,
    account_id,
    destination_account_id,
    category_id,
    trip_id,
    amount,
    description,
    date,
    type,
    domain,
    is_shared,
    payer_id,
    is_installment,
    current_installment,
    total_installments,
    series_id,
    is_recurring,
    recurrence_pattern,
    source_transaction_id,
    sync_status,
    is_settled,
    settled_at,
    related_member_id,
    notes,
    created_at,
    updated_at,
    creator_user_id,
    frequency,
    recurrence_day,
    enable_notification,
    notification_date,
    reminder_option,
    exchange_rate,
    destination_amount,
    destination_currency,
    is_refund,
    refund_of_transaction_id,
    last_generated,
    competence_date,
    currency,
    last_generated_date,
    import_hash,
    advanced_at,
    ( SELECT row_to_json(cat.*) AS row_to_json
           FROM ( SELECT categories.id,
                    categories.name,
                    categories.icon,
                    categories.color
                   FROM categories
                  WHERE categories.id = t.category_id) cat) AS category,
    ( SELECT row_to_json(acc.*) AS row_to_json
           FROM ( SELECT accounts.id,
                    accounts.name,
                    accounts.currency
                   FROM accounts
                  WHERE accounts.id = t.account_id) acc) AS account,
    COALESCE(( SELECT jsonb_agg(ts.*) AS jsonb_agg
           FROM ( SELECT transaction_splits.id,
                    transaction_splits.member_id,
                    transaction_splits.user_id,
                    transaction_splits.percentage,
                    transaction_splits.amount,
                    transaction_splits.is_settled,
                    transaction_splits.settled_at,
                    transaction_splits.settled_transaction_id,
                    transaction_splits.name
                   FROM transaction_splits
                  WHERE transaction_splits.transaction_id = t.id) ts), '[]'::jsonb) AS transaction_splits,
    COALESCE(( SELECT array_agg(transaction_splits.user_id) AS array_agg
           FROM transaction_splits
          WHERE transaction_splits.transaction_id = t.id), '{}'::uuid[]) AS split_user_ids
   FROM transactions t;;

create view "public"."trip_budget_summary" as
 SELECT t.id AS trip_id,
    t.name AS trip_name,
    t.budget AS total_budget,
    COALESCE(sum(
        CASE
            WHEN tx.type = 'EXPENSE'::transaction_type THEN tx.amount
            ELSE 0::numeric
        END), 0::numeric) AS total_spent,
    COALESCE(sum(
        CASE
            WHEN ts.is_settled = true THEN ts.amount
            ELSE 0::numeric
        END), 0::numeric) AS total_settled,
    t.budget - COALESCE(sum(
        CASE
            WHEN tx.type = 'EXPENSE'::transaction_type THEN tx.amount
            ELSE 0::numeric
        END), 0::numeric) AS remaining_budget,
    t.budget - COALESCE(sum(
        CASE
            WHEN tx.type = 'EXPENSE'::transaction_type THEN tx.amount
            ELSE 0::numeric
        END), 0::numeric) + COALESCE(sum(
        CASE
            WHEN ts.is_settled = true THEN ts.amount
            ELSE 0::numeric
        END), 0::numeric) AS available_budget
   FROM trips t
     LEFT JOIN transactions tx ON t.id = tx.trip_id
     LEFT JOIN transaction_splits ts ON tx.id = ts.transaction_id
  GROUP BY t.id, t.name, t.budget;;

create view "public"."user_net_worth" as
 SELECT id AS user_id,
    COALESCE(( SELECT sum(accounts.balance) AS sum
           FROM accounts
          WHERE accounts.user_id = p.id AND accounts.type <> 'CREDIT_CARD'::account_type), 0::numeric) AS bank_balance,
    COALESCE(( SELECT sum(assets.quantity * assets.current_price) AS sum
           FROM assets
          WHERE assets.user_id = p.id), 0::numeric) AS assets_value,
    COALESCE(( SELECT sum(accounts.balance) AS sum
           FROM accounts
          WHERE accounts.user_id = p.id AND accounts.type = 'CREDIT_CARD'::account_type), 0::numeric) AS credit_card_debt,
    COALESCE(( SELECT sum(transaction_splits.amount) AS sum
           FROM transaction_splits
          WHERE transaction_splits.user_id = p.id AND transaction_splits.is_settled = false), 0::numeric) AS shared_debt,
    COALESCE(( SELECT sum(ts.amount) AS sum
           FROM transactions t
             JOIN transaction_splits ts ON ts.transaction_id = t.id
          WHERE t.user_id = p.id AND ts.is_settled = false), 0::numeric) AS shared_credit
   FROM profiles p;;

CREATE UNIQUE INDEX categories_user_name_type_parent_not_null_idx ON public.categories USING btree (user_id, name, type, parent_category_id) WHERE (parent_category_id IS NOT NULL);

CREATE UNIQUE INDEX categories_user_name_type_parent_null_idx ON public.categories USING btree (user_id, name, type) WHERE (parent_category_id IS NULL);

CREATE INDEX error_logs_created_at_idx ON public.error_logs USING btree (created_at DESC);

CREATE INDEX error_logs_error_type_idx ON public.error_logs USING btree (error_type);

CREATE INDEX error_logs_user_id_idx ON public.error_logs USING btree (user_id);

CREATE INDEX idx_accounts_deleted_at ON public.accounts USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_accounts_is_archived ON public.accounts USING btree (is_archived);

CREATE INDEX idx_accounts_is_international ON public.accounts USING btree (is_international);

CREATE INDEX idx_accounts_user_id ON public.accounts USING btree (user_id) WHERE (is_active = true);

CREATE INDEX idx_admin_users_granted_by ON public.admin_users USING btree (granted_by);

CREATE INDEX idx_asset_transactions_account_id ON public.asset_transactions USING btree (account_id);

CREATE INDEX idx_asset_transactions_asset_id ON public.asset_transactions USING btree (asset_id);

CREATE INDEX idx_asset_transactions_user_id ON public.asset_transactions USING btree (user_id);

CREATE INDEX idx_assets_account_id ON public.assets USING btree (account_id) WHERE (account_id IS NOT NULL);

CREATE INDEX idx_assets_type ON public.assets USING btree (type) WHERE (deleted = false);

CREATE INDEX idx_assets_user_id ON public.assets USING btree (user_id) WHERE (deleted = false);

CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action);

CREATE INDEX idx_audit_log_changed_at ON public.audit_log USING btree (changed_at DESC);

CREATE INDEX idx_audit_log_changed_by ON public.audit_log USING btree (changed_by);

CREATE INDEX idx_audit_log_table_record ON public.audit_log USING btree (table_name, record_id);

CREATE INDEX idx_auto_share_rules_member_id ON public.transaction_auto_share_rules USING btree (member_id);

CREATE INDEX idx_auto_share_rules_user_id ON public.transaction_auto_share_rules USING btree (user_id);

CREATE INDEX idx_b3_tickers_cache_ticker_search ON public.b3_tickers_cache USING gin (ticker gin_trgm_ops);

CREATE INDEX idx_balance_changes_account_id ON public.balance_changes USING btree (account_id, changed_at DESC);

CREATE INDEX idx_balance_changes_transaction_id ON public.balance_changes USING btree (transaction_id);

CREATE INDEX idx_budgets_active ON public.budgets USING btree (user_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_budgets_category_id ON public.budgets USING btree (category_id);

CREATE INDEX idx_budgets_creator_user_id ON public.budgets USING btree (creator_user_id);

CREATE INDEX idx_budgets_user_id ON public.budgets USING btree (user_id);

CREATE INDEX idx_categories_is_archived ON public.categories USING btree (is_archived);

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_category_id) WHERE (parent_category_id IS NOT NULL);

CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);

CREATE INDEX idx_category_keywords_category ON public.category_keywords USING btree (category_id);

CREATE INDEX idx_category_keywords_keyword ON public.category_keywords USING btree (keyword);

CREATE INDEX idx_category_keywords_weight ON public.category_keywords USING btree (weight DESC);

CREATE INDEX idx_closing_overrides_account ON public.credit_card_closing_overrides USING btree (account_id, reference_date);

CREATE INDEX idx_credit_card_closing_overrides_account_id ON public.credit_card_closing_overrides USING btree (account_id);

CREATE INDEX idx_credit_card_invoices_account_month_year ON public.credit_card_invoices USING btree (account_id, month, year);

CREATE INDEX idx_families_deleted_by ON public.families USING btree (deleted_by);

CREATE INDEX idx_families_not_deleted ON public.families USING btree (owner_id, deleted) WHERE (deleted = false);

CREATE INDEX idx_families_owner_id ON public.families USING btree (owner_id);

CREATE INDEX idx_family_invitations_family_id ON public.family_invitations USING btree (family_id);

CREATE INDEX idx_family_invitations_from_user ON public.family_invitations USING btree (from_user_id);

CREATE INDEX idx_family_invitations_scope_trip_id ON public.family_invitations USING btree (scope_trip_id);

CREATE INDEX idx_family_invitations_to_user ON public.family_invitations USING btree (to_user_id, status);

CREATE INDEX idx_family_invitations_to_user_status ON public.family_invitations USING btree (to_user_id, status) WHERE (status = 'pending'::text);

CREATE INDEX idx_family_members_family_id ON public.family_members USING btree (family_id);

CREATE INDEX idx_family_members_invited_by ON public.family_members USING btree (invited_by);

CREATE INDEX idx_family_members_linked_user_id ON public.family_members USING btree (linked_user_id);

CREATE INDEX idx_family_members_lookup ON public.family_members USING btree (family_id, linked_user_id, status) WHERE (status = 'active'::text);

CREATE INDEX idx_family_members_member_type ON public.family_members USING btree (member_type);

CREATE INDEX idx_family_members_removed_by ON public.family_members USING btree (removed_by);

CREATE INDEX idx_family_members_role ON public.family_members USING btree (role);

CREATE INDEX idx_family_members_scope_trip_id ON public.family_members USING btree (scope_trip_id);

CREATE INDEX idx_family_members_type_family ON public.family_members USING btree (family_id, member_type);

CREATE INDEX idx_family_members_user_id ON public.family_members USING btree (user_id);

CREATE INDEX idx_family_members_user_ids ON public.family_members USING btree (user_id, linked_user_id) WHERE ((user_id IS NOT NULL) OR (linked_user_id IS NOT NULL));

CREATE INDEX idx_goal_milestones_goal_id ON public.goal_milestones USING btree (goal_id);

CREATE INDEX idx_goal_milestones_goal_pct ON public.goal_milestones USING btree (goal_id, target_pct);

CREATE INDEX idx_goal_milestones_user_id ON public.goal_milestones USING btree (user_id);

CREATE INDEX idx_goals_creator_user_id ON public.goals USING btree (creator_user_id);

CREATE INDEX idx_goals_linked_account_id ON public.goals USING btree (linked_account_id) WHERE (linked_account_id IS NOT NULL);

CREATE INDEX idx_goals_status ON public.goals USING btree (status) WHERE (deleted = false);

CREATE INDEX idx_goals_user_id ON public.goals USING btree (user_id) WHERE (deleted = false);

CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences USING btree (user_id);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE UNIQUE INDEX idx_notifications_welcome_unique ON public.notifications USING btree (user_id, type) WHERE (type = 'WELCOME'::text);

CREATE UNIQUE INDEX idx_one_initial_balance_per_account ON public.transactions USING btree (account_id) WHERE (description = 'Saldo inicial'::text);

CREATE INDEX idx_profiles_default_account_id ON public.profiles USING btree (default_account_id) WHERE (default_account_id IS NOT NULL);

CREATE INDEX idx_profiles_default_credit_card_id ON public.profiles USING btree (default_credit_card_id) WHERE (default_credit_card_id IS NOT NULL);

CREATE INDEX idx_profiles_shared_sync_credit_card_id ON public.profiles USING btree (shared_sync_credit_card_id);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);

CREATE INDEX idx_reconciliations_account_id ON public.account_reconciliations USING btree (account_id, statement_date DESC);

CREATE INDEX idx_reconciliations_user_id ON public.account_reconciliations USING btree (user_id);

CREATE INDEX idx_settlement_reversals_original_tx ON public.settlement_reversals USING btree (original_transaction_id);

CREATE INDEX idx_settlement_reversals_payment_transaction_id ON public.settlement_reversals USING btree (payment_transaction_id);

CREATE INDEX idx_settlement_reversals_reversed_at ON public.settlement_reversals USING btree (reversed_at);

CREATE INDEX idx_settlement_reversals_reversed_by ON public.settlement_reversals USING btree (reversed_by);

CREATE INDEX idx_settlement_reversals_split_id ON public.settlement_reversals USING btree (split_id);

CREATE INDEX idx_shared_credit_cards_user_id ON public.shared_credit_cards USING btree (user_id);

CREATE INDEX idx_splits_settled_by_creditor ON public.transaction_splits USING btree (settled_by_creditor) WHERE (settled_by_creditor = false);

CREATE INDEX idx_splits_settled_by_debtor ON public.transaction_splits USING btree (settled_by_debtor) WHERE (settled_by_debtor = false);

CREATE INDEX idx_splits_user_settled ON public.transaction_splits USING btree (user_id, is_settled);

CREATE INDEX idx_transaction_splits_creditor_settlement_tx_id ON public.transaction_splits USING btree (creditor_settlement_tx_id);

CREATE INDEX idx_transaction_splits_debtor_settlement_tx_id ON public.transaction_splits USING btree (debtor_settlement_tx_id);

CREATE INDEX idx_transaction_splits_deleted_at ON public.transaction_splits USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_transaction_splits_lookup ON public.transaction_splits USING btree (transaction_id, member_id, user_id);

CREATE INDEX idx_transaction_splits_member_id ON public.transaction_splits USING btree (member_id);

CREATE INDEX idx_transaction_splits_settled ON public.transaction_splits USING btree (transaction_id, is_settled);

CREATE INDEX idx_transaction_splits_settled_tx ON public.transaction_splits USING btree (settled_transaction_id) WHERE (is_settled = true);

CREATE INDEX idx_transaction_splits_transaction_id ON public.transaction_splits USING btree (transaction_id);

CREATE INDEX idx_transaction_splits_user_id ON public.transaction_splits USING btree (user_id);

CREATE INDEX idx_transactions_account_date ON public.transactions USING btree (account_id, date DESC) WHERE (deleted_at IS NULL);

CREATE INDEX idx_transactions_account_id ON public.transactions USING btree (account_id);

CREATE INDEX idx_transactions_asset_id ON public.transactions USING btree (asset_id);

CREATE INDEX idx_transactions_category_id ON public.transactions USING btree (category_id);

CREATE INDEX idx_transactions_competence_date ON public.transactions USING btree (user_id, competence_date);

CREATE INDEX idx_transactions_creator_user_id ON public.transactions USING btree (creator_user_id);

CREATE INDEX idx_transactions_deleted_at ON public.transactions USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_transactions_dest_account_date ON public.transactions USING btree (destination_account_id, date DESC) WHERE (deleted_at IS NULL);

CREATE INDEX idx_transactions_destination_account_id ON public.transactions USING btree (destination_account_id);

CREATE INDEX idx_transactions_duplicate_check ON public.transactions USING btree (user_id, amount, description, date, created_at DESC) WHERE (deleted_at IS NULL);

CREATE INDEX idx_transactions_frequency ON public.transactions USING btree (frequency) WHERE (frequency IS NOT NULL);

CREATE INDEX idx_transactions_goal_id ON public.transactions USING btree (goal_id);

CREATE UNIQUE INDEX idx_transactions_idempotency_key ON public.transactions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);

CREATE UNIQUE INDEX idx_transactions_import_hash ON public.transactions USING btree (user_id, import_hash) WHERE (import_hash IS NOT NULL);

CREATE INDEX idx_transactions_is_refund ON public.transactions USING btree (is_refund) WHERE (is_refund = true);

CREATE INDEX idx_transactions_is_shared ON public.transactions USING btree (is_shared) WHERE (is_shared = true);

CREATE UNIQUE INDEX idx_transactions_mirror_unique ON public.transactions USING btree (source_transaction_id, user_id) WHERE (source_transaction_id IS NOT NULL);

CREATE INDEX idx_transactions_notifications ON public.transactions USING btree (date, user_id) WHERE ((enable_notification = true) AND (deleted_at IS NULL));

CREATE INDEX idx_transactions_payer_id ON public.transactions USING btree (payer_id) WHERE (is_shared = true);

CREATE INDEX idx_transactions_recurring ON public.transactions USING btree (user_id, is_recurring, last_generated_date) WHERE (is_recurring = true);

CREATE INDEX idx_transactions_refund_of_transaction_id ON public.transactions USING btree (refund_of_transaction_id);

CREATE INDEX idx_transactions_related_member_id ON public.transactions USING btree (related_member_id);

CREATE INDEX idx_transactions_shared ON public.transactions USING btree (is_shared, source_transaction_id) WHERE (is_shared = true);

CREATE INDEX idx_transactions_source_transaction_id ON public.transactions USING btree (source_transaction_id);

CREATE INDEX idx_transactions_status_pending ON public.transactions USING btree (status, user_id, date) WHERE (status <> 'CONFIRMED'::text);

CREATE INDEX idx_transactions_trip_id ON public.transactions USING btree (trip_id);

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);

CREATE INDEX idx_transactions_user_competence ON public.transactions USING btree (user_id, competence_date DESC);

CREATE INDEX idx_transactions_user_date_active ON public.transactions USING btree (user_id, date DESC, created_at DESC) WHERE ((deleted_at IS NULL) AND (status IS DISTINCT FROM 'PENDING'::text));

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);

CREATE INDEX idx_transactions_user_id_date ON public.transactions USING btree (user_id, date DESC);

CREATE INDEX idx_trip_checklist_assigned_to ON public.trip_checklist USING btree (assigned_to);

CREATE INDEX idx_trip_checklist_trip_id ON public.trip_checklist USING btree (trip_id);

CREATE INDEX idx_trip_exchange_purchases_trip_id ON public.trip_exchange_purchases USING btree (trip_id);

CREATE INDEX idx_trip_exchange_purchases_user_id ON public.trip_exchange_purchases USING btree (user_id);

CREATE INDEX idx_trip_invitations_invitee_id ON public.trip_invitations USING btree (invitee_id);

CREATE INDEX idx_trip_invitations_inviter_id ON public.trip_invitations USING btree (inviter_id);

CREATE INDEX idx_trip_invitations_status ON public.trip_invitations USING btree (status);

CREATE INDEX idx_trip_invitations_trip_id ON public.trip_invitations USING btree (trip_id);

CREATE INDEX idx_trip_itinerary_trip_id ON public.trip_itinerary USING btree (trip_id);

CREATE INDEX idx_trip_members_removed_by ON public.trip_members USING btree (removed_by);

CREATE INDEX idx_trip_members_status_active ON public.trip_members USING btree (trip_id, status) WHERE (status = 'active'::text);

CREATE INDEX idx_trip_members_trip_id ON public.trip_members USING btree (trip_id);

CREATE INDEX idx_trip_members_user_id ON public.trip_members USING btree (user_id);

CREATE INDEX idx_trips_archived ON public.trips USING btree (is_archived, owner_id);

CREATE INDEX idx_trips_creator_user_id ON public.trips USING btree (creator_user_id);

CREATE INDEX idx_trips_deleted_by ON public.trips USING btree (deleted_by);

CREATE INDEX idx_trips_not_deleted ON public.trips USING btree (owner_id, deleted) WHERE (deleted = false);

CREATE INDEX idx_trips_owner_id ON public.trips USING btree (owner_id);

CREATE INDEX idx_trips_source_trip_id ON public.trips USING btree (source_trip_id);

CREATE INDEX idx_tx_account_competence ON public.transactions USING btree (account_id, competence_date DESC) WHERE (source_transaction_id IS NULL);

CREATE INDEX idx_tx_user_competence ON public.transactions USING btree (user_id, competence_date DESC) WHERE (source_transaction_id IS NULL);

CREATE INDEX idx_tx_user_date ON public.transactions USING btree (user_id, date DESC) WHERE (source_transaction_id IS NULL);

CREATE INDEX idx_tx_user_shared ON public.transactions USING btree (user_id, is_shared) WHERE (source_transaction_id IS NULL);

CREATE UNIQUE INDEX idx_unique_installment_per_series ON public.transactions USING btree (series_id, current_installment) WHERE ((series_id IS NOT NULL) AND (is_installment = true));

CREATE UNIQUE INDEX idx_unique_pending_invitation ON public.family_invitations USING btree (from_user_id, to_user_id, family_id) WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX idx_unique_pending_trip_invitation ON public.trip_invitations USING btree (trip_id, invitee_id) WHERE (status = 'pending'::text);

CREATE INDEX idx_user_learning_category ON public.user_category_learning USING btree (category_id);

CREATE INDEX idx_user_learning_confidence ON public.user_category_learning USING btree (confidence DESC);

CREATE INDEX idx_user_learning_pattern ON public.user_category_learning USING btree (description_pattern);

CREATE INDEX idx_user_learning_user ON public.user_category_learning USING btree (user_id);

CREATE INDEX notification_preferences_preferred_hour_idx ON public.notification_preferences USING btree (preferred_hour);

CREATE UNIQUE INDEX uq_transactions_user_account_external_id ON public.transactions USING btree (user_id, account_id, external_id) WHERE ((external_id IS NOT NULL) AND (deleted_at IS NULL));

CREATE TRIGGER audit_accounts AFTER INSERT OR DELETE OR UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_log_balance_change AFTER UPDATE OF balance ON accounts FOR EACH ROW EXECUTE FUNCTION log_balance_change();

CREATE TRIGGER trg_prevent_delete_account BEFORE DELETE OR UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION prevent_delete_if_has_transactions();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sync_asset_summary AFTER INSERT OR DELETE OR UPDATE ON asset_transactions FOR EACH ROW EXECUTE FUNCTION fn_sync_asset_summary();

CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_prevent_delete_category BEFORE DELETE OR UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION prevent_delete_if_has_transactions();

CREATE TRIGGER update_category_keywords_updated_at BEFORE UPDATE ON category_keywords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_credit_card_invoices BEFORE UPDATE ON credit_card_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_error_logs_updated_at BEFORE UPDATE ON error_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_add_owner_to_family_members AFTER INSERT ON families FOR EACH ROW EXECUTE FUNCTION handle_new_family_owner_member();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_family_invitation_accepted BEFORE UPDATE ON family_invitations FOR EACH ROW EXECUTE FUNCTION handle_family_invitation_accepted();

CREATE TRIGGER trg_family_invitation_change AFTER INSERT OR UPDATE ON family_invitations FOR EACH ROW EXECUTE FUNCTION handle_family_invitation_change();

CREATE TRIGGER trg_family_invitations_updated_at BEFORE UPDATE ON family_invitations FOR EACH ROW EXECUTE FUNCTION update_family_invitations_updated_at();

CREATE TRIGGER audit_family_members AFTER INSERT OR DELETE OR UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_auto_connection AFTER INSERT OR UPDATE ON family_members FOR EACH ROW WHEN (new.linked_user_id IS NOT NULL) EXECUTE FUNCTION handle_auto_connection();

CREATE TRIGGER trg_auto_link_family_member BEFORE INSERT OR UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION auto_link_family_member();

CREATE TRIGGER trg_check_member_settlement BEFORE DELETE ON family_members FOR EACH ROW EXECUTE FUNCTION check_member_settlement_before_delete();

CREATE TRIGGER trg_family_member_removed AFTER DELETE ON family_members FOR EACH ROW EXECUTE FUNCTION handle_family_member_removed();

CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_goal_notification AFTER UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION fn_trg_goal_notification();

CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sync_profile_to_family_members_trigger AFTER UPDATE ON profiles FOR EACH ROW WHEN (old.avatar_url IS DISTINCT FROM new.avatar_url OR old.avatar_color IS DISTINCT FROM new.avatar_color OR old.avatar_icon IS DISTINCT FROM new.avatar_icon) EXECUTE FUNCTION sync_profile_to_family_members();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_shared_credit_cards BEFORE UPDATE ON shared_credit_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_transaction_splits AFTER INSERT OR DELETE OR UPDATE ON transaction_splits FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER cascade_delete_settlement_transactions BEFORE DELETE ON transaction_splits FOR EACH ROW EXECUTE FUNCTION cascade_delete_settlement_transactions();

CREATE TRIGGER trg_fill_split_user_id BEFORE INSERT OR UPDATE ON transaction_splits FOR EACH ROW EXECUTE FUNCTION fill_transaction_split_user_id();

CREATE TRIGGER trg_sync_is_settled BEFORE UPDATE ON transaction_splits FOR EACH ROW EXECUTE FUNCTION sync_is_settled();

CREATE TRIGGER trg_sync_settled_status AFTER UPDATE OF is_settled ON transaction_splits FOR EACH ROW EXECUTE FUNCTION sync_transaction_settled_status();

CREATE TRIGGER trigger_adjust_trip_budget_on_settlement AFTER UPDATE ON transaction_splits FOR EACH ROW EXECUTE FUNCTION adjust_trip_budget_on_settlement();

CREATE TRIGGER trigger_update_shared_competence_after_split AFTER INSERT ON transaction_splits FOR EACH ROW EXECUTE FUNCTION update_shared_competence_after_split();

CREATE TRIGGER audit_transactions AFTER INSERT OR DELETE OR UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER notify_shared_expense_trigger AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION notify_shared_expense();

CREATE TRIGGER trg_log_tx_deletion BEFORE DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION log_transaction_deletion();

CREATE TRIGGER trg_recurring_transaction AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION fn_handle_recurring_transactions();

CREATE TRIGGER trg_sanitize_transaction_category BEFORE INSERT OR UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION fn_sanitize_transaction_category();

CREATE TRIGGER trg_update_balance_delete AFTER DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_delete();

CREATE TRIGGER trg_update_balance_insert AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_insert();

CREATE TRIGGER trg_update_balance_update AFTER UPDATE ON transactions FOR EACH ROW WHEN (old.amount IS DISTINCT FROM new.amount OR old.type IS DISTINCT FROM new.type OR old.account_id IS DISTINCT FROM new.account_id OR old.destination_account_id IS DISTINCT FROM new.destination_account_id OR old.deleted_at IS DISTINCT FROM new.deleted_at OR old.date IS DISTINCT FROM new.date OR old.payer_id IS DISTINCT FROM new.payer_id) EXECUTE FUNCTION update_account_balance_on_update();

CREATE TRIGGER trg_validate_shared_transaction BEFORE INSERT OR UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION validate_shared_transaction();

CREATE TRIGGER trigger_cascade_soft_delete_settlement_transactions AFTER UPDATE OF deleted_at ON transactions FOR EACH ROW EXECUTE FUNCTION cascade_soft_delete_settlement_transactions();

CREATE TRIGGER trigger_notify_shared_transaction_change AFTER DELETE OR UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION fn_notify_shared_transaction_change();

CREATE TRIGGER trigger_set_credit_card_competence_date BEFORE INSERT OR UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION set_credit_card_competence_date();

CREATE TRIGGER trigger_set_transaction_currency BEFORE INSERT OR UPDATE OF account_id ON transactions FOR EACH ROW EXECUTE FUNCTION set_transaction_currency_from_account();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_create_trip_invitation_notification AFTER INSERT ON trip_invitations FOR EACH ROW WHEN (new.status = 'pending'::text) EXECUTE FUNCTION create_trip_invitation_notification();

CREATE TRIGGER trg_handle_trip_invitation_response AFTER UPDATE ON trip_invitations FOR EACH ROW WHEN (new.status <> old.status) EXECUTE FUNCTION handle_trip_invitation_response();

CREATE TRIGGER trg_trip_invitation_accepted BEFORE UPDATE ON trip_invitations FOR EACH ROW EXECUTE FUNCTION handle_trip_invitation_accepted();

CREATE TRIGGER trg_trip_invitation_change AFTER INSERT OR UPDATE ON trip_invitations FOR EACH ROW EXECUTE FUNCTION handle_trip_invitation_change();

CREATE TRIGGER trg_add_trip_owner AFTER INSERT ON trips FOR EACH ROW EXECUTE FUNCTION add_trip_owner();

CREATE TRIGGER trg_auto_update_trip_status BEFORE INSERT OR UPDATE OF start_date, end_date, deleted ON trips FOR EACH ROW EXECUTE FUNCTION fn_auto_update_trip_status();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_category_learning_updated_at BEFORE UPDATE ON user_category_learning FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

alter table "public"."account_reconciliations" enable row level security;

alter table "public"."accounts" enable row level security;

alter table "public"."admin_users" enable row level security;

alter table "public"."asset_transactions" enable row level security;

alter table "public"."assets" enable row level security;

alter table "public"."audit_log" enable row level security;

alter table "public"."b3_tickers_cache" enable row level security;

alter table "public"."balance_changes" enable row level security;

alter table "public"."budgets" enable row level security;

alter table "public"."categories" enable row level security;

alter table "public"."category_keywords" enable row level security;

alter table "public"."credit_card_closing_overrides" enable row level security;

alter table "public"."credit_card_invoices" enable row level security;

alter table "public"."error_logs" enable row level security;

alter table "public"."families" enable row level security;

alter table "public"."family_invitations" enable row level security;

alter table "public"."family_members" enable row level security;

alter table "public"."goal_milestones" enable row level security;

alter table "public"."goals" enable row level security;

alter table "public"."notification_preferences" enable row level security;

alter table "public"."notifications" enable row level security;

alter table "public"."pin_attempts" enable row level security;

alter table "public"."profiles" enable row level security;

alter table "public"."push_subscriptions" enable row level security;

alter table "public"."settlement_reversals" enable row level security;

alter table "public"."shared_credit_cards" enable row level security;

alter table "public"."transaction_auto_share_rules" enable row level security;

alter table "public"."transaction_splits" enable row level security;

alter table "public"."transactions" enable row level security;

alter table "public"."trip_checklist" enable row level security;

alter table "public"."trip_exchange_purchases" enable row level security;

alter table "public"."trip_invitations" enable row level security;

alter table "public"."trip_itinerary" enable row level security;

alter table "public"."trip_members" enable row level security;

alter table "public"."trips" enable row level security;

alter table "public"."user_category_learning" enable row level security;

create policy "Users can manage own reconciliations" on "public"."account_reconciliations" as permissive for all to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Users can create accounts" on "public"."accounts" as permissive for insert to "public" with check ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can delete own accounts" on "public"."accounts" as permissive for delete to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can update own accounts" on "public"."accounts" as permissive for update to "public" using (((user_id = ( SELECT auth.uid() AS uid)) AND (deleted_at IS NULL)));

create policy "accounts_select_v2" on "public"."accounts" as permissive for select to "authenticated" using ((((user_id = ( SELECT auth.uid() AS uid)) OR is_family_member_v2(( SELECT families.id
   FROM families
  WHERE (families.owner_id = accounts.user_id)
 LIMIT 1), ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM family_members
  WHERE ((family_members.user_id = accounts.user_id) AND is_family_member_v2(family_members.family_id, ( SELECT auth.uid() AS uid)))))) AND (deleted_at IS NULL)));

create policy "admin_users_no_direct_client_access" on "public"."admin_users" as permissive for all to "authenticated" using (false) with check (false);

create policy "Users can manage own asset transactions" on "public"."asset_transactions" as permissive for all to "public" using ((user_id = ( SELECT auth.uid() AS uid)));

create policy "assets_unified_policy" on "public"."assets" as permissive for all to "public" using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Enable insert for authenticated users only" on "public"."audit_log" as permissive for insert to "authenticated" with check ((changed_by = ( SELECT auth.uid() AS uid)));

create policy "Users can view own audit log" on "public"."audit_log" as permissive for select to "public" using ((changed_by = ( SELECT auth.uid() AS uid)));

create policy "Allow authenticated users to select b3 tickers" on "public"."b3_tickers_cache" as permissive for select to "authenticated" using (true);

create policy "Allow service role to manage b3 tickers" on "public"."b3_tickers_cache" as permissive for all to "service_role" using (true) with check (true);

create policy "Users can view own balance changes" on "public"."balance_changes" as permissive for select to "authenticated" using ((account_id IN ( SELECT accounts.id
   FROM accounts
  WHERE (accounts.user_id = ( SELECT auth.uid() AS uid)))));

create policy "Users can create own budgets" on "public"."budgets" as permissive for insert to "public" with check ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can delete own budgets" on "public"."budgets" as permissive for delete to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can update own budgets" on "public"."budgets" as permissive for update to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can view own budgets" on "public"."budgets" as permissive for select to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can create categories" on "public"."categories" as permissive for insert to "public" with check ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can delete own categories" on "public"."categories" as permissive for delete to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can update own categories" on "public"."categories" as permissive for update to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can view own categories" on "public"."categories" as permissive for select to "public" using (((user_id = ( SELECT auth.uid() AS uid)) AND (deleted_at IS NULL)));

create policy "Anyone can read category keywords" on "public"."category_keywords" as permissive for select to "public" using (true);

create policy "Users can delete their own closing overrides via account" on "public"."credit_card_closing_overrides" as permissive for delete to "public" using ((account_id IN ( SELECT accounts.id
   FROM accounts
  WHERE (accounts.user_id = ( SELECT auth.uid() AS uid)))));

create policy "Users can insert their own closing overrides via account" on "public"."credit_card_closing_overrides" as permissive for insert to "public" with check ((account_id IN ( SELECT accounts.id
   FROM accounts
  WHERE (accounts.user_id = ( SELECT auth.uid() AS uid)))));

create policy "Users can update their own closing overrides via account" on "public"."credit_card_closing_overrides" as permissive for update to "public" using ((account_id IN ( SELECT accounts.id
   FROM accounts
  WHERE (accounts.user_id = ( SELECT auth.uid() AS uid)))));

create policy "Users can view their own closing overrides via account" on "public"."credit_card_closing_overrides" as permissive for select to "public" using ((account_id IN ( SELECT accounts.id
   FROM accounts
  WHERE (accounts.user_id = ( SELECT auth.uid() AS uid)))));

create policy "Users can manage their own credit card invoices" on "public"."credit_card_invoices" as permissive for all to "public" using ((EXISTS ( SELECT 1
   FROM accounts
  WHERE ((accounts.id = credit_card_invoices.account_id) AND (accounts.user_id = ( SELECT auth.uid() AS uid))))));

create policy "error_logs_select_authenticated" on "public"."error_logs" as permissive for select to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) OR is_admin()));

create policy "users can insert own errors" on "public"."error_logs" as permissive for insert to "public" with check (((( SELECT auth.uid() AS uid) = user_id) OR (user_id IS NULL)));

create policy "Users can create families" on "public"."families" as permissive for insert to "public" with check ((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can delete own families" on "public"."families" as permissive for delete to "public" using ((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can update own families" on "public"."families" as permissive for update to "public" using ((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can view their families" on "public"."families" as permissive for select to "authenticated" using (((owner_id = ( SELECT auth.uid() AS uid)) OR is_family_member_v2(id, ( SELECT auth.uid() AS uid))));

create policy "Users can create invitations" on "public"."family_invitations" as permissive for insert to "public" with check ((from_user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can delete own sent invitations" on "public"."family_invitations" as permissive for delete to "authenticated" using ((from_user_id = ( SELECT auth.uid() AS uid)));

create policy "Users can view own invitations" on "public"."family_invitations" as permissive for select to "authenticated" using (((from_user_id = ( SELECT auth.uid() AS uid)) OR (to_user_id = ( SELECT auth.uid() AS uid))));

create policy "family_invitations_unified_update" on "public"."family_invitations" as permissive for update to "authenticated" using (((from_user_id = ( SELECT auth.uid() AS uid)) OR (to_user_id = ( SELECT auth.uid() AS uid)))) with check (((from_user_id = ( SELECT auth.uid() AS uid)) OR (to_user_id = ( SELECT auth.uid() AS uid))));

create policy "Family owners and admins can delete members" on "public"."family_members" as permissive for delete to "authenticated" using (((family_id IN ( SELECT families.id
   FROM families
  WHERE (families.owner_id = ( SELECT auth.uid() AS uid)))) OR is_family_member_v2(family_id, ( SELECT auth.uid() AS uid))));

create policy "Family owners can insert members" on "public"."family_members" as permissive for insert to "authenticated" with check ((family_id IN ( SELECT families.id
   FROM families
  WHERE (families.owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));

create policy "family_members_unified_select" on "public"."family_members" as permissive for select to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) OR (linked_user_id = ( SELECT auth.uid() AS uid)) OR is_family_member_v2(family_id, ( SELECT auth.uid() AS uid)) OR (family_id IN ( SELECT f.id
   FROM families f
  WHERE (f.owner_id = ( SELECT auth.uid() AS uid))))));

create policy "family_members_unified_update" on "public"."family_members" as permissive for update to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) OR (linked_user_id = ( SELECT auth.uid() AS uid)) OR (family_id IN ( SELECT families.id
   FROM families
  WHERE (families.owner_id = ( SELECT auth.uid() AS uid)))) OR is_family_member_v2(family_id, ( SELECT auth.uid() AS uid))));

create policy "goal_milestones_user_policy" on "public"."goal_milestones" as permissive for all to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "goals_unified_policy" on "public"."goals" as permissive for all to "public" using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Users can manage own notification preferences" on "public"."notification_preferences" as permissive for all to "public" using ((user_id = ( SELECT auth.uid() AS uid)));

create policy "Users can create notifications" on "public"."notifications" as permissive for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) IS NOT NULL));

create policy "Users can delete own notifications" on "public"."notifications" as permissive for delete to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can update own notifications" on "public"."notifications" as permissive for update to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can view own notifications" on "public"."notifications" as permissive for select to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can read own pin attempts" on "public"."pin_attempts" as permissive for select to "public" using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can update own profile" on "public"."profiles" as permissive for update to "public" using ((id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can view profiles" on "public"."profiles" as permissive for select to "public" using (((id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (( SELECT auth.uid() AS uid) IS NOT NULL)));

create policy "push_subscriptions_user_policy" on "public"."push_subscriptions" as permissive for all to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Settlement reversals immutable (delete)" on "public"."settlement_reversals" as permissive for delete to "authenticated" using (false);

create policy "Settlement reversals immutable (update)" on "public"."settlement_reversals" as permissive for update to "authenticated" using (false);

create policy "Users can insert own settlement reversals" on "public"."settlement_reversals" as permissive for insert to "authenticated" with check ((reversed_by = ( SELECT auth.uid() AS uid)));

create policy "Users can view own settlement reversals" on "public"."settlement_reversals" as permissive for select to "authenticated" using ((reversed_by = ( SELECT auth.uid() AS uid)));

create policy "shared_credit_cards_delete_owner" on "public"."shared_credit_cards" as permissive for delete to "authenticated" using ((EXISTS ( SELECT 1
   FROM accounts
  WHERE ((accounts.id = shared_credit_cards.account_id) AND (accounts.user_id = ( SELECT auth.uid() AS uid))))));

create policy "shared_credit_cards_insert_owner" on "public"."shared_credit_cards" as permissive for insert to "authenticated" with check ((EXISTS ( SELECT 1
   FROM accounts
  WHERE ((accounts.id = shared_credit_cards.account_id) AND (accounts.user_id = ( SELECT auth.uid() AS uid))))));

create policy "shared_credit_cards_select_authenticated" on "public"."shared_credit_cards" as permissive for select to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM accounts
  WHERE ((accounts.id = shared_credit_cards.account_id) AND (accounts.user_id = ( SELECT auth.uid() AS uid)))))));

create policy "shared_credit_cards_update_authenticated" on "public"."shared_credit_cards" as permissive for update to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM accounts
  WHERE ((accounts.id = shared_credit_cards.account_id) AND (accounts.user_id = ( SELECT auth.uid() AS uid))))))) with check (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM accounts
  WHERE ((accounts.id = shared_credit_cards.account_id) AND (accounts.user_id = ( SELECT auth.uid() AS uid)))))));

create policy "Users can manage own auto share rules" on "public"."transaction_auto_share_rules" as permissive for all to "public" using ((user_id = ( SELECT auth.uid() AS uid)));

create policy "transaction_splits_delete_authenticated" on "public"."transaction_splits" as permissive for delete to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) OR check_split_access(transaction_id, ( SELECT auth.uid() AS uid))));

create policy "transaction_splits_insert_authenticated" on "public"."transaction_splits" as permissive for insert to "authenticated" with check (((user_id = ( SELECT auth.uid() AS uid)) OR check_split_access(transaction_id, ( SELECT auth.uid() AS uid))));

create policy "transaction_splits_select_authenticated" on "public"."transaction_splits" as permissive for select to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) OR check_split_access(transaction_id, ( SELECT auth.uid() AS uid)) OR ((deleted_at IS NULL) AND (transaction_id IN ( SELECT transactions.id
   FROM transactions
  WHERE ((transactions.user_id = ( SELECT auth.uid() AS uid)) AND (transactions.deleted_at IS NULL)))))));

create policy "transaction_splits_update_authenticated" on "public"."transaction_splits" as permissive for update to "authenticated" using (((user_id = ( SELECT auth.uid() AS uid)) OR check_split_access(transaction_id, ( SELECT auth.uid() AS uid)))) with check (((user_id = ( SELECT auth.uid() AS uid)) OR check_split_access(transaction_id, ( SELECT auth.uid() AS uid))));

create policy "Users can create transactions" on "public"."transactions" as permissive for insert to "public" with check ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "family_members_can_delete_based_on_role" on "public"."transactions" as permissive for delete to "public" using (((creator_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (family_members fm
     JOIN families f ON ((f.id = fm.family_id)))
  WHERE ((fm.user_id = ( SELECT auth.uid() AS uid)) AND ((f.owner_id = transactions.user_id) OR (EXISTS ( SELECT 1
           FROM family_members fm2
          WHERE ((fm2.family_id = f.id) AND (fm2.user_id = transactions.user_id))))) AND (fm.role = 'admin'::family_role))))));

create policy "transactions_unified_select" on "public"."transactions" as permissive for select to "authenticated" using ((((user_id = ( SELECT auth.uid() AS uid)) OR (creator_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM family_members
  WHERE ((family_members.user_id = transactions.user_id) AND is_family_member_v2(family_members.family_id, ( SELECT auth.uid() AS uid))))) OR ((trip_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM trip_members
  WHERE ((trip_members.trip_id = transactions.trip_id) AND (trip_members.user_id = ( SELECT auth.uid() AS uid))))) AND ((is_shared = true) OR (user_id = ( SELECT auth.uid() AS uid)) OR (creator_user_id = ( SELECT auth.uid() AS uid))))) AND (deleted_at IS NULL)));

create policy "transactions_update_authenticated" on "public"."transactions" as permissive for update to "authenticated" using ((((user_id = ( SELECT auth.uid() AS uid)) AND (source_transaction_id IS NULL) AND (deleted_at IS NULL)) OR (creator_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (family_members fm
     JOIN families f ON ((f.id = fm.family_id)))
  WHERE ((fm.user_id = ( SELECT auth.uid() AS uid)) AND ((f.owner_id = transactions.user_id) OR (EXISTS ( SELECT 1
           FROM family_members fm2
          WHERE ((fm2.family_id = f.id) AND (fm2.user_id = transactions.user_id))))) AND (fm.role = ANY (ARRAY['admin'::family_role, 'editor'::family_role]))))))) with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (source_transaction_id IS NULL) AND (deleted_at IS NULL)) OR (source_transaction_id IS NULL)));

create policy "Trip members can add checklist items" on "public"."trip_checklist" as permissive for insert to "public" with check (is_trip_member(trip_id, ( SELECT auth.uid() AS uid)));

create policy "Trip members can delete checklist items" on "public"."trip_checklist" as permissive for delete to "public" using (is_trip_member(trip_id, ( SELECT auth.uid() AS uid)));

create policy "Trip members can update checklist items" on "public"."trip_checklist" as permissive for update to "public" using (is_trip_member(trip_id, ( SELECT auth.uid() AS uid)));

create policy "Trip members can view checklist" on "public"."trip_checklist" as permissive for select to "public" using (is_trip_member(trip_id, ( SELECT auth.uid() AS uid)));

create policy "Trip members can view exchange purchases" on "public"."trip_exchange_purchases" as permissive for select to "public" using (is_trip_member(trip_id, ( SELECT auth.uid() AS uid)));

create policy "Users can create own exchange purchases" on "public"."trip_exchange_purchases" as permissive for insert to "public" with check ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can delete own exchange purchases" on "public"."trip_exchange_purchases" as permissive for delete to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "Users can update own exchange purchases" on "public"."trip_exchange_purchases" as permissive for update to "public" using ((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "trip_invitations_delete_policy" on "public"."trip_invitations" as permissive for delete to "public" using (((inviter_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (invitee_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));

create policy "trip_invitations_insert_policy" on "public"."trip_invitations" as permissive for insert to "public" with check ((inviter_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "trip_invitations_select_policy" on "public"."trip_invitations" as permissive for select to "public" using (((inviter_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (invitee_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));

create policy "trip_invitations_update_authenticated" on "public"."trip_invitations" as permissive for update to "authenticated" using (((invitee_id = ( SELECT auth.uid() AS uid)) OR (inviter_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_invitations.trip_id) AND (trips.owner_id = ( SELECT auth.uid() AS uid))))))) with check (((invitee_id = ( SELECT auth.uid() AS uid)) OR (inviter_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_invitations.trip_id) AND (trips.owner_id = ( SELECT auth.uid() AS uid)))))));

create policy "Trip members can add itinerary items" on "public"."trip_itinerary" as permissive for insert to "public" with check (is_trip_member(trip_id, ( SELECT auth.uid() AS uid)));

create policy "Trip members can delete itinerary items" on "public"."trip_itinerary" as permissive for delete to "public" using (is_trip_member(trip_id, ( SELECT auth.uid() AS uid)));

create policy "Trip members can update itinerary items" on "public"."trip_itinerary" as permissive for update to "public" using (is_trip_member(trip_id, ( SELECT auth.uid() AS uid)));

create policy "Trip members can view itinerary" on "public"."trip_itinerary" as permissive for select to "public" using (is_trip_member(trip_id, ( SELECT auth.uid() AS uid)));

create policy "trip_members_delete" on "public"."trip_members" as permissive for delete to "public" using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = ( SELECT auth.uid() AS uid)))))));

create policy "trip_members_insert" on "public"."trip_members" as permissive for insert to "authenticated" with check ((EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = ( SELECT auth.uid() AS uid))))));

create policy "trip_members_select" on "public"."trip_members" as permissive for select to "public" using (((user_id = ( SELECT auth.uid() AS uid)) OR is_trip_member(trip_id, ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = ( SELECT auth.uid() AS uid)))))));

create policy "trip_members_update" on "public"."trip_members" as permissive for update to "public" using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = ( SELECT auth.uid() AS uid)))))));

create policy "trips_delete" on "public"."trips" as permissive for delete to "public" using ((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "trips_insert" on "public"."trips" as permissive for insert to "public" with check ((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)));

create policy "trips_select" on "public"."trips" as permissive for select to "public" using (((owner_id = ( SELECT auth.uid() AS uid)) OR is_trip_member(id, ( SELECT auth.uid() AS uid))));

create policy "trips_update" on "public"."trips" as permissive for update to "public" using (((owner_id = ( SELECT auth.uid() AS uid)) OR is_trip_member(id, ( SELECT auth.uid() AS uid))));

create policy "Users can delete own learning" on "public"."user_category_learning" as permissive for delete to "public" using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can insert own learning" on "public"."user_category_learning" as permissive for insert to "public" with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can read own learning" on "public"."user_category_learning" as permissive for select to "public" using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can update own learning" on "public"."user_category_learning" as permissive for update to "public" using ((( SELECT auth.uid() AS uid) = user_id));

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."account_reconciliations" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."account_reconciliations" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."account_reconciliations" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."accounts" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."accounts" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."accounts" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_families" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_families" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_families" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_family_members" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_family_members" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_family_members" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_trip_members" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_trip_members" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_trip_members" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_trips" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_trips" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."active_trips" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."admin_users" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."asset_transactions" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."asset_transactions" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."asset_transactions" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."assets" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."assets" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."assets" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."audit_log" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."audit_log" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."audit_log" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."b3_tickers_cache" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."b3_tickers_cache" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."b3_tickers_cache" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."balance_changes" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."balance_changes" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."balance_changes" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."budgets" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."budgets" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."budgets" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."categories" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."categories" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."categories" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."category_keywords" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."category_keywords" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."category_keywords" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."credit_card_closing_overrides" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."credit_card_closing_overrides" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."credit_card_closing_overrides" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."credit_card_invoices" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."credit_card_invoices" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."credit_card_invoices" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."error_logs" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."error_logs" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."error_logs" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."families" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."families" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."families" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."family_invitations" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."family_invitations" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."family_invitations" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."family_members" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."family_members" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."family_members" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."goal_milestones" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."goal_milestones" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."goal_milestones" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."goals" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."goals" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."goals" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."notification_preferences" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."notification_preferences" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."notification_preferences" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."notifications" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."notifications" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."notifications" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."pin_attempts" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."pin_attempts" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."pin_attempts" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."profiles" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."profiles" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."profiles" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."push_subscriptions" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."push_subscriptions" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."push_subscriptions" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."settlement_reversals" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."settlement_reversals" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."settlement_reversals" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."shared_credit_cards" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."shared_credit_cards" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."shared_credit_cards" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."shared_transactions_for_current_user" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."shared_transactions_for_current_user" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."shared_transactions_for_current_user" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."shared_transactions_view" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."shared_transactions_view" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."shared_transactions_view" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transaction_auto_share_rules" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transaction_auto_share_rules" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transaction_auto_share_rules" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transaction_splits" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transaction_splits" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transaction_splits" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transaction_splits_with_settlement" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transaction_splits_with_settlement" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transaction_splits_with_settlement" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transactions" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transactions" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transactions" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transactions_ssot" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transactions_ssot" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."transactions_ssot" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_budget_summary" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_budget_summary" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_budget_summary" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_checklist" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_checklist" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_checklist" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_exchange_purchases" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_exchange_purchases" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_exchange_purchases" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_invitations" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_invitations" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_invitations" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_itinerary" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_itinerary" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_itinerary" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_members" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_members" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trip_members" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trips" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trips" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."trips" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_category_learning" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_category_learning" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_category_learning" to "service_role";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_net_worth" to "anon";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_net_worth" to "authenticated";

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_net_worth" to "service_role";

revoke execute on all functions in schema public from public, anon;

revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function "public"."add_trip_owner"() to "service_role";

grant execute on function "public"."adjust_trip_budget_on_settlement"() to "service_role";

grant execute on function "public"."admin_reset_all_data"() to "service_role";

grant execute on function "public"."admin_reset_single_user"(target_user_id uuid) to "service_role";

grant execute on function "public"."assign_default_account_to_orphans"(p_default_account_id uuid, p_user_id uuid) to "authenticated";

grant execute on function "public"."assign_default_account_to_orphans"(p_default_account_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."audit_changes"() to "service_role";

grant execute on function "public"."auto_link_family_member"() to "service_role";

grant execute on function "public"."calculate_balance_between_users"(p_user1_id uuid, p_user2_id uuid, p_currency text) to "service_role";

grant execute on function "public"."calculate_budget_spent"(p_user_id uuid, p_category_id uuid, p_start_date date, p_end_date date, p_currency text) to "authenticated";

grant execute on function "public"."calculate_budget_spent"(p_user_id uuid, p_category_id uuid, p_start_date date, p_end_date date, p_currency text) to "service_role";

grant execute on function "public"."calculate_credit_card_competence_date"(p_transaction_date date, p_closing_day integer, p_due_day integer) to "authenticated";

grant execute on function "public"."calculate_credit_card_competence_date"(p_transaction_date date, p_closing_day integer, p_due_day integer) to "service_role";

grant execute on function "public"."calculate_credit_card_invoice"(p_account_id uuid, p_start_date date, p_end_date date) to "authenticated";

grant execute on function "public"."calculate_credit_card_invoice"(p_account_id uuid, p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."calculate_member_balance"(p_user_id uuid, p_member_id uuid) to "service_role";

grant execute on function "public"."calculate_single_account_balance"(p_account_id uuid) to "service_role";

grant execute on function "public"."calculate_trip_spent"(p_trip_id uuid, p_user_id uuid) to "authenticated";

grant execute on function "public"."calculate_trip_spent"(p_trip_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."cascade_delete_settlement_transactions"() to "service_role";

grant execute on function "public"."cascade_soft_delete_settlement_transactions"() to "service_role";

grant execute on function "public"."check_account_dependencies"(p_account_id uuid) to "authenticated";

grant execute on function "public"."check_account_dependencies"(p_account_id uuid) to "service_role";

grant execute on function "public"."check_member_settlement_before_delete"() to "service_role";

grant execute on function "public"."check_split_access"(p_transaction_id uuid, p_user_id uuid) to "authenticated";

grant execute on function "public"."check_split_access"(p_transaction_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."clean_old_audit_logs"(p_days_to_keep integer) to "authenticated";

grant execute on function "public"."clean_old_audit_logs"(p_days_to_keep integer) to "service_role";

grant execute on function "public"."cleanup_old_pending_operations"() to "authenticated";

grant execute on function "public"."cleanup_old_pending_operations"() to "service_role";

grant execute on function "public"."clear_error_logs"() to "authenticated";

grant execute on function "public"."clear_error_logs"() to "service_role";

grant execute on function "public"."clear_pin"() to "authenticated";

grant execute on function "public"."clear_pin"() to "service_role";

grant execute on function "public"."confirm_settlement"(p_split_ids uuid[], p_account_id uuid, p_user_id uuid, p_is_receiving boolean) to "service_role";

grant execute on function "public"."confirm_settlement_receipt"(p_split_ids uuid[], p_creditor_id uuid, p_account_id uuid, p_date date, p_category_id uuid, p_exchange_rate numeric) to "service_role";

grant execute on function "public"."contribute_to_goal"(p_goal_id uuid, p_amount numeric, p_account_id uuid, p_description text) to "authenticated";

grant execute on function "public"."contribute_to_goal"(p_goal_id uuid, p_amount numeric, p_account_id uuid, p_description text) to "service_role";

grant execute on function "public"."create_account_with_balance"(p_name text, p_type text, p_initial_balance numeric, p_bank_id text, p_bank_color text, p_currency text, p_is_international boolean, p_closing_day integer, p_due_day integer, p_credit_limit numeric, p_yield_rate numeric, p_yield_type text, p_hide_balance boolean) to "authenticated";

grant execute on function "public"."create_account_with_balance"(p_name text, p_type text, p_initial_balance numeric, p_bank_id text, p_bank_color text, p_currency text, p_is_international boolean, p_closing_day integer, p_due_day integer, p_credit_limit numeric, p_yield_rate numeric, p_yield_type text, p_hide_balance boolean) to "service_role";

grant execute on function "public"."create_account_with_initial_deposit"(p_name text, p_type text, p_bank text, p_initial_balance numeric, p_currency text) to "authenticated";

grant execute on function "public"."create_account_with_initial_deposit"(p_name text, p_type text, p_bank text, p_initial_balance numeric, p_currency text) to "service_role";

grant execute on function "public"."create_installment_series"(p_transactions jsonb, p_user_id uuid) to "service_role";

grant execute on function "public"."create_installment_series_v2"(p_transactions jsonb) to "authenticated";

grant execute on function "public"."create_installment_series_v2"(p_transactions jsonb) to "service_role";

grant execute on function "public"."create_transaction_with_splits"(p_transaction jsonb, p_splits jsonb, p_user_id uuid) to "service_role";

grant execute on function "public"."create_transaction_with_splits_v2"(p_transaction jsonb, p_splits jsonb) to "authenticated";

grant execute on function "public"."create_transaction_with_splits_v2"(p_transaction jsonb, p_splits jsonb) to "service_role";

grant execute on function "public"."create_trip_invitation_notification"() to "service_role";

grant execute on function "public"."delete_installment_series"(p_series_id uuid) to "authenticated";

grant execute on function "public"."delete_installment_series"(p_series_id uuid) to "service_role";

grant execute on function "public"."expire_pending_settlements"() to "service_role";

grant execute on function "public"."fill_transaction_split_user_id"() to "service_role";

grant execute on function "public"."fn_auto_update_trip_status"() to "service_role";

grant execute on function "public"."fn_create_notification"(p_user_id uuid, p_title text, p_message text, p_type text, p_link text) to "service_role";

grant execute on function "public"."fn_create_notification"(p_user_id uuid, p_title text, p_message text, p_type text, p_related_id text, p_metadata jsonb, p_link text) to "service_role";

grant execute on function "public"."fn_handle_recurring_transactions"() to "service_role";

grant execute on function "public"."fn_notify_shared_transaction_change"() to "service_role";

grant execute on function "public"."fn_respond_family_invitation"(p_invitation_id uuid, p_status text) to "authenticated";

grant execute on function "public"."fn_respond_family_invitation"(p_invitation_id uuid, p_status text) to "service_role";

grant execute on function "public"."fn_respond_trip_invitation"(p_invitation_id uuid, p_status text) to "authenticated";

grant execute on function "public"."fn_respond_trip_invitation"(p_invitation_id uuid, p_status text) to "service_role";

grant execute on function "public"."fn_sanitize_transaction_category"() to "service_role";

grant execute on function "public"."fn_sync_asset_summary"() to "service_role";

grant execute on function "public"."fn_trg_goal_notification"() to "service_role";

grant execute on function "public"."generate_pending_recurring_transactions"() to "service_role";

grant execute on function "public"."get_account_balance_at_date"(p_account_id uuid, p_date date) to "service_role";

grant execute on function "public"."get_account_balance_at_date_v2"(p_account_id uuid, p_date date) to "authenticated";

grant execute on function "public"."get_account_balance_at_date_v2"(p_account_id uuid, p_date date) to "service_role";

grant execute on function "public"."get_actual_closing_date"(p_year_month date, p_closing_day integer, p_mode text) to "authenticated";

grant execute on function "public"."get_actual_closing_date"(p_year_month date, p_closing_day integer, p_mode text) to "service_role";

grant execute on function "public"."get_admin_audit_logs"() to "authenticated";

grant execute on function "public"."get_admin_audit_logs"() to "service_role";

grant execute on function "public"."get_admin_error_logs"() to "authenticated";

grant execute on function "public"."get_admin_error_logs"() to "service_role";

grant execute on function "public"."get_admin_system_stats"() to "authenticated";

grant execute on function "public"."get_admin_system_stats"() to "service_role";

grant execute on function "public"."get_admin_user_dossier"(target_user_id uuid) to "authenticated";

grant execute on function "public"."get_admin_user_dossier"(target_user_id uuid) to "service_role";

grant execute on function "public"."get_admin_users_detailed"() to "authenticated";

grant execute on function "public"."get_admin_users_detailed"() to "service_role";

grant execute on function "public"."get_asset_performance"(p_asset_id uuid) to "authenticated";

grant execute on function "public"."get_asset_performance"(p_asset_id uuid) to "service_role";

grant execute on function "public"."get_credit_card_invoice"(p_account_id uuid, p_user_id uuid, p_month_start date, p_month_end date) to "authenticated";

grant execute on function "public"."get_credit_card_invoice"(p_account_id uuid, p_user_id uuid, p_month_start date, p_month_end date) to "service_role";

grant execute on function "public"."get_current_shared_debts"(p_user_id uuid, p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_current_shared_debts_v2"(p_start_date date, p_end_date date) to "authenticated";

grant execute on function "public"."get_current_shared_debts_v2"(p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_dashboard_summary"(p_user_id uuid, p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_dashboard_summary_v2"(p_start_date date, p_end_date date) to "authenticated";

grant execute on function "public"."get_dashboard_summary_v2"(p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_expenses_by_category"(p_user_id uuid, p_start_date date, p_end_date date) to "authenticated";

grant execute on function "public"."get_expenses_by_category"(p_user_id uuid, p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_family_consolidated_summary"(p_family_id uuid, p_month_start date) to "authenticated";

grant execute on function "public"."get_family_consolidated_summary"(p_family_id uuid, p_month_start date) to "service_role";

grant execute on function "public"."get_goal_progress"(p_goal_id uuid) to "authenticated";

grant execute on function "public"."get_goal_progress"(p_goal_id uuid) to "service_role";

grant execute on function "public"."get_monthly_evolution"(p_user_id uuid, p_months integer) to "authenticated";

grant execute on function "public"."get_monthly_evolution"(p_user_id uuid, p_months integer) to "service_role";

grant execute on function "public"."get_monthly_evolution_report"(p_user_id uuid, p_months integer) to "service_role";

grant execute on function "public"."get_monthly_evolution_report_v2"(p_months integer) to "authenticated";

grant execute on function "public"."get_monthly_evolution_report_v2"(p_months integer) to "service_role";

grant execute on function "public"."get_monthly_financial_summary"(p_user_id uuid, p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_monthly_financial_summary_v2"(p_start_date date, p_end_date date) to "authenticated";

grant execute on function "public"."get_monthly_financial_summary_v2"(p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_monthly_projection"(p_user_id uuid, p_end_date date, p_currency character varying) to "service_role";

grant execute on function "public"."get_monthly_projection_v2"(p_end_date date, p_currency character varying) to "authenticated";

grant execute on function "public"."get_monthly_projection_v2"(p_end_date date, p_currency character varying) to "service_role";

grant execute on function "public"."get_net_worth"(p_user_id uuid) to "service_role";

grant execute on function "public"."get_net_worth_v2"() to "authenticated";

grant execute on function "public"."get_net_worth_v2"() to "service_role";

grant execute on function "public"."get_pending_splits_for_settlement"(p_debtor_user_id uuid, p_creditor_user_id uuid, p_currency text) to "service_role";

grant execute on function "public"."get_record_history"(p_table_name text, p_record_id uuid) to "service_role";

grant execute on function "public"."get_shared_expense_summary_by_person"(p_user_id uuid, p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_shared_expense_summary_by_person_v2"(p_start_date date, p_end_date date) to "authenticated";

grant execute on function "public"."get_shared_expense_summary_by_person_v2"(p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_shared_finances_summary"(p_user_id uuid) to "authenticated";

grant execute on function "public"."get_shared_finances_summary"(p_user_id uuid) to "service_role";

grant execute on function "public"."get_shared_invoice_data"(p_user_id uuid) to "service_role";

grant execute on function "public"."get_shared_invoice_data_v2"() to "authenticated";

grant execute on function "public"."get_shared_invoice_data_v2"() to "service_role";

grant execute on function "public"."get_shared_transactions_for_current_user"() to "authenticated";

grant execute on function "public"."get_shared_transactions_for_current_user"() to "service_role";

grant execute on function "public"."get_trip_financial_summary"(p_trip_id uuid) to "authenticated";

grant execute on function "public"."get_trip_financial_summary"(p_trip_id uuid) to "service_role";

grant execute on function "public"."get_trip_participant_balances"(p_trip_id uuid) to "service_role";

grant execute on function "public"."get_trip_participant_balances_v2"(p_trip_id uuid) to "authenticated";

grant execute on function "public"."get_trip_participant_balances_v2"(p_trip_id uuid) to "service_role";

grant execute on function "public"."get_user_budgets_progress"(p_user_id uuid, p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_user_budgets_progress_v2"(p_start_date date, p_end_date date) to "authenticated";

grant execute on function "public"."get_user_budgets_progress_v2"(p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_user_budgets_progress_with_rollover"(p_user_id uuid, p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_user_budgets_progress_with_rollover_v2"(p_start_date date, p_end_date date) to "authenticated";

grant execute on function "public"."get_user_budgets_progress_with_rollover_v2"(p_start_date date, p_end_date date) to "service_role";

grant execute on function "public"."get_user_family_id"(_user_id uuid) to "authenticated";

grant execute on function "public"."get_user_family_id"(_user_id uuid) to "service_role";

grant execute on function "public"."get_user_transactions_ssot"(p_user_id uuid, p_start_date date, p_end_date date, p_type text, p_account_id uuid, p_category_id uuid, p_trip_id uuid, p_limit integer) to "authenticated";

grant execute on function "public"."get_user_transactions_ssot"(p_user_id uuid, p_start_date date, p_end_date date, p_type text, p_account_id uuid, p_category_id uuid, p_trip_id uuid, p_limit integer) to "service_role";

grant execute on function "public"."get_user_trip_ids"(p_user_id uuid) to "authenticated";

grant execute on function "public"."get_user_trip_ids"(p_user_id uuid) to "service_role";

grant execute on function "public"."get_wealth_evolution"(p_user_id uuid, p_months integer, p_currency character varying) to "service_role";

grant execute on function "public"."get_wealth_evolution_v2"(p_months integer, p_currency character varying) to "authenticated";

grant execute on function "public"."get_wealth_evolution_v2"(p_months integer, p_currency character varying) to "service_role";

grant execute on function "public"."handle_auto_connection"() to "service_role";

grant execute on function "public"."handle_family_invitation_accepted"() to "service_role";

grant execute on function "public"."handle_family_invitation_change"() to "service_role";

grant execute on function "public"."handle_family_member_removed"() to "service_role";

grant execute on function "public"."handle_new_family_owner_member"() to "service_role";

grant execute on function "public"."handle_new_user"() to "service_role";

grant execute on function "public"."handle_trip_invitation_accepted"() to "service_role";

grant execute on function "public"."handle_trip_invitation_change"() to "service_role";

grant execute on function "public"."handle_trip_invitation_response"() to "service_role";

grant execute on function "public"."is_admin"() to "authenticated";

grant execute on function "public"."is_admin"() to "service_role";

grant execute on function "public"."is_family_member_v2"(p_family_id uuid, p_user_id uuid) to "authenticated";

grant execute on function "public"."is_family_member_v2"(p_family_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."is_trip_member"(trip_id_param uuid, user_id_param uuid) to "authenticated";

grant execute on function "public"."is_trip_member"(trip_id_param uuid, user_id_param uuid) to "service_role";

grant execute on function "public"."log_balance_change"() to "service_role";

grant execute on function "public"."log_transaction_deletion"() to "service_role";

grant execute on function "public"."mark_as_paid_by_debtor"(p_split_id uuid, p_settlement_tx_id uuid) to "service_role";

grant execute on function "public"."mark_as_received_by_creditor"(p_split_id uuid, p_settlement_tx_id uuid) to "service_role";

grant execute on function "public"."migrate_transactions_to_account"(p_from_account_id uuid, p_to_account_id uuid, p_user_id uuid) to "authenticated";

grant execute on function "public"."migrate_transactions_to_account"(p_from_account_id uuid, p_to_account_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."notify_shared_expense"() to "service_role";

grant execute on function "public"."permanent_delete_old_records"() to "service_role";

grant execute on function "public"."prevent_delete_if_has_transactions"() to "service_role";

grant execute on function "public"."process_credit_card_invoices"() to "authenticated";

grant execute on function "public"."process_credit_card_invoices"() to "service_role";

grant execute on function "public"."process_daily_yields"() to "service_role";

grant execute on function "public"."reactivate_family_member"(p_member_id uuid) to "authenticated";

grant execute on function "public"."reactivate_family_member"(p_member_id uuid) to "service_role";

grant execute on function "public"."reactivate_trip_member"(p_member_id uuid) to "authenticated";

grant execute on function "public"."reactivate_trip_member"(p_member_id uuid) to "service_role";

grant execute on function "public"."recalculate_account_balance"(p_account_id uuid) to "service_role";

grant execute on function "public"."recalculate_all_balances"(p_user_id uuid) to "authenticated";

grant execute on function "public"."recalculate_all_balances"(p_user_id uuid) to "service_role";

grant execute on function "public"."reject_settlement_request"(p_split_id uuid, p_reason text) to "service_role";

grant execute on function "public"."remove_family_member"(p_member_id uuid, p_removed_by uuid, p_reason text) to "authenticated";

grant execute on function "public"."remove_family_member"(p_member_id uuid, p_removed_by uuid, p_reason text) to "service_role";

grant execute on function "public"."remove_trip_member"(p_member_id uuid, p_removed_by uuid, p_reason text) to "authenticated";

grant execute on function "public"."remove_trip_member"(p_member_id uuid, p_removed_by uuid, p_reason text) to "service_role";

grant execute on function "public"."request_settlement"(p_split_ids uuid[], p_account_id uuid, p_user_id uuid, p_is_payment boolean, p_amount numeric) to "service_role";

grant execute on function "public"."request_settlement_confirmation"(p_split_ids uuid[], p_debtor_id uuid, p_creditor_id uuid, p_amount numeric, p_currency text) to "service_role";

grant execute on function "public"."request_settlement_v2"(p_split_ids uuid[], p_account_id uuid, p_is_payment boolean, p_amount numeric) to "authenticated";

grant execute on function "public"."request_settlement_v2"(p_split_ids uuid[], p_account_id uuid, p_is_payment boolean, p_amount numeric) to "service_role";

grant execute on function "public"."resolve_error_report"(p_report_id uuid) to "authenticated";

grant execute on function "public"."resolve_error_report"(p_report_id uuid) to "service_role";

grant execute on function "public"."restore_transaction"(p_transaction_id uuid) to "authenticated";

grant execute on function "public"."restore_transaction"(p_transaction_id uuid) to "service_role";

grant execute on function "public"."search_transactions"(p_query text, p_limit integer) to "authenticated";

grant execute on function "public"."search_transactions"(p_query text, p_limit integer) to "service_role";

grant execute on function "public"."seed_default_categories"(p_user_id uuid) to "service_role";

grant execute on function "public"."set_credit_card_competence_date"() to "service_role";

grant execute on function "public"."set_pin"(p_pin text, p_require_on_open boolean) to "authenticated";

grant execute on function "public"."set_pin"(p_pin text, p_require_on_open boolean) to "service_role";

grant execute on function "public"."set_transaction_currency_from_account"() to "service_role";

grant execute on function "public"."settle_balance_between_users"(p_user1_id uuid, p_user2_id uuid, p_settlement_transaction_id uuid) to "service_role";

grant execute on function "public"."settle_compensated_splits"(p_split_ids uuid[]) to "authenticated";

grant execute on function "public"."settle_compensated_splits"(p_split_ids uuid[]) to "service_role";

grant execute on function "public"."settle_multiple_splits"(p_split_ids uuid[], p_account_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."settle_partial_balance"(p_user1_id uuid, p_user2_id uuid, p_amount numeric, p_currency text, p_settlement_transaction_id uuid) to "service_role";

grant execute on function "public"."settle_split"(p_split_id uuid, p_amount numeric, p_account_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."soft_delete_account"(p_account_id uuid) to "authenticated";

grant execute on function "public"."soft_delete_account"(p_account_id uuid) to "service_role";

grant execute on function "public"."soft_delete_transaction"(p_transaction_id uuid, p_cascade text) to "authenticated";

grant execute on function "public"."soft_delete_transaction"(p_transaction_id uuid, p_cascade text) to "service_role";

grant execute on function "public"."submit_error_report"(p_error_message text, p_stack_trace text, p_context text) to "authenticated";

grant execute on function "public"."submit_error_report"(p_error_message text, p_stack_trace text, p_context text) to "service_role";

grant execute on function "public"."suggest_payment_plan"(p_debtor_user_id uuid, p_creditor_user_id uuid, p_monthly_payment numeric, p_currency text) to "service_role";

grant execute on function "public"."sync_is_settled"() to "service_role";

grant execute on function "public"."sync_profile_to_family_members"() to "service_role";

grant execute on function "public"."sync_transaction_settled_status"() to "service_role";

grant execute on function "public"."test_cascade_delete"() to "service_role";

grant execute on function "public"."transfer_between_accounts"(p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_description text, p_date date, p_exchange_rate numeric, p_destination_amount numeric) to "authenticated";

grant execute on function "public"."transfer_between_accounts"(p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_description text, p_date date, p_exchange_rate numeric, p_destination_amount numeric) to "service_role";

grant execute on function "public"."trigger_seed_default_categories"() to "service_role";

grant execute on function "public"."undo_settlement"(p_split_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."undo_settlement_v2"(p_split_id uuid) to "authenticated";

grant execute on function "public"."undo_settlement_v2"(p_split_id uuid) to "service_role";

grant execute on function "public"."undo_shared_settlements"(p_split_ids uuid[]) to "authenticated";

grant execute on function "public"."undo_shared_settlements"(p_split_ids uuid[]) to "service_role";

grant execute on function "public"."unsettle_multiple_splits"(p_split_ids uuid[]) to "service_role";

grant execute on function "public"."unsettle_split"(p_split_id uuid) to "service_role";

grant execute on function "public"."update_account_balance_on_delete"() to "service_role";

grant execute on function "public"."update_account_balance_on_insert"() to "service_role";

grant execute on function "public"."update_account_balance_on_update"() to "service_role";

grant execute on function "public"."update_family_invitations_updated_at"() to "service_role";

grant execute on function "public"."update_shared_competence_after_split"() to "service_role";

grant execute on function "public"."update_updated_at_column"() to "service_role";

grant execute on function "public"."user_can_view_trip"(p_trip_id uuid, p_user_id uuid) to "authenticated";

grant execute on function "public"."user_can_view_trip"(p_trip_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."user_is_trip_member"(p_trip_id uuid, p_user_id uuid) to "authenticated";

grant execute on function "public"."user_is_trip_member"(p_trip_id uuid, p_user_id uuid) to "service_role";

grant execute on function "public"."validate_shared_transaction"() to "service_role";

grant execute on function "public"."verify_pin"(p_pin text) to "authenticated";

grant execute on function "public"."verify_pin"(p_pin text) to "service_role";

grant execute on function "public"."withdraw_from_account"(p_account_id uuid, p_amount numeric, p_description text, p_date date) to "authenticated";

grant execute on function "public"."withdraw_from_account"(p_account_id uuid, p_amount numeric, p_description text, p_date date) to "service_role";

alter default privileges in schema public revoke execute on functions from public;

alter default privileges in schema private revoke execute on functions from public;
