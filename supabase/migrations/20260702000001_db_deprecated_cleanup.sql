-- ============================================================================
-- MIGRATION: Complete Cleanup — Deprecated Columns + Error Logs Fix
-- Date: 2026-07-01
-- ============================================================================
-- 1. DROP deprecated columns: transactions.reconciled(_at)(_by), accounts.deleted
-- 2. DROP orphan index: idx_transactions_reconciled_by
-- 3. DROP old get_admin_error_logs(admin_password text) overload
-- 4. Fix error_logs trigger (replace broken moddatetime with update_updated_at_column)
-- 5. ANALYZE affected tables
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Drop deprecated columns
-- ============================================================================

-- 1a. transactions.reconciled_* — NÃO podem ser dropadas porque a view
-- transactions_ssot (criada via SQL Editor) depende delas.
-- Sem o DDL exato da view, o DROP CASCADE quebraria o frontend.
-- Mantemos o COMMENT DEPRECATED e removemos numa futura migração baseline.
-- (os COMMENTs foram adicionados em 20260630170000)

-- 1b. accounts.deleted — redundante com deleted_at (timestamp soft-delete) e is_active
ALTER TABLE public.accounts
  DROP COLUMN IF EXISTS deleted;

-- ============================================================================
-- PHASE 2: Drop orphan index (mantido pois reconciled_by ainda existe)
-- ============================================================================
-- idx_transactions_reconciled_by ainda é necessário (coluna reconciled_by existe)

-- ============================================================================
-- PHASE 3: Drop old get_admin_error_logs overload
-- ============================================================================
-- A versão antiga (admin_password text) foi substituída pela versão sem params
-- que usa is_admin(). Remover o overload para evitar confusão.
DROP FUNCTION IF EXISTS public.get_admin_error_logs(text);

-- ============================================================================
-- PHASE 4: Fix error_logs updated_at trigger
-- ============================================================================
-- O trigger original usava handle_updated_at + moddatetime(updated_at),
-- ambos inexistentes no remote. Substituir por update_updated_at_column.

-- 4a. Remove broken trigger (if exists)
DROP TRIGGER IF EXISTS handle_updated_at ON public.error_logs;

-- 4b. Add correct trigger
DROP TRIGGER IF EXISTS trg_error_logs_updated_at ON public.error_logs;
CREATE TRIGGER trg_error_logs_updated_at
  BEFORE UPDATE ON public.error_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PHASE 5: ANALYZE affected tables
-- ============================================================================
ANALYZE public.transactions;
ANALYZE public.accounts;
ANALYZE public.error_logs;

COMMIT;
