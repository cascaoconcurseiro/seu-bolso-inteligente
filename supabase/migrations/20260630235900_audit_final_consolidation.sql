-- =====================================================
-- MIGRATION: Auditoria 2026-06-30 — Consolidação Final
-- 1. Índices de performance (já criados, IF NOT EXISTS)
-- 2. Drop financial_ledger (tabela órfã, 252 rows legacy)
-- =====================================================

-- 1. ÍNDICE COMPOSTO PARA useTransactions (QUERY MAIS QUENTE DO SISTEMA)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_active
  ON public.transactions(user_id, date DESC, created_at DESC)
  WHERE deleted_at IS NULL AND status IS DISTINCT FROM 'PENDING';

-- 2. ÍNDICE PARA DUPLICATE CHECK EM useCreateTransaction
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_check
  ON public.transactions(user_id, amount, description, date, created_at DESC)
  WHERE deleted_at IS NULL;

-- 3. Atualizar estatísticas do planner
ANALYZE public.transactions;

-- 4. AUD-07: Drop financial_ledger
-- Tabela órfã — zero referências no frontend, substituída por transaction_splits
-- Trigger de audit nunca dispara (ninguém escreve nela)
-- 252 registros são dados legacy sem valor
DROP TABLE IF EXISTS public.financial_ledger CASCADE;
