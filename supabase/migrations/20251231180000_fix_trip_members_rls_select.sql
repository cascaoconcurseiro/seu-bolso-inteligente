-- Corrigir política RLS de SELECT em trip_members
-- Problema: Usuário só via seu próprio registro, não via outros membros
-- Solução: Se é membro da viagem, pode ver todos os membros dessa viagem

DROP POLICY IF EXISTS trip_members_select ON trip_members;

CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    -- Pode ver seu próprio registro
    user_id = auth.uid()
    OR
    -- Pode ver outros membros se for membro da mesma viagem
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
    )
  );
