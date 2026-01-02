-- REVERTER TODAS AS MUDANÇAS DE RLS
-- Voltar ao estado original que funcionava

-- 1. Restaurar função is_trip_member original
DROP FUNCTION IF EXISTS is_trip_member(UUID, UUID) CASCADE;

CREATE FUNCTION is_trip_member(trip_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM trip_members 
    WHERE trip_id = trip_id_param 
    AND user_id = user_id_param
  );
END;
$$;

-- 2. Restaurar política trip_members_select ORIGINAL
DROP POLICY IF EXISTS trip_members_select ON trip_members;

CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    is_trip_member(trip_id, auth.uid())
  );

-- 3. Recriar políticas de trips
DROP POLICY IF EXISTS trips_select ON trips;
DROP POLICY IF EXISTS trips_update ON trips;

CREATE POLICY trips_select ON trips
  FOR SELECT
  USING (owner_id = auth.uid() OR is_trip_member(id, auth.uid()));

CREATE POLICY trips_update ON trips
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_trip_member(id, auth.uid()));

-- 4. Recriar políticas de trip_itinerary
DROP POLICY IF EXISTS "Trip members can view itinerary" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can add itinerary items" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can update itinerary items" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can delete itinerary items" ON trip_itinerary;

CREATE POLICY "Trip members can view itinerary" ON trip_itinerary
  FOR SELECT
  USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Trip members can add itinerary items" ON trip_itinerary
  FOR INSERT
  WITH CHECK (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Trip members can update itinerary items" ON trip_itinerary
  FOR UPDATE
  USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Trip members can delete itinerary items" ON trip_itinerary
  FOR DELETE
  USING (is_trip_member(trip_id, auth.uid()));

-- 5. Recriar políticas de trip_checklist
DROP POLICY IF EXISTS "Trip members can view checklist" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can add checklist items" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can update checklist items" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can delete checklist items" ON trip_checklist;

CREATE POLICY "Trip members can view checklist" ON trip_checklist
  FOR SELECT
  USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Trip members can add checklist items" ON trip_checklist
  FOR INSERT
  WITH CHECK (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Trip members can update checklist items" ON trip_checklist
  FOR UPDATE
  USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Trip members can delete checklist items" ON trip_checklist
  FOR DELETE
  USING (is_trip_member(trip_id, auth.uid()));

-- 6. Recriar políticas de trip_exchange_purchases
DROP POLICY IF EXISTS "Trip members can view exchange purchases" ON trip_exchange_purchases;

CREATE POLICY "Trip members can view exchange purchases" ON trip_exchange_purchases
  FOR SELECT
  USING (is_trip_member(trip_id, auth.uid()));

-- 7. Recriar políticas de trip_participants
DROP POLICY IF EXISTS "Users can view trip participants" ON trip_participants;

CREATE POLICY "Users can view trip participants" ON trip_participants
  FOR SELECT
  USING (is_trip_member(trip_id, auth.uid()));;
