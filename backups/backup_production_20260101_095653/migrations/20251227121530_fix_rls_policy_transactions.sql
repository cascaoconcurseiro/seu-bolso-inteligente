-- Corrigir RLS policy para permitir que membros da família vejam transações uns dos outros

-- Dropar policy antiga
DROP POLICY IF EXISTS "family_members_can_view_based_on_role" ON transactions;

-- Criar nova policy que considera linked_user_id
CREATE POLICY "family_members_can_view_based_on_role"
ON transactions
FOR SELECT
TO public
USING (
  -- Pode ver suas próprias transações
  user_id = auth.uid()
  OR
  -- Pode ver transações de membros da família
  EXISTS (
    SELECT 1
    FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = auth.uid()
    AND (
      -- Transação pertence ao owner da família
      f.owner_id = transactions.user_id
      OR
      -- Transação pertence a um membro da família (via user_id)
      EXISTS (
        SELECT 1
        FROM family_members fm2
        WHERE fm2.family_id = f.id
        AND fm2.user_id = transactions.user_id
      )
      OR
      -- NOVO: Transação pertence a um membro da família (via linked_user_id)
      EXISTS (
        SELECT 1
        FROM family_members fm2
        WHERE fm2.family_id = f.id
        AND fm2.linked_user_id = transactions.user_id
      )
    )
  )
);;
