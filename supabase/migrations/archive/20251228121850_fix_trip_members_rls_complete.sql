-- Política completa: membros podem ver outros membros da mesma viagem
-- Usando uma função SECURITY DEFINER para evitar recursão

-- Criar função que retorna trip_ids do usuário
CREATE OR REPLACE FUNCTION get_user_trip_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT trip_id FROM trip_members WHERE user_id = p_user_id;
$$;

-- Recriar política usando a função
DROP POLICY IF EXISTS trip_members_select ON trip_members;

CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    trip_id IN (SELECT get_user_trip_ids(auth.uid()))
  );;
