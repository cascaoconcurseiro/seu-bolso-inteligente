-- ============================================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE COMPARTILHAMENTO
-- Data: 31/12/2024 09:15 BRT
-- Ambiente: Produção (Supabase Hosted)
-- ============================================================================

-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- Este script irá:
-- 1. Remover dados duplicados (splits, mirrors, ledger)
-- 2. Remover triggers conflitantes
-- 3. Remover funções antigas
-- 4. Manter apenas os triggers corretos

BEGIN;

-- ============================================================================
-- FASE 1: LIMPEZA DE DADOS DUPLICADOS
-- ============================================================================

-- 1.1. Remover splits duplicados
-- Mantém apenas o primeiro split de cada grupo (por transaction_id, member_id, user_id, amount)
DELETE FROM public.transaction_splits
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY transaction_id, member_id, user_id, amount 
        ORDER BY created_at ASC
      ) as rn
    FROM public.transaction_splits
  ) t 
  WHERE rn > 1
);

-- 1.2. Remover transações espelhadas duplicadas
-- Mantém apenas a primeira transação espelhada de cada grupo (por source_transaction_id, user_id)
DELETE FROM public.transactions
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY source_transaction_id, user_id 
        ORDER BY created_at ASC
      ) as rn
    FROM public.transactions
    WHERE source_transaction_id IS NOT NULL
  ) t 
  WHERE rn > 1
);

-- 1.3. Remover entradas de ledger duplicadas
-- Mantém apenas a primeira entrada de cada grupo (por transaction_id, user_id, entry_type, related_user_id, amount)
DELETE FROM public.financial_ledger
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY transaction_id, user_id, entry_type, COALESCE(related_user_id::text, 'NULL'), amount 
        ORDER BY created_at ASC
      ) as rn
    FROM public.financial_ledger
  ) t 
  WHERE rn > 1
);

-- ============================================================================
-- FASE 2: LIMPEZA DE TRIGGERS CONFLITANTES
-- ============================================================================

-- 2.1. Remover triggers antigos que causam duplicação
DROP TRIGGER IF EXISTS trg_transaction_mirroring ON public.transactions;
DROP TRIGGER IF EXISTS trg_update_mirrored_transactions_on_update ON public.transactions;
DROP TRIGGER IF EXISTS trigger_create_mirrors_on_insert ON public.transactions;
DROP TRIGGER IF EXISTS trigger_mirror_shared_transaction ON public.transactions;
DROP TRIGGER IF EXISTS trg_create_mirror_transaction ON public.transactions;

-- 2.2. Remover funções antigas
DROP FUNCTION IF EXISTS public.handle_transaction_mirroring() CASCADE;
DROP FUNCTION IF EXISTS public.update_mirrored_transactions_on_transaction_update() CASCADE;
DROP FUNCTION IF EXISTS public.create_mirror_transactions() CASCADE;
DROP FUNCTION IF EXISTS public.mirror_shared_transaction() CASCADE;

-- ============================================================================
-- FASE 3: VERIFICAÇÃO DOS TRIGGERS CORRETOS
-- ============================================================================

-- Verificar se os triggers corretos existem
-- Se não existirem, serão criados pela migration 20251231000002

-- Triggers esperados:
-- 1. trg_fill_split_user_id (INSERT/UPDATE on transaction_splits)
-- 2. trg_create_ledger_on_split (INSERT on transaction_splits)
-- 3. trg_create_mirrored_transaction_on_split (INSERT on transaction_splits)
-- 4. trg_delete_mirrored_transaction_on_split_delete (DELETE on transaction_splits)

-- ============================================================================
-- FASE 4: VERIFICAÇÃO FINAL
-- ============================================================================

-- 4.1. Contar splits por transação (deve ser 1 por membro)
SELECT 
  transaction_id,
  member_id,
  COUNT(*) as split_count,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICADO'
    ELSE '✅ OK'
  END as status
FROM public.transaction_splits
GROUP BY transaction_id, member_id
HAVING COUNT(*) > 1;

-- 4.2. Contar transações espelhadas por source (deve ser 1 por usuário)
SELECT 
  source_transaction_id,
  user_id,
  COUNT(*) as mirror_count,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICADO'
    ELSE '✅ OK'
  END as status
FROM public.transactions
WHERE source_transaction_id IS NOT NULL
GROUP BY source_transaction_id, user_id
HAVING COUNT(*) > 1;

-- 4.3. Contar entradas de ledger por transação (deve ser consistente)
SELECT 
  transaction_id,
  user_id,
  entry_type,
  related_user_id,
  COUNT(*) as ledger_count,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICADO'
    ELSE '✅ OK'
  END as status
FROM public.financial_ledger
GROUP BY transaction_id, user_id, entry_type, related_user_id
HAVING COUNT(*) > 1;

-- 4.4. Listar triggers ativos
SELECT 
  trigger_name,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE '%mirror%' 
    OR trigger_name LIKE '%split%'
    OR trigger_name LIKE '%shared%'
  )
ORDER BY event_object_table, trigger_name;

COMMIT;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================

-- Após executar este script, você deve ver:
-- ✅ 0 splits duplicados
-- ✅ 0 transações espelhadas duplicadas
-- ✅ 0 entradas de ledger duplicadas
-- ✅ 6 triggers corretos (4 em transaction_splits, 0 em transactions)

-- ============================================================================
-- PRÓXIMO PASSO
-- ============================================================================

-- 1. Recarregar a página "Compartilhados" no frontend
-- 2. Verificar se os valores estão corretos
-- 3. Criar uma nova despesa compartilhada de teste
-- 4. Verificar se não há duplicação

-- ============================================================================
-- ROLLBACK (SE NECESSÁRIO)
-- ============================================================================

-- Se algo der errado, execute:
-- ROLLBACK;

-- E restaure o backup do banco de dados
