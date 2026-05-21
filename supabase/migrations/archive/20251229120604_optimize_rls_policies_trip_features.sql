-- Optimize RLS policies for trip features

DROP POLICY IF EXISTS "Trip members can view itinerary" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can add itinerary items" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can update itinerary items" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can delete itinerary items" ON trip_itinerary;

CREATE POLICY "Trip members can view itinerary" ON trip_itinerary
  FOR SELECT USING (is_trip_member((select auth.uid()), trip_id));

CREATE POLICY "Trip members can add itinerary items" ON trip_itinerary
  FOR INSERT WITH CHECK (is_trip_member((select auth.uid()), trip_id));

CREATE POLICY "Trip members can update itinerary items" ON trip_itinerary
  FOR UPDATE USING (is_trip_member((select auth.uid()), trip_id));

CREATE POLICY "Trip members can delete itinerary items" ON trip_itinerary
  FOR DELETE USING (is_trip_member((select auth.uid()), trip_id));

DROP POLICY IF EXISTS "Trip members can view checklist" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can add checklist items" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can update checklist items" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can delete checklist items" ON trip_checklist;

CREATE POLICY "Trip members can view checklist" ON trip_checklist
  FOR SELECT USING (is_trip_member((select auth.uid()), trip_id));

CREATE POLICY "Trip members can add checklist items" ON trip_checklist
  FOR INSERT WITH CHECK (is_trip_member((select auth.uid()), trip_id));

CREATE POLICY "Trip members can update checklist items" ON trip_checklist
  FOR UPDATE USING (is_trip_member((select auth.uid()), trip_id));

CREATE POLICY "Trip members can delete checklist items" ON trip_checklist
  FOR DELETE USING (is_trip_member((select auth.uid()), trip_id));

DROP POLICY IF EXISTS "Trip members can view exchange purchases" ON trip_exchange_purchases;
DROP POLICY IF EXISTS "Users can create own exchange purchases" ON trip_exchange_purchases;
DROP POLICY IF EXISTS "Users can update own exchange purchases" ON trip_exchange_purchases;
DROP POLICY IF EXISTS "Users can delete own exchange purchases" ON trip_exchange_purchases;

CREATE POLICY "Trip members can view exchange purchases" ON trip_exchange_purchases
  FOR SELECT USING (is_trip_member((select auth.uid()), trip_id));

CREATE POLICY "Users can create own exchange purchases" ON trip_exchange_purchases
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own exchange purchases" ON trip_exchange_purchases
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own exchange purchases" ON trip_exchange_purchases
  FOR DELETE USING (user_id = (select auth.uid()));;
