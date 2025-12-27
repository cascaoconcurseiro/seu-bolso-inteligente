-- ============================================================================
-- FIX DE ERRO 500 EM TRIP_MEMBERS (RECURSÃO INFINITA RLS)
-- Data: 27/12/2025
-- Responsável: Senior Software Architect
-- ============================================================================

BEGIN;

-- 1. CRIAÇÃO DE FUNÇÃO SECURITY DEFINER (QUEBRA O CICLO DE RECURSÃO)
-- Esta função permite consultar os IDs das viagens do usuário SEM acionar as policies da tabela trip_members.
CREATE OR REPLACE FUNCTION public.get_user_trip_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Acesso direto sem passar pelo RLS de trip_members
  SELECT trip_id FROM trip_members WHERE user_id = auth.uid();
$$;

-- 2. CORREÇÃO DA TABELA TRIPS
-- Remove a policy que consultava a tabela trip_members diretamente (causando loop)
DROP POLICY IF EXISTS "Users can view own trips and shared trips" ON trips;
DROP POLICY IF EXISTS "Users can view own trips" ON trips;

CREATE POLICY "Users can view own trips and shared trips"
ON trips FOR SELECT
USING (
  owner_id = auth.uid()
  OR
  id IN (SELECT get_user_trip_ids()) -- Usa a função segura
);

-- 3. CORREÇÃO DA TABELA TRIP_MEMBERS
-- Remove policy recursiva
DROP POLICY IF EXISTS "Users can view trip members of their trips" ON trip_members;

CREATE POLICY "Users can view trip members of their trips"
ON trip_members FOR SELECT
USING (
  -- Permite ver seu próprio registro (base)
  user_id = auth.uid()
  OR
  -- Permite ver outros membros se você também é membro daquela viagem (usa função segura)
  trip_id IN (SELECT get_user_trip_ids())
  OR
  -- Permite ver membros se você é o DONO da viagem
  -- (Isso consulta 'trips', que agora usa 'get_user_trip_ids', evitando o ciclo de volta para trip_members)
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = trip_members.trip_id 
    AND trips.owner_id = auth.uid()
  )
);

-- 4. GARANTIA DE FOREIGN KEYS (PARA PERMITIR JOIN AUTOMÁTICO)
-- Adiciona FK explícita para profiles, permitindo .select('*, profiles(*)')
DO $$
BEGIN
  -- trip_id já deve existir, mas garantimos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_members_trip_id_fkey' 
    OR constraint_name = 'trip_members_trip_id_fkey1' -- nomes podem variar
  ) THEN
    -- A constraint criada normalmente é trip_members_trip_id_fkey
    NULL; -- Assume que já existe do create table
  END IF;

  -- Adiciona FK para profiles se não existir
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
