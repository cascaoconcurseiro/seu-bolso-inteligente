-- Corrigir política RLS usando trips como referência

DROP POLICY IF EXISTS trip_members_select ON trip_members;

-- Usar SECURITY DEFINER function para evitar recursão
CREATE OR REPLACE FUNCTION user_is_trip_member(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members 
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
$$;

-- Política: pode ver membros de viagens onde você é membro
CREATE POLICY trip_members_select ON trip_members
  FOR SELECT
  USING (
    user_is_trip_member(trip_id, auth.uid())
  );;
