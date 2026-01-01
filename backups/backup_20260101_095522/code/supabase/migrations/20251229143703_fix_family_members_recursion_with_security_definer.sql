-- Remover política problemática que causa recursão
DROP POLICY IF EXISTS "Members can view other members of same family" ON family_members;

-- Criar função SECURITY DEFINER para verificar se usuário é membro da família
CREATE OR REPLACE FUNCTION is_member_of_family(fam_id UUID, usr_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Verificar se o usuário é membro ativo da família
  RETURN EXISTS (
    SELECT 1 
    FROM family_members
    WHERE family_id = fam_id
      AND linked_user_id = usr_id
      AND status = 'active'
  );
END;
$$;

-- Criar nova política usando a função SECURITY DEFINER
CREATE POLICY "Members can view other members of same family"
ON family_members
FOR SELECT
TO authenticated
USING (
  -- Membros podem ver outros membros da mesma família
  is_member_of_family(family_id, (SELECT auth.uid()))
);;
