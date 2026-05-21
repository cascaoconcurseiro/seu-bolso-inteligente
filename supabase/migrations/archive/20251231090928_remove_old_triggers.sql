-- FASE 2: Limpeza de triggers conflitantes

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
DROP FUNCTION IF EXISTS public.mirror_shared_transaction() CASCADE;;
