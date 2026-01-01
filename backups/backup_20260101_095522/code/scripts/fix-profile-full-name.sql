-- =====================================================
-- FIX: Corrigir full_name NULL nos profiles
-- =====================================================
-- Data: 26/12/2024
-- Problema: Profiles criados com full_name NULL
-- Solução: Atualizar profiles existentes e corrigir trigger
-- =====================================================

-- 1. Atualizar profiles existentes com full_name NULL
-- =====================================================
-- IMPORTANTE: O sistema usa EMAIL como identificador único
-- O nome é apenas para exibição e será puxado do que está cadastrado

-- Atualizar profiles com full_name NULL (usa parte do email como fallback)
-- Isso garante que sempre haverá um nome para exibir
UPDATE profiles
SET full_name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE full_name IS NULL OR full_name = '';

-- 2. Verificar profiles atualizados
-- =====================================================

SELECT 
  id,
  email,
  full_name,
  CASE 
    WHEN full_name IS NOT NULL THEN '✅ OK'
    ELSE '❌ NULL'
  END as status
FROM profiles
ORDER BY created_at DESC;

-- 3. Corrigir trigger handle_new_user para sempre preencher full_name
-- =====================================================

-- Remover trigger antigo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar função com lógica melhorada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extracted_name text;
BEGIN
  -- Tentar extrair nome do metadata
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name'
  );
  
  -- Se não encontrou no metadata, usar parte do email
  IF extracted_name IS NULL OR extracted_name = '' THEN
    extracted_name := INITCAP(SPLIT_PART(NEW.email, '@', 1));
  END IF;
  
  -- Criar profile com full_name garantido
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    extracted_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name, extracted_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Adicionar constraint para prevenir full_name NULL no futuro
-- =====================================================

-- Adicionar constraint NOT NULL (com valor padrão para casos existentes)
ALTER TABLE profiles 
ALTER COLUMN full_name SET DEFAULT 'Usuário';

-- Nota: Não adicionamos NOT NULL constraint porque pode quebrar inserts existentes
-- Mas o trigger agora garante que sempre será preenchido

-- 5. Verificação final
-- =====================================================

SELECT 
  '✅ Profiles atualizados' as status,
  COUNT(*) as total,
  COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as com_nome,
  COUNT(CASE WHEN full_name IS NULL THEN 1 END) as sem_nome
FROM profiles;

-- 6. Testar trigger com novo usuário (OPCIONAL - apenas para teste)
-- =====================================================

-- Para testar, você pode criar um usuário de teste no dashboard do Supabase
-- e verificar se o full_name é preenchido automaticamente

-- =====================================================
-- ✅ SCRIPT COMPLETO
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- Projeto: vrrcagukyfnlhxuvnssp
-- URL: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/sql
-- =====================================================
