-- Optimize RLS policies for categories table

DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can create categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create categories" ON categories
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (user_id = (select auth.uid()));;
