-- ============================================================================
-- Fix: recria financial_ledger que foi dropada mas ainda tem trigger ativo
-- Dropada em 20260630235900/20260701235900, mas trigger orphan no transactions
-- não foi removido e quebra qualquer INSERT de transação compartilhada
-- ============================================================================

BEGIN;

-- Recriar a tabela para o trigger não quebrar
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  entry_type TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  description TEXT,
  category TEXT,
  related_user_id UUID,
  related_member_id UUID,
  is_settled BOOLEAN DEFAULT false,
  settlement_transaction_id UUID,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
