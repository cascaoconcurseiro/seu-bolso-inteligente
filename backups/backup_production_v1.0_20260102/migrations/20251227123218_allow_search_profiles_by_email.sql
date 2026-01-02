-- Criar policy para permitir buscar outros usuários por email
CREATE POLICY "Users can search profiles by email"
ON profiles
FOR SELECT
TO public
USING (true);

-- Comentar
COMMENT ON POLICY "Users can search profiles by email" ON profiles IS 
'Permite que usuários busquem outros usuários por email para adicionar à família';;
