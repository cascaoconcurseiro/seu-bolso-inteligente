-- =====================================================
-- APLICAR AGORA: Correção full_name NULL
-- =====================================================
-- COPIE E COLE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/sql
-- =====================================================

-- PASSO 1: Verificar estado atual
-- =====================================================
SELECT 
  '🔍 ANTES DA CORREÇÃO' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sem_nome,
  COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as com_nome
FROM profiles;

-- Ver profiles atuais
SELECT 
  email,
  full_name,
  CASE 
    WHEN full_name IS NULL OR full_name = '' THEN '❌ NULL/VAZIO'
    ELSE '✅ OK'
  END as status
FROM profiles
ORDER BY created_at DESC;

-- =====================================================
-- PASSO 2: CORRIGIR PROFILES EXISTENTES
-- =====================================================

-- Atualizar TODOS os profiles com full_name NULL ou vazio
UPDATE profiles
SET 
  full_name = INITCAP(SPLIT_PART(email, '@', 1)),
  updated_at = NOW()
WHERE full_name IS NULL OR full_name = '';

-- =====================================================
-- PASSO 3: CORRIGIR TRIGGER PARA NOVOS USUÁRIOS
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
  
  -- Criar profile com full_name SEMPRE preenchido
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

-- =====================================================
-- PASSO 4: VERIFICAR RESULTADO
-- =====================================================

SELECT 
  '✅ DEPOIS DA CORREÇÃO' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sem_nome,
  COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as com_nome
FROM profiles;

-- Ver profiles corrigidos
SELECT 
  email,
  full_name,
  '✅ CORRIGIDO' as status
FROM profiles
ORDER BY created_at DESC;

-- =====================================================
-- PASSO 5: VERIFICAR TRIGGER
-- =====================================================

SELECT 
  '✅ Trigger configurado' as status,
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'on_auth_user_created';

-- =====================================================
-- ✅ SCRIPT COMPLETO - PRONTO PARA USAR
-- =====================================================
-- Resultado esperado:
-- - Todos os profiles com full_name preenchido
-- - Trigger configurado para novos usuários
-- - Sistema funcionando para TODOS os usuários (atuais e futuros)
-- =====================================================
