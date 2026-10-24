-- Keep read access on its own policy. The former FOR ALL edit policy also
-- applied to SELECT and overlapped with the broader can_view_trip policy.
-- can_edit_trip_plan is a subset of can_view_trip (owners and active non-viewers).

DROP POLICY IF EXISTS "Trip editors can manage bags" ON public.trip_bags;
CREATE POLICY "Trip editors can add bags"
  ON public.trip_bags FOR INSERT TO authenticated
  WITH CHECK (private.can_edit_trip_plan(trip_id));
CREATE POLICY "Trip editors can update bags"
  ON public.trip_bags FOR UPDATE TO authenticated
  USING (private.can_edit_trip_plan(trip_id))
  WITH CHECK (private.can_edit_trip_plan(trip_id));
CREATE POLICY "Trip editors can delete bags"
  ON public.trip_bags FOR DELETE TO authenticated
  USING (private.can_edit_trip_plan(trip_id));

DROP POLICY IF EXISTS "Trip editors can manage journal entries" ON public.trip_journal_entries;
CREATE POLICY "Trip editors can add journal entries"
  ON public.trip_journal_entries FOR INSERT TO authenticated
  WITH CHECK (private.can_edit_trip_plan(trip_id));
CREATE POLICY "Trip editors can update journal entries"
  ON public.trip_journal_entries FOR UPDATE TO authenticated
  USING (private.can_edit_trip_plan(trip_id))
  WITH CHECK (private.can_edit_trip_plan(trip_id));
CREATE POLICY "Trip editors can delete journal entries"
  ON public.trip_journal_entries FOR DELETE TO authenticated
  USING (private.can_edit_trip_plan(trip_id));

DROP POLICY IF EXISTS "Trip editors can manage reservation endpoints"
  ON public.trip_reservation_endpoints;
CREATE POLICY "Trip editors can add reservation endpoints"
  ON public.trip_reservation_endpoints FOR INSERT TO authenticated
  WITH CHECK (private.can_edit_trip_plan(trip_id));
CREATE POLICY "Trip editors can update reservation endpoints"
  ON public.trip_reservation_endpoints FOR UPDATE TO authenticated
  USING (private.can_edit_trip_plan(trip_id))
  WITH CHECK (private.can_edit_trip_plan(trip_id));
CREATE POLICY "Trip editors can delete reservation endpoints"
  ON public.trip_reservation_endpoints FOR DELETE TO authenticated
  USING (private.can_edit_trip_plan(trip_id));
