-- Allow trip owners to update invitations (needed for upsert when re-inviting users)
DROP POLICY IF EXISTS "Trip owners can update their invitations" ON public.trip_invitations;
CREATE POLICY "Trip owners can update their invitations"
  ON public.trip_invitations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_invitations.trip_id AND trips.owner_id = auth.uid()
    )
  );
