-- =====================================================
-- CORREÇÃO: Políticas RLS de family_members
-- =====================================================
-- Problema: Recursão infinita ao atualizar permissões
-- Solução: Simplificar políticas e remover recursão
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Family owners can manage members" ON family_members;
DROP POLICY IF EXISTS "Users can view family members" ON family_members;
DROP POLICY IF EXISTS "family_members_can_update_avatar" ON family_members;
DROP POLICY IF EXISTS "family_members_can_update_role" ON family_members;

-- =====================================================
-- POLÍTICA 1: SELECT (Visualizar)
-- =====================================================
-- Usuário pode ver membros se:
-- 1. É dono da família
-- 2. É o próprio membro
-- 3. Está vinculado ao membro

CREATE POLICY "family_members_select_policy"
ON family_members
FOR SELECT
USING (
  -- É dono da família
  EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = family_members.family_id
    AND f.owner_id = auth.uid()
  )
  OR
  -- É o próprio membro
  user_id = auth.uid()
  OR
  -- Está vinculado ao membro
  linked_user_id = auth.uid()
);

-- =====================================================
-- POLÍTICA 2: INSERT (Adicionar membros)
-- =====================================================
-- Apenas dono da família pode adicionar membros

CREATE POLICY "family_members_insert_policy"
ON family_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = family_members.family_id
    AND f.owner_id = auth.uid()
  )
);

-- =====================================================
-- POLÍTICA 3: UPDATE (Atualizar)
-- =====================================================
-- Usuário pode atualizar se:
-- 1. É dono da família (pode atualizar tudo)
-- 2. É o próprio membro (pode atualizar avatar apenas)

CREATE POLICY "family_members_update_policy"
ON family_members
FOR UPDATE
USING (
  -- É dono da família (pode atualizar tudo)
  EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = family_members.family_id
    AND f.owner_id = auth.uid()
  )
  OR
  -- É o próprio membro (pode atualizar avatar)
  (user_id = auth.uid() OR linked_user_id = auth.uid())
)
WITH CHECK (
  -- É dono da família (pode atualizar tudo)
  EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = family_members.family_id
    AND f.owner_id = auth.uid()
  )
  OR
  -- É o próprio membro (pode atualizar avatar apenas)
  (user_id = auth.uid() OR linked_user_id = auth.uid())
);

-- =====================================================
-- POLÍTICA 4: DELETE (Remover membros)
-- =====================================================
-- Apenas dono da família pode remover membros

CREATE POLICY "family_members_delete_policy"
ON family_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM families f
    WHERE f.id = family_members.family_id
    AND f.owner_id = auth.uid()
  )
);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Visualizar'
    WHEN cmd = 'INSERT' THEN '✅ Adicionar'
    WHEN cmd = 'UPDATE' THEN '✅ Atualizar'
    WHEN cmd = 'DELETE' THEN '✅ Remover'
  END as acao
FROM pg_policies
WHERE tablename = 'family_members'
ORDER BY cmd;;
