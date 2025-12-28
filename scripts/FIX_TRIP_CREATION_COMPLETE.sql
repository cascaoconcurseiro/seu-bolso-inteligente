-- =====================================================
-- FIX COMPLETO: CRIAÇÃO DE VIAGENS E CONVITES
-- =====================================================
-- 
-- Este script corrige:
-- 1. Trigger add_trip_owner não está ativo
-- 2. Viagens existentes sem owner em trip_members
-- 3. Políticas RLS de trip_invitations
-- 
-- =====================================================

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '🚀 INICIANDO CORREÇÃO DE CRIAÇÃO DE VIAGENS...';
END $$;

-- =====================================================
-- PARTE 1: RECRIAR FUNÇÃO E TRIGGER
-- =====================================================

-- 1.1: Recriar função add_trip_owner com logs
CREATE OR REPLACE FUNCTION add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE NOTICE '✅ Trigger add_trip_owner executando para viagem % (owner: %)', NEW.id, NEW.owner_id;
  
  INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
  VALUES (NEW.id, NEW.owner_id, 'owner', true, true)
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RAISE NOTICE '✅ Owner % adicionado à viagem %', NEW.owner_id, NEW.id;
  
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Função add_trip_owner recriada';
END $$;

-- 1.2: Recriar trigger
DROP TRIGGER IF EXISTS trg_add_trip_owner ON trips;
CREATE TRIGGER trg_add_trip_owner
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner();

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger trg_add_trip_owner recriado';
END $$;

-- =====================================================
-- PARTE 2: CORRIGIR DADOS EXISTENTES
-- =====================================================

-- 2.1: Adicionar owners que faltam em trip_members
DO $$
DECLARE
  v_added_count INTEGER;
BEGIN
  INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
  SELECT t.id, t.owner_id, 'owner', true, true
  FROM trips t
  LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
  WHERE tm.id IS NULL
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS v_added_count = ROW_COUNT;
  RAISE NOTICE '✅ % owners adicionados em trip_members', v_added_count;
END $$;

-- 2.2: Adicionar membros de convites aceitos que faltam
DO $$
DECLARE
  v_added_count INTEGER;
BEGIN
  INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
  SELECT ti.trip_id, ti.invitee_id, 'member', false, true
  FROM trip_invitations ti
  LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
  WHERE ti.status = 'accepted' AND tm.id IS NULL
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS v_added_count = ROW_COUNT;
  RAISE NOTICE '✅ % membros de convites aceitos adicionados', v_added_count;
END $$;

-- =====================================================
-- PARTE 3: VERIFICAR E CORRIGIR POLÍTICAS RLS
-- =====================================================

-- 3.1: Política INSERT para trip_invitations
DROP POLICY IF EXISTS "trip_invitations_insert_policy" ON trip_invitations;
DROP POLICY IF EXISTS "Trip owners can create invitations" ON trip_invitations;

CREATE POLICY "trip_invitations_insert_policy" ON trip_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_invitations.trip_id 
      AND trips.owner_id = auth.uid()
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Política INSERT de trip_invitations recriada';
END $$;

-- 3.2: Política SELECT para trip_invitations
DROP POLICY IF EXISTS "trip_invitations_select_policy" ON trip_invitations;
DROP POLICY IF EXISTS "Users can view their trip invitations" ON trip_invitations;

