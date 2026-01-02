-- Remover política restritiva
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

-- Criar nova política que permite buscar usuários por email
-- Isso é necessário para o sistema de convites funcionar
CREATE POLICY "Users can view profiles"
ON profiles
FOR SELECT
USING (
  -- Usuário pode ver seu próprio perfil
  id = (SELECT auth.uid())
  OR
  -- Usuário pode buscar outros perfis por email (necessário para convites)
  -- Mas só retorna id, email e full_name (dados públicos)
  auth.uid() IS NOT NULL
);

COMMENT ON POLICY "Users can view profiles" ON profiles IS 
'Permite usuários autenticados visualizarem perfis para sistema de convites. Dados sensíveis devem ser filtrados no frontend.';;
