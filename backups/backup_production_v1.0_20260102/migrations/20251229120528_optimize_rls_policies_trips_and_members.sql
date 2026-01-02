-- Optimize RLS policies for trips, trip_members, trip_invitations

DROP POLICY IF EXISTS "trips_insert" ON trips;
DROP POLICY IF EXISTS "trips_select" ON trips;
DROP POLICY IF EXISTS "trips_update" ON trips;
DROP POLICY IF EXISTS "trips_delete" ON trips;

CREATE POLICY "trips_insert" ON trips
  FOR INSERT WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "trips_select" ON trips
  FOR SELECT USING (
    owner_id = (select auth.uid()) OR 
    is_trip_member((select auth.uid()), id)
  );

CREATE POLICY "trips_update" ON trips
  FOR UPDATE USING (
    owner_id = (select auth.uid()) OR 
    is_trip_member((select auth.uid()), id)
  );

CREATE POLICY "trips_delete" ON trips
  FOR DELETE USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "trip_members_update" ON trip_members;
DROP POLICY IF EXISTS "trip_members_delete" ON trip_members;

CREATE POLICY "trip_members_update" ON trip_members
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "trip_members_delete" ON trip_members
  FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "trip_invitations_insert_policy" ON trip_invitations;
DROP POLICY IF EXISTS "trip_invitations_select_policy" ON trip_invitations;
DROP POLICY IF EXISTS "trip_invitations_update_policy" ON trip_invitations;
DROP POLICY IF EXISTS "trip_invitations_delete_policy" ON trip_invitations;

CREATE POLICY "trip_invitations_insert_policy" ON trip_invitations
  FOR INSERT WITH CHECK (inviter_id = (select auth.uid()));

CREATE POLICY "trip_invitations_select_policy" ON trip_invitations
  FOR SELECT USING (
    inviter_id = (select auth.uid()) OR 
    invitee_id = (select auth.uid())
  );

CREATE POLICY "trip_invitations_update_policy" ON trip_invitations
  FOR UPDATE USING (invitee_id = (select auth.uid()));

CREATE POLICY "trip_invitations_delete_policy" ON trip_invitations
  FOR DELETE USING (
    inviter_id = (select auth.uid()) OR 
    invitee_id = (select auth.uid())
  );;
