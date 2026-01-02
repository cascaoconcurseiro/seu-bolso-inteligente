-- =====================================================
-- FIX: TRIP BUDGET PRIVACY & PERSONAL OWNERSHIP
-- =====================================================
-- 
-- OBJETIVO: Garantir que orçamentos de viagens sejam
-- estritamente pessoais e privados
--
-- REGRA DE NEGÓCIO: TODO orçamento é PESSOAL
-- Nenhum usuário deve ver orçamento de outros
-- 
-- =====================================================

-- =====================================================
-- PARTE 1: CONSTRAINTS E ÍNDICES
-- =====================================================

-- 1. Adicionar constraint de positividade para orçamentos
DO $$
BEGIN
  -- Remover constraint antiga se existir
  ALTER TABLE trip_participants DROP CONSTRAINT IF EXISTS personal_budget_positive;
  
  -- Adicionar nova constraint
  ALTER TABLE trip_participants
  ADD CONSTRAINT personal_budget_positive CHECK (personal_budget IS NULL OR personal_budget >= 0);
  
  RAISE NOTICE '✅ Constraint de positividade adicionada';
END $$;

-- 2. Criar índice para performance em queries de orçamento
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_trip_participants_user_trip 
  ON trip_participants(user_id, trip_id);
  
  RAISE NOTICE '✅ Índice de performance criado';
END $$;

-- 3. Adicionar comentários para documentação
DO $$
BEGIN
  COMMENT ON COLUMN trip_participants.personal_budget IS 
  'Orçamento PESSOAL do usuário para esta viagem. PRIVADO - nunca expor para outros usuários. Fonte única da verdade para orçamentos.';
  
  COMMENT ON TABLE trip_participants IS
  'Participantes de viagens. Campo personal_budget é PRIVADO e deve ser filtrado por user_id = auth.uid() na aplicação.';
  
  RAISE NOTICE '✅ Comentários de documentação adicionados';
END $$;

-- =====================================================
-- PARTE 2: POPULAR ORÇAMENTOS NULL (TEMPORÁRIO)
-- =====================================================

-- Popular orçamentos NULL com 0 (temporário para evitar erros)
-- Usuários serão solicitados a definir orçamento real no primeiro acesso
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE trip_participants
  SET personal_budget = 0
  WHERE personal_budget IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ % orçamentos NULL populados com 0 (temporário)', v_updated_count;
END $$;

-- =====================================================
-- PARTE 3: ATUALIZAR RLS POLICIES
-- =====================================================

-- Manter política existente mas adicionar documentação
DO $$
BEGIN
  -- A política atual já está correta:
  -- "Users can view trip participants" permite ver participantes
  -- MAS a aplicação deve filtrar personal_budget por user_id
  
  -- Adicionar comentário na política
  COMMENT ON POLICY "Users can view trip participants" ON trip_participants IS
  'Permite visualizar participantes da viagem. IMPORTANTE: A aplicação DEVE filtrar personal_budget retornando NULL para outros usuários (WHERE user_id != auth.uid()).';
  
  RAISE NOTICE '✅ Documentação de RLS atualizada';
END $$;

-- =====================================================
-- PARTE 4: VERIFICAÇÃO
-- =====================================================

-- Verificar constraint
DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trip_participants' 
    AND constraint_name = 'personal_budget_positive'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE '✅ Constraint personal_budget_positive: OK';
  ELSE
    RAISE EXCEPTION '❌ Constraint personal_budget_positive: FALHOU';
  END IF;
END $$;

-- Verificar índice
DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'trip_participants' 
    AND indexname = 'idx_trip_participants_user_trip'
  ) INTO v_index_exists;
  
  IF v_index_exists THEN
    RAISE NOTICE '✅ Índice idx_trip_participants_user_trip: OK';
  ELSE
    RAISE EXCEPTION '❌ Índice idx_trip_participants_user_trip: FALHOU';
  END IF;
END $$;

-- Verificar que não há orçamentos NULL
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM trip_participants
  WHERE personal_budget IS NULL;
  
  IF v_null_count = 0 THEN
    RAISE NOTICE '✅ Nenhum orçamento NULL encontrado';
  ELSE
    RAISE NOTICE '⚠️  % orçamentos NULL encontrados (serão solicitados no primeiro acesso)', v_null_count;
  END IF;
END $$;

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRAÇÃO DE PRIVACIDADE DE ORÇAMENTOS COMPLETA!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumo:';
  RAISE NOTICE '  ✅ Constraint de positividade criada';
  RAISE NOTICE '  ✅ Índice de performance criado';
  RAISE NOTICE '  ✅ Orçamentos NULL populados (temporário)';
  RAISE NOTICE '  ✅ Documentação atualizada';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '  1. Atualizar hooks do frontend (useTrips, useTripMembers)';
  RAISE NOTICE '  2. Atualizar componentes de UI (Trips.tsx)';
  RAISE NOTICE '  3. Testar com múltiplos usuários';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '  - Orçamentos são PESSOAIS e PRIVADOS';
  RAISE NOTICE '  - Aplicação deve filtrar personal_budget por user_id';
  RAISE NOTICE '  - Nunca expor orçamento de outros usuários';
  RAISE NOTICE '';
END $$;
