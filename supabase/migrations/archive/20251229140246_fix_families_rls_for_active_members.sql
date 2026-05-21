-- Remover política antiga
DROP POLICY IF EXISTS "Users can view families they own or are invited to" ON families;

-- Criar nova política que permite ver se é dono OU membro ativo
CREATE POLICY "Users can view their families"
ON families
FOR SELECT
TO authenticated
USING (
  -- É o dono
  (SELECT auth.uid()) = owner_id
  OR
  -- É membro ativo da família
  EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = families.id
      AND family_members.linked_user_id = (SELECT auth.uid())
      AND family_members.status = 'active'
  )
  OR
  -- Tem convite pendente
  EXISTS (
    SELECT 1 FROM family_invitations
    WHERE family_invitations.family_id = families.id
      AND family_invitations.to_user_id = (SELECT auth.uid())
      AND family_invitations.status = 'pending'
  )
);;
