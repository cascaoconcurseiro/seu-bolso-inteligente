-- Causa raiz do erro 42P01 "relation public.financial_ledger does not exist":
-- A tabela financial_ledger foi dropada na Fase 1 (SSOT cleanup), mas a trigger
-- trg_create_ledger_on_split na tabela transaction_splits sobreviveu, junto com
-- 3 funções que a referenciam. Toda INSERT em transaction_splits falhava.

-- 1. Drop da trigger que dispara ao inserir splits
DROP TRIGGER IF EXISTS trg_create_ledger_on_split ON transaction_splits;

-- 2. Drop das funções órfãs que referenciam financial_ledger
DROP FUNCTION IF EXISTS public.create_ledger_entries_for_split();
DROP FUNCTION IF EXISTS public.calculate_balance_between_users(uuid, uuid);
DROP FUNCTION IF EXISTS public.settle_balance_between_users(uuid, uuid, numeric, text, uuid);

NOTIFY pgrst, 'reload schema';
