-- Consolidate duplicate policies for profiles
-- Merge "Users can view own profile" and "Users can search profiles by email"

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can search profiles by email" ON profiles;

-- Single consolidated policy for SELECT
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (
    id = (select auth.uid()) OR 
    email IN (
      SELECT email FROM profiles WHERE id = (select auth.uid())
    )
  );;
