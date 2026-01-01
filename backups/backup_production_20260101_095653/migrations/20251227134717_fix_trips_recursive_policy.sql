-- Corrigir policy recursiva de trips

-- Remover policy problemática
DROP POLICY IF EXISTS "Users can view own trips and shared trips" ON trips;

-- Criar policy correta sem recursão
-- Usar SECURITY DEFINER function para evitar recursão
CREATE OR REPLACE FUNCTION user_can_view_trip(trip_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips WHERE id = trip_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = trip_id AND user_id = auth.uid()
  );
END;
$$;

-- Criar policy simples
CREATE POLICY "Users can view own trips and shared trips"
  ON trips FOR SELECT
  USING (
    owner_id = auth.uid()
    OR user_can_view_trip(id)
  );;
