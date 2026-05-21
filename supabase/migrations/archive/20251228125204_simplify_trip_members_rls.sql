-- Simplificar política RLS de trip_members

DROP POLICY IF EXISTS trip_members_select ON trip_members;

-- Política simples: pode ver se é membro da viagem (verificando diretamente)
CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    -- Pode ver seu próprio registro
    user_id = auth.uid()
    OR
    -- Pode ver outros membros da mesma viagem se você também é membro
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );;
