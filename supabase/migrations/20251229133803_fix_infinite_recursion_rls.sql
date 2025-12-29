-- Remover policy problemática
DROP POLICY IF EXISTS "Members can view their families" ON families;

-- Criar policy mais simples sem recursão
-- Permitir ver família se é owner OU se tem convite pendente
CREATE POLICY "Users can view families they own or are invited to"
ON families
FOR SELECT
TO public
USING (
  owner_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM family_invitations
    WHERE family_invitations.family_id = families.id
      AND family_invitations.to_user_id = auth.uid()
      AND family_invitations.status = 'pending'
  )
);;
