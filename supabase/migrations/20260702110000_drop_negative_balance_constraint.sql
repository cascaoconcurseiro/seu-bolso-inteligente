-- Remove a constraint que impedia saldo negativo temporário em conta corrente
BEGIN;

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS chk_no_negative_balance_non_credit;

COMMIT;
