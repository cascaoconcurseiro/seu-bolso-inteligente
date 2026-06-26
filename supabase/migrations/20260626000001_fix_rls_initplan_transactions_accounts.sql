-- Fix auth_rls_initplan warnings on transactions and accounts
-- Using (SELECT auth.uid()) ensures auth.uid() is evaluated once per query,
-- not once per row — major performance improvement on large tables.

-- ACCOUNTS
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
CREATE POLICY "Users can update own accounts" ON public.accounts
  FOR UPDATE USING (
    user_id = (SELECT auth.uid()) AND deleted_at IS NULL
  );

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (
    user_id = (SELECT auth.uid())
    AND source_transaction_id IS NULL
    AND deleted_at IS NULL
  );
