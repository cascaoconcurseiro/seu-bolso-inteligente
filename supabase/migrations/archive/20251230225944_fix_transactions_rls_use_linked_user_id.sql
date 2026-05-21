-- Corrigir política RLS de transactions para usar linked_user_id

-- 1. Dropar política antiga
DROP POLICY IF EXISTS "Users can view transactions" ON transactions;

-- 2. Criar nova política usando linked_user_id
CREATE POLICY "Users can view transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
  -- Próprias transações
  user_id = auth.uid()
  OR
  -- Transações de membros da família
  EXISTS (
    SELECT 1
    FROM family_members fm
    WHERE fm.linked_user_id = auth.uid() -- Usar linked_user_id
      AND fm.family_id IN (
        SELECT family_id
        FROM family_members
        WHERE linked_user_id = transactions.user_id -- Usar linked_user_id
      )
      AND (
        fm.role = 'admin'
        OR (
          fm.role IN ('editor', 'viewer')
          AND transactions.is_shared = true
        )
      )
  )
);

-- 3. Atualizar política de UPDATE
DROP POLICY IF EXISTS "Users can update transactions" ON transactions;

CREATE POLICY "Users can update transactions"
ON transactions
FOR UPDATE
TO authenticated
USING (
  -- Próprias transações
  user_id = auth.uid()
  OR
  -- Transações espelho
  (source_transaction_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Transações de membros da família (admin ou editor)
  EXISTS (
    SELECT 1
    FROM family_members fm
    WHERE fm.linked_user_id = auth.uid() -- Usar linked_user_id
      AND fm.family_id IN (
        SELECT family_id
        FROM family_members
        WHERE linked_user_id = transactions.user_id -- Usar linked_user_id
      )
      AND fm.role IN ('admin', 'editor')
  )
);

-- 4. Atualizar política de DELETE
DROP POLICY IF EXISTS "Users can delete transactions" ON transactions;

CREATE POLICY "Users can delete transactions"
ON transactions
FOR DELETE
TO authenticated
USING (
  -- Próprias transações
  user_id = auth.uid()
  OR
  -- Transações de membros da família (apenas admin)
  EXISTS (
    SELECT 1
    FROM family_members fm
    WHERE fm.linked_user_id = auth.uid() -- Usar linked_user_id
      AND fm.family_id IN (
        SELECT family_id
        FROM family_members
        WHERE linked_user_id = transactions.user_id -- Usar linked_user_id
      )
      AND fm.role = 'admin'
  )
);;
