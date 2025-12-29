-- Optimize RLS policies for families table

DROP POLICY IF EXISTS "Users can view own families" ON families;
DROP POLICY IF EXISTS "Users can create families" ON families;
DROP POLICY IF EXISTS "Users can update own families" ON families;
DROP POLICY IF EXISTS "Users can delete own families" ON families;

CREATE POLICY "Users can view own families" ON families
  FOR SELECT USING (owner_id = (select auth.uid()));

CREATE POLICY "Users can create families" ON families
  FOR INSERT WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Users can update own families" ON families
  FOR UPDATE USING (owner_id = (select auth.uid()));

CREATE POLICY "Users can delete own families" ON families
  FOR DELETE USING (owner_id = (select auth.uid()));;
