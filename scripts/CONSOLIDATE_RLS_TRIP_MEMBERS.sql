-- ============================================================================
-- Script: Consolidação de Políticas RLS Duplicadas na Tabela trip_members
-- Data: 2024-12-27
-- Descrição: Remove políticas RLS duplicadas e cria políticas consolidadas
--            para INSERT e SELECT na tabela trip_members
-- ============================================================================

-- IMPORTANTE: Fazer backup antes de executar!
-- Este script remove políticas existentes e cria novas consolidadas

BEGIN;

-- ============================================================================
-- PASSO 1: Remover Políticas Duplicadas
-- ============================================================================

-- Remover políticas INSERT duplicadas
DROP POLICY IF EXISTS "Trip owners and invited users can add members" ON trip_members;
DROP POLICY IF EXISTS "Trip owners and system can add members" ON trip_members;

-- Remover políticas SELECT duplicadas
DROP POLICY IF EXISTS "Users can view trip members" ON trip_members;
DROP POLICY IF EXISTS "Users can view trip members of their trips" ON trip_members;

-- ============================================================================
-- PASSO 2: Criar Políticas Consolidadas
-- ============================================================================

-- Nova política INSERT consolidada
-- Permite:
-- 1. Donos da viagem podem adicionar qualquer membro
-- 2. Usuários podem se adicionar se tiverem convite aceito
CREATE POLICY "Users can add trip members"
ON trip_members
FOR INSERT
WITH CHECK (
  -- Donos da viagem podem adicionar qualquer membro
  (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_members.trip_id 
    AND trips.owner_id = auth.uid()
  ))
  OR
  -- Usuários podem se adicionar se tiverem convite aceito
  (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM trip_invitations
      WHERE trip_invitations.trip_id = trip_members.trip_id
      AND trip_invitations.invitee_id = auth.uid()
      AND trip_invitations.status = 'accepted'
    )
  )
);

-- Nova política SELECT consolidada
-- Permite usuários verem membros de viagens onde são participantes
CREATE POLICY "Users can view members of their trips"
ON trip_members
FOR SELECT
USING (
  -- Usuários podem ver membros de viagens onde são participantes
  trip_id IN (
    SELECT tm.trip_id FROM trip_members tm
    WHERE tm.user_id = auth.uid()
  )
);

-- ============================================================================
-- PASSO 3: Verificar Políticas Existentes
-- ============================================================================

-- Listar todas as políticas da tabela trip_members para validação
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'trip_members'
ORDER BY cmd, policyname;

COMMIT;

-- ============================================================================
-- ROLLBACK (se necessário)
-- ============================================================================
-- Se houver problemas, execute o script abaixo para reverter:
/*
BEGIN;

-- Remover políticas consolidadas
DROP POLICY IF EXISTS "Users can add trip members" ON trip_members;
DROP POLICY IF EXISTS "Users can view members of their trips" ON trip_members;

-- Recriar políticas antigas INSERT
CREATE POLICY "Trip owners and invited users can add members"
ON trip_members
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_members.trip_id 
    AND trips.owner_id = auth.uid()
  ))
  OR
  (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM trip_invitations
      WHERE trip_invitations.trip_id = trip_members.trip_id
      AND trip_invitations.invitee_id = auth.uid()
      AND trip_invitations.status = 'accepted'
    )
  )
);

CREATE POLICY "Trip owners and system can add members"
ON trip_members
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_members.trip_id 
    AND t.owner_id = auth.uid()
  ))
  OR
  (user_id = auth.uid())
);

-- Recriar políticas antigas SELECT
CREATE POLICY "Users can view trip members"
ON trip_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_members.trip_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view trip members of their trips"
ON trip_members
FOR SELECT
USING (
  (user_id = auth.uid())
  OR
  (trip_id IN (
    SELECT trips.id FROM trips
    WHERE trips.owner_id = auth.uid()
  ))
  OR
  (trip_id IN (
    SELECT trip_invitations.trip_id FROM trip_invitations
    WHERE trip_invitations.invitee_id = auth.uid()
    AND trip_invitations.status = 'accepted'
  ))
);

COMMIT;
*/

-- ============================================================================
-- TESTES DE VALIDAÇÃO
-- ============================================================================
-- Após aplicar o script, execute os seguintes testes:
--
-- 1. Teste: Dono pode adicionar membros
--    - Criar viagem como usuário A
--    - Adicionar usuário B como membro
--    - Verificar que inserção foi bem-sucedida
--
-- 2. Teste: Convidado aceito pode se adicionar
--    - Criar viagem como usuário A
--    - Enviar convite para usuário B
--    - Aceitar convite como usuário B
--    - Verificar que usuário B foi adicionado em trip_members
--
-- 3. Teste: Usuário sem convite não pode se adicionar
--    - Criar viagem como usuário A
--    - Tentar adicionar usuário C (sem convite) em trip_members
--    - Verificar que inserção falha com erro de permissão
--
-- 4. Teste: Membros podem ver outros membros
--    - Criar viagem com múltiplos membros
--    - Query trip_members como cada membro
--    - Verificar que todos veem todos os membros
--
-- 5. Teste: Não-membros não podem ver membros
--    - Criar viagem como usuário A
--    - Query trip_members como usuário C (não membro)
--    - Verificar que query retorna vazio
