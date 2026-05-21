-- =====================================================
-- MIGRATION: Implementar Soft Delete
-- Data: 2026-01-01
-- Descrição: Adiciona soft delete para proteção de dados
-- =====================================================

-- 1. ADICIONAR COLUNAS deleted_at
-- =====================================================

ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.transaction_splits 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.budgets 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at 
  ON public.transactions(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at 
  ON public.accounts(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_splits_deleted_at 
  ON public.transaction_splits(deleted_at) WHERE deleted_at IS NULL;

-- 3. ATUALIZAR POLÍTICAS RLS
-- =====================================================

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (user_id = auth.uid() AND source_transaction_id IS NULL AND deleted_at IS NULL);

-- ACCOUNTS
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
CREATE POLICY "Users can update own accounts" ON public.accounts
  FOR UPDATE USING (user_id = auth.uid() AND deleted_at IS NULL);

-- TRANSACTION_SPLITS
DROP POLICY IF EXISTS "Users can view own splits" ON public.transaction_splits;
CREATE POLICY "Users can view own splits" ON public.transaction_splits
  FOR SELECT USING (
    (transaction_id IN (SELECT id FROM public.transactions WHERE user_id = auth.uid() AND deleted_at IS NULL)
    OR user_id = auth.uid())
    AND deleted_at IS NULL
  );

-- CATEGORIES
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

-- 4. FUNÇÕES DE SOFT DELETE
-- =====================================================

CREATE OR REPLACE FUNCTION public.soft_delete_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  -- Soft delete da transação
  UPDATE transactions 
  SET 
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = p_transaction_id
    AND user_id = auth.uid()
    AND source_transaction_id IS NULL;
  
  -- Soft delete dos splits
  UPDATE transaction_splits
  SET 
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE transaction_id = p_transaction_id;
  
  -- Soft delete das transações espelhadas
  UPDATE transactions
  SET 
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE source_transaction_id = p_transaction_id;
END;
$;

CREATE OR REPLACE FUNCTION public.soft_delete_account(p_account_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  -- Verificar se conta pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM accounts 
    WHERE id = p_account_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Conta não encontrada ou sem permissão';
  END IF;
  
  -- Soft delete da conta
  UPDATE accounts 
  SET 
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = p_account_id;
  
  -- Soft delete das transações associadas
  UPDATE transactions
  SET 
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND deleted_at IS NULL;
END;
$;

CREATE OR REPLACE FUNCTION public.restore_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
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
$;

-- 5. FUNÇÃO DE LIMPEZA PERMANENTE (HARD DELETE)
-- =====================================================

CREATE OR REPLACE FUNCTION public.permanent_delete_old_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
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
$;

-- 6. COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN transactions.deleted_at IS 'Data de soft delete. NULL = ativo';
COMMENT ON COLUMN transactions.deleted_by IS 'Usuário que deletou';
COMMENT ON FUNCTION soft_delete_transaction IS 'Soft delete de transação e dados relacionados';
COMMENT ON FUNCTION soft_delete_account IS 'Soft delete de conta e transações associadas';
COMMENT ON FUNCTION restore_transaction IS 'Restaura transação soft-deleted';
COMMENT ON FUNCTION permanent_delete_old_records IS 'Hard delete de registros soft-deleted há mais de 90 dias';

