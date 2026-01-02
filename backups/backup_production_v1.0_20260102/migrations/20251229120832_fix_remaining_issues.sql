-- Fix remaining issues

-- 1. Fix user_can_view_trip function
ALTER FUNCTION public.user_can_view_trip(UUID, UUID) SET search_path = public;

-- 2. Optimize remaining family_members policies
DROP POLICY IF EXISTS "family_members_select_policy" ON family_members;
DROP POLICY IF EXISTS "family_members_insert_policy" ON family_members;
DROP POLICY IF EXISTS "family_members_update_policy" ON family_members;
DROP POLICY IF EXISTS "family_members_delete_policy" ON family_members;

CREATE POLICY "family_members_select_policy" ON family_members
  FOR SELECT USING (
    user_id = (select auth.uid()) OR
    linked_user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM families f
      WHERE f.id = family_members.family_id
      AND f.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "family_members_insert_policy" ON family_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM families f
      WHERE f.id = family_members.family_id
      AND f.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "family_members_update_policy" ON family_members
  FOR UPDATE USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM families f
      WHERE f.id = family_members.family_id
      AND f.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "family_members_delete_policy" ON family_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM families f
      WHERE f.id = family_members.family_id
      AND f.owner_id = (select auth.uid())
    )
  );

-- 3. Optimize trip_members_select policy
DROP POLICY IF EXISTS "trip_members_select" ON trip_members;

CREATE POLICY "trip_members_select" ON trip_members
  FOR SELECT USING (
    user_id = (select auth.uid()) OR
    is_trip_member((select auth.uid()), trip_id)
  );;
