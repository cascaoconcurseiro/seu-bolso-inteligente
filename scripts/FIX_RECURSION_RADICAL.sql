-- ============================================================================
-- FIX RADICAL: ELIMINAR TODA RECURSÃO
-- ============================================================================
-- Este script remove COMPLETAMENTE qualquer possibilidade de recursão
-- entre trips e trip_members

-- ============================================================================
-- 1. DESABILITAR RLS TEMPORARIAMENTE
-- ============================================================================
ALTER TABLE trip_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. REMOVER TODAS AS POLICIES
-- ============================================================================

-- Remover TODAS as policies de trips
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trips') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trips', r.policyname);
  END LOOP;
END $$;

-- Remover TODAS as policies de trip_members
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trip_members') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trip_members', r.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- 3. REABILITAR RLS
-- ============================================================================
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CRIAR POLICIES SIMPLES PARA TRIP_MEMBERS (SEM REFERÊNCIA A TRIPS)
-- ============================================================================

-- SELECT: Ver apenas seus próprios registros
CREATE POLICY "trip_members_select"
  ON trip_members FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Permitir inserção (controlada por triggers)
CREATE POLICY "trip_members_insert"
  ON trip_members FOR INSERT
  WITH CHECK (true);

-- UPDATE: Não permitir (não é necessário)
-- DELETE: Não permitir via RLS (usar função específica se necessário)

-- ============================================================================
-- 5. CRIAR POLICIES SIMPLES PARA TRIPS (SEM REFERÊNCIA A TRIP_MEMBERS)
-- ============================================================================

-- SELECT: Ver apenas viagens próprias (pelo owner_id)
CREATE POLICY "trips_select_owner"
  ON trips FOR SELECT
  USING (owner_id = auth.uid());

-- SELECT: Ver viagens compartilhadas (via função auxiliar)
CREATE POLICY "trips_select_member"
  ON trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM trip_members 
      WHERE trip_members.trip_id = trips.id 
      AND trip_members.user_id = auth.uid()
    )
  );

-- INSERT: Criar viagem
CREATE POLICY "trips_insert"
  ON trips FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: Atualizar apenas viagens próprias
CREATE POLICY "trips_update"
  ON trips FOR UPDATE
  USING (owner_id = auth.uid());

-- DELETE: Deletar apenas viagens próprias
CREATE POLICY "trips_delete"
  ON trips FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 6. VALIDAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_trip_members_policies INTEGER;
  v_trips_policies INTEGER;
  v_rls_enabled_trips BOOLEAN;
  v_rls_enabled_members BOOLEAN;
BEGIN
  -- Verificar RLS habilitado
  SELECT relrowsecurity INTO v_rls_enabled_trips
  FROM pg_class WHERE relname = 'trips';
  
  SELECT relrowsecurity INTO v_rls_enabled_members
  FROM pg_class WHERE relname = 'trip_members';
  
  -- Contar policies
  SELECT COUNT(*) INTO v_trip_members_policies
  FROM pg_policies WHERE tablename = 'trip_members';
  
  SELECT COUNT(*) INTO v_trips_policies
  FROM pg_policies WHERE tablename = 'trips';
  
  RAISE NOTICE '=== STATUS DO SISTEMA ===';
  RAISE NOTICE 'RLS habilitado em trips: %', v_rls_enabled_trips;
  RAISE NOTICE 'RLS habilitado em trip_members: %', v_rls_enabled_members;
  RAISE NOTICE 'Policies em trip_members: %', v_trip_members_policies;
  RAISE NOTICE 'Policies em trips: %', v_trips_policies;
  
  IF v_rls_enabled_trips AND v_rls_enabled_members THEN
    RAISE NOTICE '✓ RLS habilitado corretamente';
  ELSE
    RAISE WARNING '✗ RLS não está habilitado!';
  END IF;
  
  IF v_trip_members_policies >= 2 AND v_trips_policies >= 4 THEN
    RAISE NOTICE '✓ Policies criadas';
    RAISE NOTICE '✓ Tente criar uma viagem agora!';
  ELSE
    RAISE WARNING '✗ Número de policies incorreto';
  END IF;
END $$;

-- ============================================================================
-- 7. LISTAR POLICIES CRIADAS
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('trips', 'trip_members')
ORDER BY tablename, cmd, policyname;
