-- Optimize RLS policies for profiles table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with optimized auth.uid()
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = (select auth.uid()));;
