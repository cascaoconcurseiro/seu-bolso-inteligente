CREATE POLICY "trip_invitations_update_policy" ON trip_invitations
    FOR UPDATE USING (
        invitee_id = auth.uid() OR 
        inviter_id = auth.uid()
    );
