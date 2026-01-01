-- Corrigir sistema de viagens
-- Data: 2024-12-27
-- Objetivo: Resolver erro de chave duplicada e garantir visibilidade das viagens

-- ============================================================================
-- 1. ATUALIZAR TRIGGER add_trip_owner COM ON CONFLICT
-- ============================================================================
-- Este trigger adiciona automaticamente o criador da viagem como owner
-- ON CONFLICT DO NOTHING evita erro quando o owner já existe

CREATE OR REPLACE FUNCTION add_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Adicionar o criador da viagem como owner
  -- ON CONFLICT evita erro de chave duplicada
  INSERT INTO trip_members (
    trip_id, 
    user_id, 
    role, 
    can_edit_details, 
    can_manage_expenses
  )
  VALUES (
    NEW.id, 
    NEW.owner_id, 
    'owner', 
    true, 
    true
  )
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION add_trip_owner() IS 'Adiciona automaticamente o criador da viagem como owner em trip_members. ON CONFLICT evita erros de duplicação.';

-- ============================================================================
-- 2. SIMPLIFICAR POLÍTICA RLS DE SELECT EM TRIPS
-- ============================================================================
-- Política simplificada: se está em trip_members, pode ver a viagem
-- Remove verificação redundante de owner_id

DROP POLICY IF EXISTS "Users can view own trips and shared trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips they are members of" ON trips;

CREATE POLICY "Users can view trips they are members of"
  ON trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trips.id 
      AND tm.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view trips they are members of" ON trips IS 'Usuários podem ver viagens das quais são membros (verificado via trip_members). Usa EXISTS para melhor performance e alias tm para evitar ambiguidade.';

-- ============================================================================
-- 3. VERIFICAR E ATUALIZAR TRIGGER DE CONVITES (SE NECESSÁRIO)
-- ============================================================================
-- Garantir que o trigger de convites também tem ON CONFLICT

CREATE OR REPLACE FUNCTION handle_trip_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas processar se foi aceito
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Adicionar como membro da viagem
    -- ON CONFLICT DO NOTHING evita erro se já existir
    INSERT INTO trip_members (
      trip_id,
      user_id,
      role,
      can_edit_details,
      can_manage_expenses
    )
    VALUES (
      NEW.trip_id,
      NEW.invitee_id,
      'member',
      false,
      true
    )
    ON CONFLICT (trip_id, user_id) DO NOTHING;
    
    -- Atualizar timestamp de resposta
    NEW.responded_at := NOW();
  END IF;
  
  -- Se rejeitado, apenas atualizar timestamp
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.responded_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_trip_invitation_accepted() IS 'Adiciona membro em trip_members quando convite é aceito. ON CONFLICT evita erros de duplicação.';

-- ============================================================================
-- 4. CORRIGIR DADOS INCONSISTENTES
-- ============================================================================

-- 4.1. Adicionar owners que faltam em trip_members
-- Viagens que existem mas o owner não está em trip_members
INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
SELECT t.id, t.owner_id, 'owner', true, true
FROM trips t
LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
WHERE tm.id IS NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- 4.2. Adicionar membros de convites aceitos que faltam
-- Convites aceitos mas o membro não está em trip_members
INSERT INTO trip_members (trip_id, user_id, role, can_edit_details, can_manage_expenses)
SELECT ti.trip_id, ti.invitee_id, 'member', false, true
FROM trip_invitations ti
LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
WHERE ti.status = 'accepted' AND tm.id IS NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- 4.3. Remover duplicatas em trip_members (manter apenas o primeiro registro)
-- Isso não deveria acontecer, mas vamos garantir
DELETE FROM trip_members tm1
WHERE EXISTS (
  SELECT 1 FROM trip_members tm2
  WHERE tm2.trip_id = tm1.trip_id
  AND tm2.user_id = tm1.user_id
  AND tm2.created_at < tm1.created_at
);

-- ============================================================================
-- 5. VALIDAÇÃO FINAL
-- ============================================================================

-- Contar problemas restantes (deve ser 0 para todos)
DO $$
DECLARE
  v_trips_without_owner INTEGER;
  v_owners_not_in_members INTEGER;
  v_duplicates INTEGER;
  v_accepted_without_member INTEGER;
  v_multiple_owners INTEGER;
BEGIN
  -- Viagens sem owner em trip_members
  SELECT COUNT(*) INTO v_trips_without_owner
  FROM trips t
  LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.role = 'owner'
  WHERE tm.id IS NULL;
  
  -- Owners não em trip_members
  SELECT COUNT(*) INTO v_owners_not_in_members
  FROM trips t
  LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = t.owner_id
  WHERE tm.id IS NULL;
  
  -- Duplicatas
  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT trip_id, user_id, COUNT(*) as cnt
    FROM trip_members
    GROUP BY trip_id, user_id
    HAVING COUNT(*) > 1
  ) sub;
  
  -- Convites aceitos sem membro
  SELECT COUNT(*) INTO v_accepted_without_member
  FROM trip_invitations ti
  LEFT JOIN trip_members tm ON tm.trip_id = ti.trip_id AND tm.user_id = ti.invitee_id
  WHERE ti.status = 'accepted' AND tm.id IS NULL;
  
  -- Viagens com múltiplos owners
  SELECT COUNT(*) INTO v_multiple_owners
  FROM (
    SELECT trip_id, COUNT(*) as cnt
    FROM trip_members
    WHERE role = 'owner'
    GROUP BY trip_id
    HAVING COUNT(*) > 1
  ) sub;
  
  -- Reportar resultados
  RAISE NOTICE '=== VALIDAÇÃO DO SISTEMA DE VIAGENS ===';
  RAISE NOTICE 'Viagens sem owner: %', v_trips_without_owner;
  RAISE NOTICE 'Owners não em trip_members: %', v_owners_not_in_members;
  RAISE NOTICE 'Duplicatas em trip_members: %', v_duplicates;
  RAISE NOTICE 'Convites aceitos sem membro: %', v_accepted_without_member;
  RAISE NOTICE 'Viagens com múltiplos owners: %', v_multiple_owners;
  
  IF v_trips_without_owner > 0 OR v_owners_not_in_members > 0 OR 
     v_duplicates > 0 OR v_accepted_without_member > 0 OR v_multiple_owners > 0 THEN
    RAISE WARNING 'Ainda existem problemas de integridade! Execute o script de validação para detalhes.';
  ELSE
    RAISE NOTICE 'Todos os problemas foram corrigidos! ✓';
  END IF;
END $$;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON TABLE trip_members IS 'Membros de viagens. Cada viagem deve ter exatamente um owner e pode ter vários members. Constraint UNIQUE(trip_id, user_id) evita duplicatas.';
COMMENT ON TABLE trip_invitations IS 'Convites para participar de viagens. Quando aceito, trigger adiciona membro em trip_members automaticamente.';