CREATE POLICY "trip_invitations_select_policy" ON trip_invitations
  FOR SELECT USING (
    trip_invitations.invitee_id = auth.uid() OR 
    trip_invitations.inviter_id = auth.uid()
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Política SELECT de trip_invitations recriada';
END $$;

-- 3.3: Política UPDATE para trip_invitations
DROP POLICY IF EXISTS "trip_invitations_update_policy" ON trip_invitations;
DROP POLICY IF EXISTS "Invitees can update invitation status" ON trip_invitations;

CREATE POLICY "trip_invitations_update_policy" ON trip_invitations
  FOR UPDATE USING (
    trip_invitations.invitee_id = auth.uid() OR 
    trip_invitations.inviter_id = auth.uid()
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Política UPDATE de trip_invitations recriada';
END $$;

-- 3.4: Política DELETE para trip_invitations
DROP POLICY IF EXISTS "trip_invitations_delete_policy" ON trip_invitations;

CREATE POLICY "trip_invitations_delete_policy" ON trip_invitations
  FOR DELETE USING (
    trip_invitations.inviter_id = auth.uid()
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Política DELETE de trip_invitations recriada';
END $$;

-- =====================================================
-- PARTE 4: VALIDAÇÃO COMPLETA
-- =====================================================

DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_trigger_enabled BOOLEAN;
  v_function_exists BOOLEAN;
  v_trips_without_owner INTEGER;
  v_accepted_without_member INTEGER;
  v_insert_policy_exists BOOLEAN;
  v_select_policy_exists BOOLEAN;
BEGIN
  -- Verificar trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgrelid = 'trips'::regclass 
    AND tgname = 'trg_add_trip_owner'
  ) INTO v_trigger_exists;
  
  SELECT tgenabled = 'O' INTO v_trigger_enabled
  FROM pg_trigger 
  WHERE tgrelid = 'trips'::regclass 
  AND tgname = 'trg_add_trip_owner';
  
  -- Verificar função
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'add_trip_owner'
  ) INTO v_function_exists;
  
  -- Contar viagens sem owner
  SELECT COUNT(*) INTO v_trips_without_owner
  FROM trips t
  LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
  WHERE tm.id IS NULL;
  
  -- Contar convites aceitos sem membro
  SELECT COUNT(*) INTO v_accepted_without_member
  FROM trip_invitations ti
  LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
  WHERE ti.status = 'accepted' AND tm.id IS NULL;
  
  -- Verificar políticas
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trip_invitations'
    AND policyname = 'trip_invitations_insert_policy'
  ) INTO v_insert_policy_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trip_invitations'
    AND policyname = 'trip_invitations_select_policy'
  ) INTO v_select_policy_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 VALIDAÇÃO DO SISTEMA DE VIAGENS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Componentes:';
  RAISE NOTICE '  Trigger existe: %', CASE WHEN v_trigger_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '  Trigger ativo: %', CASE WHEN v_trigger_enabled THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '  Função existe: %', CASE WHEN v_function_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '';
  RAISE NOTICE '📈 Integridade de Dados:';
  RAISE NOTICE '  Viagens sem owner: %', v_trips_without_owner;
  RAISE NOTICE '  Convites aceitos sem membro: %', v_accepted_without_member;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Políticas RLS:';
  RAISE NOTICE '  INSERT policy: %', CASE WHEN v_insert_policy_exists THEN '✅ OK' ELSE '❌ FALTANDO' END;
  RAISE NOTICE '  SELECT policy: %', CASE WHEN v_select_policy_exists THEN '✅ OK' ELSE '❌ FALTANDO' END;
  RAISE NOTICE '';
  
  IF v_trigger_exists AND v_trigger_enabled AND v_function_exists AND 
     v_trips_without_owner = 0 AND v_accepted_without_member = 0 AND
     v_insert_policy_exists AND v_select_policy_exists THEN
    RAISE NOTICE '✅ TODOS OS PROBLEMAS FORAM CORRIGIDOS!';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Próximos Passos:';
    RAISE NOTICE '  1. Teste criar uma nova viagem';
    RAISE NOTICE '  2. Verifique se a viagem aparece na lista';
    RAISE NOTICE '  3. Envie convites e verifique se chegam';
    RAISE NOTICE '  4. Aceite um convite e verifique se a viagem aparece';
  ELSE
    RAISE WARNING '⚠️  AINDA EXISTEM PROBLEMAS!';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Ações Necessárias:';
    IF NOT v_trigger_exists THEN
      RAISE NOTICE '  ❌ Trigger não existe - execute novamente este script';
    END IF;
    IF NOT v_trigger_enabled THEN
      RAISE NOTICE '  ❌ Trigger não está ativo - verifique configuração';
    END IF;
    IF NOT v_function_exists THEN
      RAISE NOTICE '  ❌ Função não existe - execute novamente este script';
    END IF;
    IF v_trips_without_owner > 0 THEN
      RAISE NOTICE '  ⚠️  % viagens sem owner - execute correção de dados', v_trips_without_owner;
    END IF;
    IF v_accepted_without_member > 0 THEN
      RAISE NOTICE '  ⚠️  % convites aceitos sem membro - execute correção de dados', v_accepted_without_member;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

COMMIT;

-- =====================================================
-- QUERIES DE DIAGNÓSTICO (OPCIONAL)
-- =====================================================

-- Descomentar para ver detalhes:

-- Ver viagens recentes e seus owners
-- SELECT 
--   t.id,
--   t.name,
--   t.owner_id,
--   t.created_at,
--   tm.id as member_record,
--   tm.role
-- FROM trips t
-- LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
-- ORDER BY t.created_at DESC
-- LIMIT 10;

-- Ver convites recentes
-- SELECT 
--   ti.id,
--   ti.trip_id,
--   ti.inviter_id,
--   ti.invitee_id,
--   ti.status,
--   ti.created_at,
--   t.name as trip_name,
--   tm.id as member_record
-- FROM trip_invitations ti
-- LEFT JOIN trips t ON t.id = ti.trip_id
-- LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
-- ORDER BY ti.created_at DESC
-- LIMIT 10;

-- Ver todas as políticas RLS
-- SELECT 
--   tablename,
--   policyname,
--   cmd,
--   permissive
-- FROM pg_policies
-- WHERE tablename IN ('trips', 'trip_members', 'trip_invitations')
-- ORDER BY tablename, policyname;
