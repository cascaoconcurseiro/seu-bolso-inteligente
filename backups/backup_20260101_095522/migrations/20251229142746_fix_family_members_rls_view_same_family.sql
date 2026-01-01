-- Permitir que membros da mesma família vejam uns aos outros
-- Esta é a correção CRÍTICA para o sistema de família

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Members can view other members of same family" ON family_members;

-- Criar nova política que permite membros verem outros membros da mesma família
CREATE POLICY "Members can view other members of same family"
ON family_members
FOR SELECT
TO authenticated
USING (
  -- Membros podem ver outros membros da mesma família
  family_id IN (
    SELECT family_id 
    FROM family_members
    WHERE linked_user_id = (SELECT auth.uid())
      AND status = 'active'
  )
);

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_family_members_lookup 
ON family_members(family_id, linked_user_id, status) 
WHERE status = 'active';;
