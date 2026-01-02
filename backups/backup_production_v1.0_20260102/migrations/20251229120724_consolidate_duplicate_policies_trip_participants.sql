-- Consolidate duplicate policies for trip_participants

DROP POLICY IF EXISTS "Users can view trip participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;

-- Consolidated SELECT policy
CREATE POLICY "Users can view trip participants" ON trip_participants
  FOR SELECT USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_participants.trip_id
      AND (t.owner_id = (select auth.uid()) OR is_trip_member((select auth.uid()), t.id))
    )
  );

-- Single policy for INSERT/UPDATE/DELETE (only owners)
CREATE POLICY "Trip owners can manage participants" ON trip_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_participants.trip_id
      AND t.owner_id = (select auth.uid())
    )
  );;
