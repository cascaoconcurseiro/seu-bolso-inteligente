-- OTIMIZAÇÃO DE PERFORMANCE DE BANCO DE DATAS E CONSOLIDAÇÃO DE POLÍTICAS RLS
-- Descrição: Otimização de RLS com (SELECT auth.uid()) e unificação de políticas concorrentes/duplicadas.

-- 1. OTIMIZAÇÃO DA TABELA transactions (SELECT)
-- Remover as políticas antigas
DROP POLICY IF EXISTS "transactions_select_v2" ON transactions;
DROP POLICY IF EXISTS "transactions_trip_members_select" ON transactions;

-- Criar a nova política de SELECT unificada e superotimizada
CREATE POLICY "transactions_unified_select" ON transactions FOR SELECT TO authenticated
USING (
  (user_id = (SELECT auth.uid())) OR 
  (creator_user_id = (SELECT auth.uid())) OR 
  (EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.user_id = transactions.user_id 
      AND is_family_member(family_members.family_id, (SELECT auth.uid()))
  )) OR
  (
    (trip_id IS NOT NULL) AND 
    (EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = transactions.trip_id 
        AND trip_members.user_id = (SELECT auth.uid())
    )) AND 
    (is_shared = true OR user_id = (SELECT auth.uid()) OR creator_user_id = (SELECT auth.uid()))
  )
);


-- 2. OTIMIZAÇÃO DA TABELA transaction_splits (SELECT)
-- A política "transaction_splits_manage_ssot" cobre ALL. Remover a SELECT redundante.
DROP POLICY IF EXISTS "transaction_splits_select_ssot" ON transaction_splits;


-- 3. OTIMIZAÇÃO DA TABELA family_members (SELECT)
-- Remover as políticas antigas
DROP POLICY IF EXISTS "Family owners can view all family members" ON family_members;
DROP POLICY IF EXISTS "family_members_select_v2" ON family_members;

-- Criar a nova política unificada
CREATE POLICY "family_members_unified_select" ON family_members FOR SELECT TO authenticated
USING (
  (user_id = (SELECT auth.uid())) OR 
  (linked_user_id = (SELECT auth.uid())) OR 
  is_family_member(family_id, (SELECT auth.uid())) OR
  (family_id IN (
    SELECT f.id FROM families f 
    WHERE f.owner_id = (SELECT auth.uid())
  ))
);


-- 4. OTIMIZAÇÃO DA TABELA family_invitations (UPDATE)
-- Remover as políticas antigas de UPDATE
DROP POLICY IF EXISTS "Users can update own sent invitations" ON family_invitations;
DROP POLICY IF EXISTS "Users can update received invitations" ON family_invitations;

-- Criar a política de UPDATE unificada e de alta performance
CREATE POLICY "family_invitations_unified_update" ON family_invitations FOR UPDATE TO authenticated
USING (
  (from_user_id = (SELECT auth.uid())) OR 
  (to_user_id = (SELECT auth.uid()))
)
WITH CHECK (
  (from_user_id = (SELECT auth.uid())) OR 
  (to_user_id = (SELECT auth.uid()))
);

-- Garantir que a política "Users can view own invitations" de family_invitations use a subquery otimizada (SELECT auth.uid())
DROP POLICY IF EXISTS "Users can view own invitations" ON family_invitations;
CREATE POLICY "Users can view own invitations" ON family_invitations FOR SELECT TO authenticated
USING (
  (from_user_id = (SELECT auth.uid())) OR 
  (to_user_id = (SELECT auth.uid()))
);
