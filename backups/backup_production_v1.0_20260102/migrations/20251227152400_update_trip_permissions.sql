-- Update RLS policies for trip itinerary and checklist
-- Data: 2024-12-27
-- Objetivo: Permitir que todos os membros (não só owners) possam adicionar/editar itinerário e checklist

-- ============================================================================
-- 1. REMOVER POLICIES ANTIGAS (SE EXISTIREM)
-- ============================================================================

DROP POLICY IF EXISTS "Trip members can view itinerary" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip owners can manage itinerary" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can add itinerary items" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can update itinerary items" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can delete itinerary items" ON trip_itinerary;

DROP POLICY IF EXISTS "Trip members can view checklist" ON trip_checklist;
DROP POLICY IF EXISTS "Trip owners can manage checklist" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can add checklist items" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can update checklist items" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can delete checklist items" ON trip_checklist;

-- ============================================================================
-- 2. POLICIES PARA TRIP_ITINERARY
-- ============================================================================

-- SELECT: Membros podem ver itinerário
CREATE POLICY "Trip members can view itinerary"
  ON trip_itinerary FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Membros podem adicionar itens
CREATE POLICY "Trip members can add itinerary items"
  ON trip_itinerary FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Membros podem atualizar itens
CREATE POLICY "Trip members can update itinerary items"
  ON trip_itinerary FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: Membros podem deletar itens
CREATE POLICY "Trip members can delete itinerary items"
  ON trip_itinerary FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. POLICIES PARA TRIP_CHECKLIST
-- ============================================================================

-- SELECT: Membros podem ver checklist
CREATE POLICY "Trip members can view checklist"
  ON trip_checklist FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Membros podem adicionar itens
CREATE POLICY "Trip members can add checklist items"
  ON trip_checklist FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Membros podem atualizar itens (marcar como completo, etc)
CREATE POLICY "Trip members can update checklist items"
  ON trip_checklist FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: Membros podem deletar itens
CREATE POLICY "Trip members can delete checklist items"
  ON trip_checklist FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. COMENTÁRIOS
-- ============================================================================

COMMENT ON POLICY "Trip members can view itinerary" ON trip_itinerary IS 
  'Todos os membros da viagem podem visualizar o itinerário';

COMMENT ON POLICY "Trip members can add itinerary items" ON trip_itinerary IS 
  'Todos os membros da viagem podem adicionar itens ao itinerário';

COMMENT ON POLICY "Trip members can update itinerary items" ON trip_itinerary IS 
  'Todos os membros da viagem podem atualizar itens do itinerário';

COMMENT ON POLICY "Trip members can delete itinerary items" ON trip_itinerary IS 
  'Todos os membros da viagem podem deletar itens do itinerário';

COMMENT ON POLICY "Trip members can view checklist" ON trip_checklist IS 
  'Todos os membros da viagem podem visualizar o checklist';

COMMENT ON POLICY "Trip members can add checklist items" ON trip_checklist IS 
  'Todos os membros da viagem podem adicionar itens ao checklist';

COMMENT ON POLICY "Trip members can update checklist items" ON trip_checklist IS 
  'Todos os membros da viagem podem atualizar itens do checklist (marcar como completo, etc)';

COMMENT ON POLICY "Trip members can delete checklist items" ON trip_checklist IS 
  'Todos os membros da viagem podem deletar itens do checklist';

-- ============================================================================
-- 5. VALIDAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_itinerary_policies INTEGER;
  v_checklist_policies INTEGER;
BEGIN
  -- Contar policies
  SELECT COUNT(*) INTO v_itinerary_policies
  FROM pg_policies
  WHERE tablename = 'trip_itinerary';
  
  SELECT COUNT(*) INTO v_checklist_policies
  FROM pg_policies
  WHERE tablename = 'trip_checklist';
  
  RAISE NOTICE '=== VALIDAÇÃO DAS POLICIES ===';
  RAISE NOTICE 'Policies em trip_itinerary: % (esperado: 4)', v_itinerary_policies;
  RAISE NOTICE 'Policies em trip_checklist: % (esperado: 4)', v_checklist_policies;
  
  IF v_itinerary_policies = 4 AND v_checklist_policies = 4 THEN
    RAISE NOTICE '✓ Todas as policies foram criadas!';
    RAISE NOTICE '✓ Membros agora podem adicionar/editar itinerário e checklist';
  ELSE
    RAISE WARNING 'Número de policies incorreto';
  END IF;
END $$;
