-- Corrigir política RLS de trip_members para permitir ver todos os membros da mesma viagem

-- Remover política antiga
DROP POLICY IF EXISTS trip_members_select ON trip_members;

-- Criar nova política: usuário pode ver membros de viagens das quais ele faz parte
CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    -- Pode ver se é membro da mesma viagem
    trip_id IN (
      SELECT tm.trip_id 
      FROM trip_members tm 
      WHERE tm.user_id = auth.uid()
    )
  );

-- Também precisamos de política para UPDATE e DELETE
DROP POLICY IF EXISTS trip_members_update ON trip_members;
CREATE POLICY trip_members_update ON trip_members
  FOR UPDATE
  USING (
    -- Pode atualizar se é owner da viagem ou é o próprio registro
    user_id = auth.uid() OR
    trip_id IN (
      SELECT tm.trip_id 
      FROM trip_members tm 
      WHERE tm.user_id = auth.uid() AND tm.role = 'owner'
    )
  );

DROP POLICY IF EXISTS trip_members_delete ON trip_members;
CREATE POLICY trip_members_delete ON trip_members
  FOR DELETE
  USING (
    -- Pode deletar se é owner da viagem (mas não pode deletar a si mesmo se for owner)
    trip_id IN (
      SELECT tm.trip_id 
      FROM trip_members tm 
      WHERE tm.user_id = auth.uid() AND tm.role = 'owner'
    )
    AND NOT (user_id = auth.uid() AND role = 'owner')
  );;
