-- FASE 1: Limpeza de dados duplicados

-- 1.1. Remover splits duplicados
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
);;
