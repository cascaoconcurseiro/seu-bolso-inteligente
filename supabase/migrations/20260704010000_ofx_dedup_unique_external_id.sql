-- Deduplicação server-side de importação OFX
-- A dedup atual é feita em memória no frontend (compara com transações
-- carregadas); importar o mesmo arquivo em sessões diferentes podia duplicar.
-- Este índice único parcial garante a invariante no banco.

-- 1. Soft-deletar duplicatas pré-existentes (mantém a mais antiga de cada grupo)
WITH dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, account_id, external_id
           ORDER BY created_at
         ) AS rn
  FROM public.transactions
  WHERE external_id IS NOT NULL
    AND deleted_at IS NULL
)
UPDATE public.transactions t
SET deleted_at = now()
FROM dupes d
WHERE t.id = d.id
  AND d.rn > 1;

-- 2. Índice único parcial: um FITID por usuário+conta entre transações vivas
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_user_account_external_id
  ON public.transactions (user_id, account_id, external_id)
  WHERE external_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON INDEX public.uq_transactions_user_account_external_id IS
  'Dedup de importação OFX: FITID único por usuário+conta (transações não deletadas)';
