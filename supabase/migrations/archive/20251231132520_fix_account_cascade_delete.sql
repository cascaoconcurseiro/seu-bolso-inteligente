-- Corrigir deleção em cascata de transações quando conta é deletada
-- Data: 2024-12-31
-- Problema: Ao deletar conta internacional, transações ficam órfãs (account_id = NULL)
-- Solução: Alterar foreign key para ON DELETE CASCADE

-- ============================================================================
-- 1. REMOVER CONSTRAINT ANTIGA
-- ============================================================================

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_destination_account_id_fkey;

-- ============================================================================
-- 2. ADICIONAR CONSTRAINTS COM CASCADE
-- ============================================================================

-- account_id: Deletar transações quando conta origem é deletada
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES public.accounts(id)
  ON DELETE CASCADE;

-- destination_account_id: Deletar transações quando conta destino é deletada
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_destination_account_id_fkey
  FOREIGN KEY (destination_account_id)
  REFERENCES public.accounts(id)
  ON DELETE CASCADE;

-- ============================================================================
-- 3. COMENTÁRIOS
-- ============================================================================

COMMENT ON CONSTRAINT transactions_account_id_fkey ON public.transactions IS 
'Deleta transações em cascata quando conta origem é deletada. Evita transações órfãs.';

COMMENT ON CONSTRAINT transactions_destination_account_id_fkey ON public.transactions IS 
'Deleta transações em cascata quando conta destino é deletada. Evita transações órfãs.';

-- ============================================================================
-- 4. LIMPAR TRANSAÇÕES ÓRFÃS EXISTENTES
-- ============================================================================

-- Deletar transações que já estão órfãs (account_id NULL e não é transferência)
DELETE FROM public.transactions
WHERE account_id IS NULL
  AND destination_account_id IS NULL;

-- Deletar transações onde a conta não existe mais
DELETE FROM public.transactions t
WHERE t.account_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = t.account_id);

DELETE FROM public.transactions t
WHERE t.destination_account_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = t.destination_account_id);;
