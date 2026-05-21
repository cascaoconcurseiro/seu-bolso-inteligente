-- Adicionar policy para membros verem a família
CREATE POLICY "Members can view their families"
ON families
FOR SELECT
TO public
USING (
  id IN (
    SELECT family_id 
    FROM family_members 
    WHERE linked_user_id = auth.uid() 
      AND status = 'active'
  )
  OR
  id IN (
    SELECT family_id 
    FROM family_invitations 
    WHERE to_user_id = auth.uid() 
      AND status = 'pending'
  )
);;
