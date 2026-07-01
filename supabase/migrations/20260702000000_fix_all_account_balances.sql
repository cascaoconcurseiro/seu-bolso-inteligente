-- Emergency fix: Recalculate ALL account balances to fix stale/corrupted balances.
-- The update_account_balance_on_insert and update_account_balance_on_delete triggers
-- were broken (search_path bug) and only recently fixed. This forces a full recalculation.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.accounts LOOP
    PERFORM public.recalculate_account_balance(r.id);
  END LOOP;
END;
$$;
