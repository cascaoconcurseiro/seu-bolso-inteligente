-- Optimize RLS policies for accounts table

DROP POLICY IF EXISTS "Users can view own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;

CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create accounts" ON accounts
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (user_id = (select auth.uid()));;
