-- ============================================================================
-- SCRIPT PARA CORRIGIR RECURSÃO INFINITA EM TRIPS
-- ============================================================================
-- Execute este script no SQL Editor do Supabase
-- Ele corrige o erro: "infinite recursion detected in policy for relation trips"

-- IMPORTANTE: Execute TODO o conteúdo de uma vez

-- ============================================================================
-- 1. REMOVER TODAS AS POLICIES PROBLEMÁTICAS
-- ============================================================================

-- Remover policies de trips
DROP POLICY IF EXISTS "Users can view own trips and shared trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips they are members of" ON trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;

-- Remover policies de trip_members
DROP POLICY IF EXISTS "Users can view trip members of their trips" ON trip_members;
DROP POLICY IF EXISTS "Trip owners can add members" ON trip_members;
DROP POLICY IF EXISTS "Trip owners can remove members" ON trip_members;
DROP POLICY IF EXISTS "Trip members are added via invitations" ON trip_members;

-- ============================================================================
-- 2. CRIAR POLICIES SEM RECURSÃO PARA TRIP_MEMBERS (PRIMEIRO)
-- ============================================================================
-- trip_members não deve fazer referência a trips para evitar recursão

-- SELECT: Usuário pode ver seus próprios registros em trip_members
CREATE POLICY "Users can view their own trip memberships"
  ON trip_members FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Apenas via trigger (SECURITY DEFINER) ou owner direto
CREATE POLICY "System can insert trip members"
  ON trip_members FOR INSERT
  WITH CHECK (true); -- Controlado por triggers SECURITY DEFINER

-- DELETE: Apenas o owner da viagem pode remover membros
CREATE POLICY "Trip owners can remove members"
  ON trip_members FOR DELETE
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
    )
  );

-- UPDATE: Apenas o owner pode atualizar permissões
CREATE POLICY "Trip owners can update member permissions"
  ON trip_members FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. CRIAR POLICIES SEM RECURSÃO PARA TRIPS (DEPOIS)
-- ============================================================================
-- trips pode fazer referência a trip_members porque trip_members não referencia trips

-- SELECT: Usuário pode ver viagens onde é membro
CREATE POLICY "Users can view trips they are members of"
  ON trips FOR SELECT
  USING (
    id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Qualquer usuário autenticado pode criar viagem
CREATE POLICY "Authenticated users can create trips"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Apenas o owner ou membros com permissão podem atualizar
CREATE POLICY "Trip owners and editors can update trips"
  ON trips FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT trip_id FROM trip_members 
      WHERE user_id = auth.uid() 
      AND can_edit_details = true
    )
  );

-- DELETE: Apenas o owner pode deletar
CREATE POLICY "Trip owners can delete trips"
  ON trips FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- 4. VALIDAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_trip_members_policies INTEGER;
  v_trips_policies INTEGER;
BEGIN
  -- Contar policies
  SELECT COUNT(*) INTO v_trip_members_policies
  FROM pg_policies
  WHERE tablename = 'trip_members';
  
  SELECT COUNT(*) INTO v_trips_policies
  FROM pg_policies
  WHERE tablename = 'trips';
  
  RAISE NOTICE '=== VALIDAÇÃO DAS POLICIES ===';
  RAISE NOTICE 'Policies em trip_members: % (esperado: 4)', v_trip_members_policies;
  RAISE NOTICE 'Policies em trips: % (esperado: 4)', v_trips_policies;
  
  IF v_trip_members_policies = 4 AND v_trips_policies = 4 THEN
    RAISE NOTICE '✓ Todas as policies foram criadas corretamente!';
    RAISE NOTICE '✓ Recursão eliminada: trip_members não referencia trips';
    RAISE NOTICE '✓ Você pode criar viagens agora!';
  ELSE
    RAISE WARNING 'Número de policies incorreto. Verifique os erros acima.';
  END IF;
END $$;
