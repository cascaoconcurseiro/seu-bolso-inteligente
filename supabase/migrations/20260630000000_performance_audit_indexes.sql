-- =====================================================
-- MIGRATION: Performance Audit Fixes (2026-06-30)
-- Corrige índices críticos identificados na auditoria
-- =====================================================

-- 1. ÍNDICE COMPOSTO PARA useTransactions (QUERY MAIS QUENTE DO SISTEMA)
-- Cobre: user_id + date range + ORDER BY date/created_at DESC
-- Filtra: deleted_at IS NULL e status != 'PENDING'
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_active
  ON public.transactions(user_id, date DESC, created_at DESC)
  WHERE deleted_at IS NULL AND status IS DISTINCT FROM 'PENDING';

-- 2. ÍNDICE PARA DUPLICATE CHECK EM useCreateTransaction
-- Cobre: user_id + amount + description + date + created_at
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_check
  ON public.transactions(user_id, amount, description, date, created_at DESC)
  WHERE deleted_at IS NULL;

-- 3. ANÁLISE: Atualizar estatísticas do planner
-- =====================================================
ANALYZE public.transactions;
