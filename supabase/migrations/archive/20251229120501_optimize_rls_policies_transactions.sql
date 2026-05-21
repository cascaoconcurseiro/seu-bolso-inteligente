-- Optimize RLS policies for transactions table

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can settle own mirror transactions" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can settle own mirror transactions" ON transactions
  FOR UPDATE USING (
    user_id = (select auth.uid()) AND 
    source_transaction_id IS NOT NULL
  );;
