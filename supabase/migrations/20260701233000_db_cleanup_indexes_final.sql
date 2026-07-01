-- ============================================================================
-- MIGRATION: Audit Final — Indexes + Missing Infrastructure
-- Date: 2026-07-01
-- ============================================================================
-- 1. Add missing indexes (budgets.user_id, trip_checklist.trip_id)
-- 2. Drop duplicate indexes (family_members)
-- 3. Drop index on dropped table (financial_ledger — leftover)
-- 4. Add missing FK indexes
-- 5. ANALYZE all tables
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Missing critical indexes
-- ============================================================================

-- 1a. budgets — toda query filtra por user_id, sem índice = full scan
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id)
  WHERE deleted_at IS NULL;

-- 1b. trip_checklist — toda query filtra por trip_id
CREATE INDEX IF NOT EXISTS idx_trip_checklist_trip_id ON public.trip_checklist(trip_id);

-- 1c. trip_itinerary — filtrado por trip_id
CREATE INDEX IF NOT EXISTS idx_trip_itinerary_trip_id ON public.trip_itinerary(trip_id);

-- 1d. trip_exchange_purchases — filtrado por trip_id + user_id
CREATE INDEX IF NOT EXISTS idx_trip_exchange_purchases_trip_id ON public.trip_exchange_purchases(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_exchange_purchases_user_id ON public.trip_exchange_purchases(user_id);

-- 1e. credit_card_closing_overrides — filtrado por account_id
CREATE INDEX IF NOT EXISTS idx_credit_card_closing_overrides_account_id ON public.credit_card_closing_overrides(account_id);

-- 1f. notification_preferences — filtrado por user_id
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- 1g. asset_transactions — filtrado por asset_id + user_id
CREATE INDEX IF NOT EXISTS idx_asset_transactions_asset_id ON public.asset_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_user_id ON public.asset_transactions(user_id);

-- ============================================================================
-- PHASE 2: Drop duplicate/redundant indexes
-- ============================================================================

-- 2a. family_members: idx_family_members_family_active e idx_family_members_status_active
--     são quase idênticos (ambos: family_id, status WHERE status='active')
--     Mantemos idx_family_members_family_active (criado primeiro, 20260101000006)
DROP INDEX IF EXISTS public.idx_family_members_status_active;

-- 2b. financial_ledger indexes — a tabela foi dropada, mas índices criados depois
--     da migration de drop (20260630230002) ainda existem. Removê-los.
--     (financial_ledger foi dropada em 20260630235900)
DROP INDEX IF EXISTS public.idx_financial_ledger_related_member_id;
DROP INDEX IF EXISTS public.idx_financial_ledger_settlement_transaction_id;
DROP INDEX IF EXISTS public.idx_financial_ledger_transaction;
DROP INDEX IF EXISTS public.idx_financial_ledger_user;
DROP INDEX IF EXISTS public.idx_fl_related_user;
DROP INDEX IF EXISTS public.idx_fl_related_member;
DROP INDEX IF EXISTS public.idx_ledger_user_related_unsettled;
DROP INDEX IF EXISTS public.idx_ledger_currency;

-- ============================================================================
-- PHASE 3: ANALYZE — atualizar estatísticas do planner
-- ============================================================================

ANALYZE public.transactions;
ANALYZE public.accounts;
ANALYZE public.transaction_splits;
ANALYZE public.budgets;
ANALYZE public.goals;
ANALYZE public.assets;
ANALYZE public.family_members;
ANALYZE public.trips;
ANALYZE public.trip_members;
ANALYZE public.notifications;
ANALYZE public.audit_log;

COMMIT;
