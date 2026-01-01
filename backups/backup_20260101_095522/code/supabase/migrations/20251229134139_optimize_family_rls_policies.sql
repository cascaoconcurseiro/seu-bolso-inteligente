-- Remover políticas duplicadas e problemáticas
DROP POLICY IF EXISTS "Users can view own families" ON families;
DROP POLICY IF EXISTS "family_members_select_policy" ON family_members;
DROP POLICY IF EXISTS "family_members_insert_policy" ON family_members;
DROP POLICY IF EXISTS "family_members_update_policy" ON family_members;
DROP POLICY IF EXISTS "family_members_delete_policy" ON family_members;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_family_invitations_to_user ON family_invitations(to_user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_family_invitations_from_user ON family_invitations(from_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_linked_user ON family_members(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_families_owner_id ON families(owner_id);

-- Recriar políticas de family_members sem recursão
CREATE POLICY "Members can view their own records"
ON family_members
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT auth.uid()) = linked_user_id
);

CREATE POLICY "Family owners can view all members"
ON family_members
FOR SELECT
TO authenticated
USING (
  family_id IN (
    SELECT id FROM families
    WHERE owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Family owners can insert members"
ON family_members
FOR INSERT
TO authenticated
WITH CHECK (
  family_id IN (
    SELECT id FROM families
    WHERE owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Family owners can update members"
ON family_members
FOR UPDATE
TO authenticated
USING (
  family_id IN (
    SELECT id FROM families
    WHERE owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  family_id IN (
    SELECT id FROM families
    WHERE owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Members can update their own records"
ON family_members
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Family owners can delete members"
ON family_members
FOR DELETE
TO authenticated
USING (
  family_id IN (
    SELECT id FROM families
    WHERE owner_id = (SELECT auth.uid())
  )
);;
