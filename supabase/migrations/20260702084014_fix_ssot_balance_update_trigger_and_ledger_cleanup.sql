-- ============================================================
-- FASE 1 do plano de reorganizacao SSOT (2026-07-01)
-- 1) Trigger de UPDATE que faltava para recalculo de saldo
-- 2) Remocao definitiva de financial_ledger (ressuscitada por engano em 20260702120000)
-- 3) Remocao de 3 funcoes de saldo orfas (sem trigger, sem RPC, sem cron chamando)
-- ============================================================

-- 1. Funcao de recalculo para UPDATE em transactions (mesma familia das triggers de INSERT/DELETE)
CREATE OR REPLACE FUNCTION public.update_account_balance_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF OLD.account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(OLD.account_id);
  END IF;

  IF NEW.account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(NEW.account_id);
  END IF;

  IF OLD.destination_account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(OLD.destination_account_id);
  END IF;

  IF NEW.destination_account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(NEW.destination_account_id);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_update_balance_update ON public.transactions;
CREATE TRIGGER trg_update_balance_update
AFTER UPDATE ON public.transactions
FOR EACH ROW
WHEN (
  OLD.amount IS DISTINCT FROM NEW.amount
  OR OLD.type IS DISTINCT FROM NEW.type
  OR OLD.account_id IS DISTINCT FROM NEW.account_id
  OR OLD.destination_account_id IS DISTINCT FROM NEW.destination_account_id
  OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
  OR OLD.date IS DISTINCT FROM NEW.date
  OR OLD.payer_id IS DISTINCT FROM NEW.payer_id
)
EXECUTE FUNCTION public.update_account_balance_on_update();

-- 2. Remover financial_ledger de vez: trigger + funcao + tabela, na mesma transacao
DROP TRIGGER IF EXISTS trg_create_ledger_on_transaction ON public.transactions;
DROP FUNCTION IF EXISTS public.create_ledger_entries_for_transaction();
DROP TABLE IF EXISTS public.financial_ledger CASCADE;

-- 3. Remover as 3 funcoes de saldo orfas (confirmado: sem trigger, sem RPC do frontend, sem cron job)
DROP FUNCTION IF EXISTS public.recalculate_all_account_balances();
DROP FUNCTION IF EXISTS public.sync_account_balance();
DROP FUNCTION IF EXISTS public.calculate_account_balance(uuid);
