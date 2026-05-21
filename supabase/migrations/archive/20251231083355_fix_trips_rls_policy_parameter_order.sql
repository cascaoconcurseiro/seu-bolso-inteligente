-- Corrigir ordem dos parâmetros na política RLS de trips
-- A função is_trip_member espera (trip_id, user_id) mas a política estava chamando (user_id, trip_id)

DROP POLICY IF EXISTS "trips_select" ON trips;

CREATE POLICY "trips_select" ON trips
  FOR SELECT
  TO public
  USING (
    owner_id = (SELECT auth.uid())
    OR is_trip_member(id, (SELECT auth.uid()))
  );

COMMENT ON POLICY "trips_select" ON trips IS 'Usuários podem ver viagens que criaram ou das quais são membros. Parâmetros corrigidos: is_trip_member(trip_id, user_id)';;
