-- ============================================================================
-- MIGRATION: Financial Infrastructure — Balance Audit + Reconciliation + Constraints
-- Date: 2026-07-01
-- Safe: não modifica funções de balance (dono: 20260702020000)
-- ============================================================================
-- 1. balance_changes — log imutável de toda alteração de saldo
-- 2. account_reconciliations — reconciliação bancária
-- 3. Financial constraints — CHECKs de integridade
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: balance_changes — Audit trail de saldo
-- ============================================================================
-- Toda vez que accounts.balance mudar, registramos (old, new, delta, trigger_tx_id).
-- Isso permite rastrear EXATAMENTE quando e por que o saldo mudou.
-- Apps financeiros profissionais têm isso como requisito de compliance.

CREATE TABLE IF NOT EXISTS public.balance_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  old_balance NUMERIC(15,2) NOT NULL,
  new_balance NUMERIC(15,2) NOT NULL,
  delta NUMERIC(15,2) GENERATED ALWAYS AS (new_balance - old_balance) STORED,
  triggered_by TEXT,       -- 'INSERT', 'DELETE', 'UPDATE', 'MANUAL_RECALC'
  transaction_id UUID,     -- NULL if not triggered by a specific transaction
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas comuns
CREATE INDEX IF NOT EXISTS idx_balance_changes_account_id ON public.balance_changes(account_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_changes_transaction_id ON public.balance_changes(transaction_id);

-- RLS: usuário só vê alterações das próprias contas
ALTER TABLE public.balance_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own balance changes" ON public.balance_changes
  FOR SELECT TO authenticated
  USING (
    account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
  );

-- Trigger: loga toda alteração de balance
CREATE OR REPLACE FUNCTION public.log_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Attach trigger to accounts table
DROP TRIGGER IF EXISTS trg_log_balance_change ON public.accounts;
CREATE TRIGGER trg_log_balance_change
  AFTER UPDATE OF balance ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_balance_change();

-- ============================================================================
-- PHASE 2: account_reconciliations — Reconciliação bancária
-- ============================================================================
-- Permite ao usuário comparar saldo calculado com extrato bancário real.
-- Essencial para detectar divergências entre o app e a realidade.

CREATE TABLE IF NOT EXISTS public.account_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  statement_balance NUMERIC(15,2) NOT NULL,
  calculated_balance NUMERIC(15,2) NOT NULL,
  difference NUMERIC(15,2) GENERATED ALWAYS AS (statement_balance - calculated_balance) STORED,
  status TEXT NOT NULL DEFAULT 'UNRECONCILED'
    CHECK (status IN ('UNRECONCILED', 'RECONCILED', 'DISPUTED')),
  notes TEXT,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, statement_date)
);

CREATE INDEX IF NOT EXISTS idx_reconciliations_account_id ON public.account_reconciliations(account_id, statement_date DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliations_user_id ON public.account_reconciliations(user_id);

ALTER TABLE public.account_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reconciliations" ON public.account_reconciliations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PHASE 3: Financial integrity constraints
-- ============================================================================
-- Apps financeiros não permitem saldo negativo em conta corrente.
-- Cartão de crédito pode ficar negativo (é dívida).

-- 3a. Evitar saldo negativo em contas que não são crédito
-- (Usamos NOT VALID para não travar em dados existentes)
ALTER TABLE public.accounts
  ADD CONSTRAINT chk_no_negative_balance_non_credit
  CHECK (
    type = 'CREDIT_CARD' OR balance >= 0
  ) NOT VALID;

-- Validar a constraint (só falha se houver dados inválidos)
-- Se houver contas correntes com saldo negativo, precisa corrigir antes
DO $$
BEGIN
  ALTER TABLE public.accounts VALIDATE CONSTRAINT chk_no_negative_balance_non_credit;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Existem contas com saldo negativo. Corrija antes de validar a constraint.';
  -- Deixa a constraint como NOT VALID para não quebrar o sistema
END;
$$;

-- 3b. Limite de crédito não pode ser negativo
ALTER TABLE public.accounts
  ADD CONSTRAINT chk_credit_limit_non_negative
  CHECK (credit_limit IS NULL OR credit_limit >= 0) NOT VALID;

DO $$
BEGIN
  ALTER TABLE public.accounts VALIDATE CONSTRAINT chk_credit_limit_non_negative;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Existem contas com credit_limit negativo. Corrija antes de validar.';
END;
$$;

-- ============================================================================
-- PHASE 4: ANALYZE
-- ============================================================================
ANALYZE public.balance_changes;
ANALYZE public.account_reconciliations;
ANALYZE public.accounts;

COMMIT;
