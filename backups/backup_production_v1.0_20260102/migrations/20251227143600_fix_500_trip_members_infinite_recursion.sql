-- ============================================================================
-- FIX DE ERRO 500 EM TRIP_MEMBERS (RECURSÃO INFINITA RLS)
-- ============================================================================

BEGIN;

-- 1. CRIAÇÃO DE FUNÇÃO SECURITY DEFINER (QUEBRA O CICLO DE RECURSÃO)
CREATE OR REPLACE FUNCTION public.get_user_trip_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT trip_id FROM trip_members WHERE user_id = auth.uid();
$$;

-- 2. CORREÇÃO DA TABELA TRIPS
DROP POLICY IF EXISTS "Users can view own trips and shared trips" ON trips;
DROP POLICY IF EXISTS "Users can view own trips" ON trips;

CREATE POLICY "Users can view own trips and shared trips"
ON trips FOR SELECT
USING (
  owner_id = auth.uid()
  OR
  id IN (SELECT get_user_trip_ids()) 
);

-- 3. CORREÇÃO DA TABELA TRIP_MEMBERS
DROP POLICY IF EXISTS "Users can view trip members of their trips" ON trip_members;

CREATE POLICY "Users can view trip members of their trips"
ON trip_members FOR SELECT
USING (
  user_id = auth.uid()
  OR
  trip_id IN (SELECT get_user_trip_ids())
  OR
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = trip_members.trip_id 
    AND trips.owner_id = auth.uid()
  )
);

-- 4. GARANTIA DE FOREIGN KEYS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_trip_members_profiles'
  ) THEN
    ALTER TABLE trip_members
    ADD CONSTRAINT fk_trip_members_profiles
    FOREIGN KEY (user_id)
    REFERENCES profiles(id);
  END IF;
END $$;

COMMIT;
