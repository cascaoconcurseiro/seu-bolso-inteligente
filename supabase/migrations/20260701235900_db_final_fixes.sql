-- ============================================================================
-- MIGRATION: Final Fixes — Complete Database Professionalization
-- Date: 2026-07-01
-- Based on full remote database audit via run_audit_check()
-- ============================================================================
-- 1. DROP financial_ledger (still exists on remote — migration 20260630235900 failed silently)
-- 2. DROP duplicate weekly_audit_log_cleanup (monthly-audit-log-cleanup already exists)
-- 3. DROP trigger_sync_account_balance (double-counting with trg_update_balance_insert)
-- 4. ADD RLS policies to settlement_reversals (no policies at all)
-- 5. DOCUMENT error_logs schema mismatch (migration vs remote)
-- 6. DROP run_audit_check() temporary RPC
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Drop financial_ledger (REAL drop this time)
-- ============================================================================
-- Migration 20260630235900_audit_final_consolidation.sql claimed to drop it
-- but the table still exists on the remote with 2 RLS policies (INSERT, SELECT).
-- It also has trigger audit_financial_ledger which was dropped incorrectly.
-- CASCADE handles the policies and triggers.

DROP TABLE IF EXISTS public.financial_ledger CASCADE;

-- ============================================================================
-- PHASE 2: Remove duplicate audit_log cron job
-- ============================================================================
-- monthly-audit-log-cleanup (0 0 1 * *) already runs on 1st of every month.
-- weekly_audit_log_cleanup (0 3 * * 0) is redundant.
-- We keep the monthly one since it's more appropriate for a 90-day retention.

SELECT cron.unschedule('weekly_audit_log_cleanup')
FROM pg_extension
WHERE extname = 'pg_cron'
  AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly_audit_log_cleanup');

-- ============================================================================
-- PHASE 3: Drop trigger_sync_account_balance (double-counting)
-- ============================================================================
-- trigger_sync_account_balance fires AFTER INSERT on transactions and does a
-- full balance recalculation (O(n) per INSERT). trg_update_balance_insert
-- (created in migration 20260701220000) does incremental update (O(1)).
-- Having both = double update + wasted I/O.
-- The UPDATE case is already handled by trg_update_balance_update which
-- calls recalculate_account_balance when amount/type/account changes.

DROP TRIGGER IF EXISTS trigger_sync_account_balance ON public.transactions;

-- ============================================================================
-- PHASE 4: Add RLS policies to settlement_reversals
-- ============================================================================
-- settlement_reversals has RLS enabled but ZERO policies.
-- Frontend never reads this table directly — only via RPCs (SECURITY DEFINER).
-- But we still need policies for defense-in-depth.

-- 4a. SELECT: Users can see their own reversals
DROP POLICY IF EXISTS "Users can view own settlement reversals" ON public.settlement_reversals;
CREATE POLICY "Users can view own settlement reversals" ON public.settlement_reversals
  FOR SELECT TO authenticated
  USING (reversed_by = (SELECT auth.uid()));

-- 4b. INSERT: Users can create reversals for their own transactions
DROP POLICY IF EXISTS "Users can insert own settlement reversals" ON public.settlement_reversals;
CREATE POLICY "Users can insert own settlement reversals" ON public.settlement_reversals
  FOR INSERT TO authenticated
  WITH CHECK (reversed_by = (SELECT auth.uid()));

-- 4c. UPDATE/DELETE: Immutable — reversals cannot be modified after creation
DROP POLICY IF EXISTS "Settlement reversals are immutable" ON public.settlement_reversals;
CREATE POLICY "Settlement reversals are immutable" ON public.settlement_reversals
  FOR ALL TO authenticated
  USING (false);

-- ============================================================================
-- PHASE 5: Drop temporary audit RPC
-- ============================================================================
DROP FUNCTION IF EXISTS public.run_audit_check();

-- ============================================================================
-- PHASE 6: Document error_logs schema mismatch
-- ============================================================================
-- Migration 20260527135500_create_error_logs.sql defines:
--   error_name, error_message, component_stack, user_message
--
-- Remote database has (matching frontend types.ts):
--   error_type, message, stack, url, file, line, col,
--   user_agent, app_version, extra
--
-- The table was altered via SQL Editor after migration was applied.
-- The migration file does NOT reflect reality. If rebuilding from scratch,
-- the error_logs table must be created with the remote's column set.
--
-- TODO: Create a baseline migration that recreates all 19 SQL Editor tables
-- with their actual schemas. This is documented in CHECKLIST.md.

COMMIT;
