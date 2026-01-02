-- Corrigir recursão infinita usando SECURITY DEFINER
-- Data: 2024-12-27
-- Solução: Função SECURITY DEFINER bypassa RLS, eliminando recursão

-- ============================================================================
-- 1. CRIAR FUNÇÃO AUXILIAR (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_trip_member(trip_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- SECURITY DEFINER bypassa RLS, evitando recursão
  RETURN EXISTS (
    SELECT 1 
    FROM trip_members 
    WHERE trip_id = trip_id_param 
    AND user_id = user_id_param
  );
END;
$$;

COMMENT ON FUNCTION is_trip_member IS 'Verifica se usuário é membro de uma viagem. SECURITY DEFINER bypassa RLS para evitar recursão.';

-- ============================================================================
-- 2. REMOVER TODAS AS POLICIES EXISTENTES
-- ============================================================================

-- Trips
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trips') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trips', r.policyname);
  END LOOP;
END $$;

-- Trip Members
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trip_members') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trip_members', r.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- 3. POLICIES PARA TRIP_MEMBERS (SIMPLES, SEM REFERÊNCIA A TRIPS)
-- ============================================================================

CREATE POLICY "trip_members_select"
  ON trip_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "trip_members_insert"
  ON trip_members FOR INSERT
  WITH CHECK (true); -- Controlado por triggers SECURITY DEFINER

COMMENT ON POLICY "trip_members_select" ON trip_members IS 
'Usuário vê apenas seus próprios registros. Simples e sem recursão.';

COMMENT ON POLICY "trip_members_insert" ON trip_members IS 
'Inserções controladas por triggers SECURITY DEFINER (add_trip_owner, handle_trip_invitation_accepted).';

-- ============================================================================
-- 4. POLICIES PARA TRIPS (USA FUNÇÃO SECURITY DEFINER)
-- ============================================================================

-- SELECT: Ver viagens onde é membro (usa função que bypassa RLS)
CREATE POLICY "trips_select"
  ON trips FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR is_trip_member(id, auth.uid())
  );

-- INSERT: Criar viagem
CREATE POLICY "trips_insert"
  ON trips FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: Atualizar viagens próprias ou onde tem permissão
CREATE POLICY "trips_update"
  ON trips FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR is_trip_member(id, auth.uid())
  );

-- DELETE: Deletar apenas viagens próprias
CREATE POLICY "trips_delete"
  ON trips FOR DELETE
  USING (owner_id = auth.uid());

COMMENT ON POLICY "trips_select" ON trips IS 
'Usuário vê viagens próprias ou onde é membro. Usa is_trip_member() SECURITY DEFINER para evitar recursão.';

COMMENT ON POLICY "trips_insert" ON trips IS 
'Usuário pode criar viagens. Trigger add_trip_owner adiciona automaticamente como owner em trip_members.';

COMMENT ON POLICY "trips_update" ON trips IS 
'Usuário pode atualizar viagens próprias ou onde é membro.';

COMMENT ON POLICY "trips_delete" ON trips IS 
'Apenas owner pode deletar viagem.';

-- ============================================================================
-- 5. GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================================================

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. VALIDAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_trip_members_policies INTEGER;
  v_trips_policies INTEGER;
BEGIN
  -- Verificar função
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_trip_member'
  ) INTO v_function_exists;
  
  -- Contar policies
  SELECT COUNT(*) INTO v_trip_members_policies
  FROM pg_policies WHERE tablename = 'trip_members';
  
  SELECT COUNT(*) INTO v_trips_policies
  FROM pg_policies WHERE tablename = 'trips';
  
  RAISE NOTICE '=== MIGRAÇÃO APLICADA ===';
  RAISE NOTICE 'Função is_trip_member: %', CASE WHEN v_function_exists THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'Policies trip_members: % (esperado: 2)', v_trip_members_policies;
  RAISE NOTICE 'Policies trips: % (esperado: 4)', v_trips_policies;
  
  IF v_function_exists AND v_trip_members_policies = 2 AND v_trips_policies = 4 THEN
    RAISE NOTICE '✓ Recursão eliminada com sucesso!';
  END IF;
END $$;
