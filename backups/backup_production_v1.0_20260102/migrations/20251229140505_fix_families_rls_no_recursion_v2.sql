-- Remover política problemática
DROP POLICY IF EXISTS "Users can view their families" ON families;

-- Dropar e recriar função helper
DROP FUNCTION IF EXISTS is_family_member(UUID, UUID);

CREATE FUNCTION is_family_member(fam_id UUID, usr_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = fam_id
      AND linked_user_id = usr_id
      AND status = 'active'
  );
END;
$$;

-- Criar política simples sem recursão
CREATE POLICY "Users can view their families"
ON families
FOR SELECT
TO authenticated
USING (
  -- É o dono
  (SELECT auth.uid()) = owner_id
  OR
  -- É membro ativo (usando função)
  is_family_member(id, (SELECT auth.uid()))
);;
