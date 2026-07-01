-- Force recalculate all account balances to fix drift after soft-deletes.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.accounts LOOP
    PERFORM public.recalculate_account_balance(r.id);
  END LOOP;
END;
$$;
