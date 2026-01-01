-- Optimize RLS policies for budgets table

DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;

CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own budgets" ON budgets
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (user_id = (select auth.uid()));;
