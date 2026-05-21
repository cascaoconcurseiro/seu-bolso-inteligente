-- Corrigir APENAS trip_members_select de forma SEGURA
-- Permitir ver outros membros da mesma viagem

DROP POLICY IF EXISTS trip_members_select ON trip_members;

CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    -- Pode ver seu próprio registro
    user_id = auth.uid()
    OR
    -- Pode ver outros membros se for membro da mesma viagem
    EXISTS (
      SELECT 1 
      FROM trip_members tm 
      WHERE tm.trip_id = trip_members.trip_id 
      AND tm.user_id = auth.uid()
    )
  );;
