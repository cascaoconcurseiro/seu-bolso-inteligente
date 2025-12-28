-- Abordagem mais simples sem recursão

DROP POLICY IF EXISTS trip_members_select ON trip_members;
DROP POLICY IF EXISTS trip_members_update ON trip_members;
DROP POLICY IF EXISTS trip_members_delete ON trip_members;

-- SELECT: pode ver se é o próprio usuário OU se é owner da viagem
CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  );

-- UPDATE: próprio registro ou owner da viagem
CREATE POLICY trip_members_update ON trip_members
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
  );

-- DELETE: owner da viagem pode deletar (exceto a si mesmo)
CREATE POLICY trip_members_delete ON trip_members
  FOR DELETE
  USING (
    trip_id IN (SELECT id FROM trips WHERE owner_id = auth.uid())
    AND user_id != auth.uid()
  );;
