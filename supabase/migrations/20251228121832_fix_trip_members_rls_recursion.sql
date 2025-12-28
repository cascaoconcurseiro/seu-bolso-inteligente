-- Corrigir política RLS sem recursão

-- Remover políticas problemáticas
DROP POLICY IF EXISTS trip_members_select ON trip_members;
DROP POLICY IF EXISTS trip_members_update ON trip_members;
DROP POLICY IF EXISTS trip_members_delete ON trip_members;

-- Criar política simples: pode ver membros de viagens onde é membro
-- Usando EXISTS para evitar recursão
CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_members.trip_id
      AND (
        t.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_members tm2
          WHERE tm2.trip_id = t.id
          AND tm2.user_id = auth.uid()
        )
      )
    )
  );

-- Update: próprio registro ou owner da viagem
CREATE POLICY trip_members_update ON trip_members
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_members.trip_id
      AND t.owner_id = auth.uid()
    )
  );

-- Delete: owner da viagem pode deletar membros (exceto a si mesmo)
CREATE POLICY trip_members_delete ON trip_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = trip_members.trip_id
      AND t.owner_id = auth.uid()
    )
    AND user_id != auth.uid()
  );;
