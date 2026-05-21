-- Corrigir função is_trip_member usando CASCADE
-- Problema: Variável trip_id conflita com coluna trip_id
-- Solução: Usar alias na tabela e recriar políticas

DROP FUNCTION IF EXISTS is_trip_member(UUID, UUID) CASCADE;

CREATE FUNCTION is_trip_member(user_id_param UUID, trip_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- SECURITY DEFINER bypassa RLS, evitando recursão
  RETURN EXISTS (
    SELECT 1 
    FROM trip_members tm
    WHERE tm.trip_id = trip_id_param 
    AND tm.user_id = user_id_param
  );
END;
$$;

-- Recriar políticas que dependem da função

-- trips
CREATE POLICY trips_select ON trips
  FOR SELECT
  USING (owner_id = auth.uid() OR is_trip_member(auth.uid(), id));

CREATE POLICY trips_update ON trips
  FOR UPDATE
  USING (owner_id = auth.uid() OR is_trip_member(auth.uid(), id));

-- trip_itinerary
CREATE POLICY "Trip members can view itinerary" ON trip_itinerary
  FOR SELECT
  USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Trip members can add itinerary items" ON trip_itinerary
  FOR INSERT
  WITH CHECK (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Trip members can update itinerary items" ON trip_itinerary
  FOR UPDATE
  USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Trip members can delete itinerary items" ON trip_itinerary
  FOR DELETE
  USING (is_trip_member(auth.uid(), trip_id));

-- trip_checklist
CREATE POLICY "Trip members can view checklist" ON trip_checklist
  FOR SELECT
  USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Trip members can add checklist items" ON trip_checklist
  FOR INSERT
  WITH CHECK (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Trip members can update checklist items" ON trip_checklist
  FOR UPDATE
  USING (is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Trip members can delete checklist items" ON trip_checklist
  FOR DELETE
  USING (is_trip_member(auth.uid(), trip_id));

-- trip_exchange_purchases
CREATE POLICY "Trip members can view exchange purchases" ON trip_exchange_purchases
  FOR SELECT
  USING (is_trip_member(auth.uid(), trip_id));

-- trip_participants
CREATE POLICY "Users can view trip participants" ON trip_participants
  FOR SELECT
  USING (is_trip_member(auth.uid(), trip_id));;
