-- Corrigir policy recursiva de trip_members

-- Remover policy problemática
DROP POLICY IF EXISTS "Users can view trip members of their trips" ON trip_members;

-- Criar policy correta sem recursão
CREATE POLICY "Users can view trip members of their trips"
  ON trip_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
    )
    OR trip_id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_id = auth.uid() AND status = 'accepted'
    )
  );;
