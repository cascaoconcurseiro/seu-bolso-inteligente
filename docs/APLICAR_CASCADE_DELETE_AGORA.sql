-- ============================================================================
-- APLICAR AGORA: Correção de Deleção em Cascata
-- ============================================================================
-- Execute este script no Supabase Dashboard > SQL Editor
-- Isso vai fazer com que transações sejam deletadas automaticamente quando
-- a conta for deletada
-- ============================================================================

-- 1. REMOVER CONSTRAINTS ANTIGAS
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_destination_account_id_fkey;

-- 2. ADICIONAR CONSTRAINTS COM CASCADE
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES public.accounts(id)
  ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_destination_account_id_fkey
  FOREIGN KEY (destination_account_id)
  REFERENCES public.accounts(id)
  ON DELETE CASCADE;

-- 3. LIMPAR TRANSAÇÕES ÓRFÃS EXISTENTES
-- Deletar transações que já estão órfãs
DELETE FROM public.transactions
WHERE account_id IS NULL
  AND destination_account_id IS NULL;

-- Deletar transações onde a conta não existe mais
DELETE FROM public.transactions t
WHERE t.account_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = t.account_id);

DELETE FROM public.transactions t
WHERE t.destination_account_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = t.destination_account_id);

-- 4. VERIFICAR RESULTADO
SELECT 
  'Transações órfãs limpas' as status,
  COUNT(*) as total_limpas
FROM public.transactions
WHERE account_id IS NULL AND destination_account_id IS NULL;

-- Pronto! Agora ao deletar uma conta, as transações serão deletadas automaticamente
