-- Corrigir lógica da política RLS de transactions
-- Wesley pode ver transações de Fran se:
-- 1. Wesley é membro da família onde Fran é OWNER
-- 2. OU Fran é membro da família onde Wesley é OWNER

DROP POLICY IF EXISTS "Users can view transactions" ON transactions;

CREATE POLICY "Users can view transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
  -- Próprias transações
  user_id = auth.uid()
  OR
  -- Transações compartilhadas de membros da família
  (
    is_shared = true
    AND (
      -- Caso 1: Eu sou membro da família onde o criador da transação é owner
      EXISTS (
        SELECT 1
        FROM family_members fm
        JOIN families f ON f.id = fm.family_id
        WHERE fm.linked_user_id = auth.uid()
          AND f.owner_id = transactions.user_id
          AND fm.status = 'active'
      )
      OR
      -- Caso 2: O criador da transação é membro da minha família (onde eu sou owner)
      EXISTS (
        SELECT 1
        FROM family_members fm
        JOIN families f ON f.id = fm.family_id
        WHERE f.owner_id = auth.uid()
          AND fm.linked_user_id = transactions.user_id
          AND fm.status = 'active'
      )
    )
  )
);;
