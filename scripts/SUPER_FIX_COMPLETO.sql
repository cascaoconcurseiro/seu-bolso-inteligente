-- =====================================================
-- 🚀 SUPER FIX COMPLETO - TRANSAÇÕES COMPARTILHADAS
-- =====================================================
-- Este script configura TODO o banco de dados para
-- transações compartilhadas funcionarem perfeitamente
-- =====================================================
-- COPIE E COLE NO SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/sql
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICAR ESTADO ATUAL
-- =====================================================

SELECT '🔍 VERIFICANDO ESTADO ATUAL...' as status;

-- Ver usuários
SELECT 
  '👤 USUÁRIOS' as tipo,
  COUNT(*) as total
FROM auth.users;

-- Ver profiles
SELECT 
  '📋 PROFILES' as tipo,
  COUNT(*) as total,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as sem_nome
FROM profiles;

-- Ver membros da família
SELECT 
  '👨‍👩‍👧‍👦 MEMBROS DA FAMÍLIA' as tipo,
  COUNT(*) as total
FROM family_members;

-- =====================================================
-- PARTE 2: CORRIGIR PROFILES
-- =====================================================

SELECT '🔧 CORRIGINDO PROFILES...' as status;

-- Atualizar profiles com full_name NULL
UPDATE profiles
SET 
  full_name = INITCAP(SPLIT_PART(email, '@', 1)),
  updated_at = NOW()
WHERE full_name IS NULL OR full_name = '';

-- Verificar correção
SELECT 
  '✅ PROFILES CORRIGIDOS' as status,
  email,
  full_name
FROM profiles
ORDER BY created_at DESC;

-- =====================================================
-- PARTE 3: CORRIGIR TRIGGER DE NOVOS USUÁRIOS
-- =====================================================

SELECT '🔧 CONFIGURANDO TRIGGER PARA NOVOS USUÁRIOS...' as status;

-- Remover trigger antigo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar função
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
  
  -- Se não encontrou, usar parte do email
  IF extracted_name IS NULL OR extracted_name = '' THEN
    extracted_name := INITCAP(SPLIT_PART(NEW.email, '@', 1));
  END IF;
  
  -- Criar profile
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

SELECT '✅ TRIGGER CONFIGURADO' as status;

-- =====================================================
-- PARTE 4: CONFIGURAR SISTEMA DE ESPELHAMENTO
-- =====================================================

SELECT '🔧 CONFIGURANDO SISTEMA DE ESPELHAMENTO...' as status;

-- Remover triggers antigos
DROP TRIGGER IF EXISTS trigger_create_mirrors_on_insert ON transaction_splits;
DROP TRIGGER IF EXISTS trigger_create_mirrors_on_update ON transaction_splits;
DROP TRIGGER IF EXISTS on_transaction_split_created ON transaction_splits;
DROP TRIGGER IF EXISTS on_transaction_split_updated ON transaction_splits;

-- Remover funções antigas
DROP FUNCTION IF EXISTS create_transaction_mirrors() CASCADE;
DROP FUNCTION IF EXISTS handle_transaction_split() CASCADE;

-- Criar função de espelhamento SIMPLIFICADA
CREATE OR REPLACE FUNCTION create_transaction_mirrors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  original_transaction transactions%ROWTYPE;
  member_record family_members%ROWTYPE;
  member_user_id uuid;
BEGIN
  -- Buscar transação original
  SELECT * INTO original_transaction
  FROM transactions
  WHERE id = NEW.transaction_id;
  
  -- Se não é compartilhada, não fazer nada
  IF NOT original_transaction.is_shared THEN
    RETURN NEW;
  END IF;
  
  -- Buscar membro da família
  SELECT * INTO member_record
  FROM family_members
  WHERE id = NEW.member_id;
  
  -- Determinar user_id do membro
  member_user_id := COALESCE(member_record.user_id, member_record.linked_user_id);
  
  -- Se membro não tem user_id, não criar espelho
  IF member_user_id IS NULL THEN
    RAISE NOTICE 'Membro % não tem user_id vinculado', NEW.member_id;
    RETURN NEW;
  END IF;
  
  -- Se o membro é o próprio criador, não criar espelho
  IF member_user_id = original_transaction.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se espelho já existe
  IF EXISTS (
    SELECT 1 FROM transactions
    WHERE source_transaction_id = NEW.transaction_id
    AND user_id = member_user_id
  ) THEN
    RAISE NOTICE 'Espelho já existe para transação % e usuário %', NEW.transaction_id, member_user_id;
    RETURN NEW;
  END IF;
  
  -- Criar transação espelhada
  INSERT INTO transactions (
    user_id,
    account_id,
    category_id,
    trip_id,
    amount,
    description,
    date,
    type,
    domain,
    is_shared,
    payer_id,
    source_transaction_id,
    is_installment,
    current_installment,
    total_installments,
    series_id,
    notes,
    created_at,
    updated_at
  ) VALUES (
    member_user_id,                           -- user_id do membro
    NULL,                                      -- account_id (espelho não tem conta)
    original_transaction.category_id,
    original_transaction.trip_id,
    NEW.amount,                                -- valor do split
    original_transaction.description,
    original_transaction.date,
    original_transaction.type,
    original_transaction.domain,
    true,                                      -- is_shared
    original_transaction.user_id,              -- payer_id (quem pagou)
    NEW.transaction_id,                        -- source_transaction_id
    original_transaction.is_installment,
    original_transaction.current_installment,
    original_transaction.total_installments,
    original_transaction.series_id,
    'Espelho de transação compartilhada',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Espelho criado: transação % para usuário %', NEW.transaction_id, member_user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para INSERT
CREATE TRIGGER trigger_create_mirrors_on_insert
  AFTER INSERT ON transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_mirrors();

-- Criar trigger para UPDATE
CREATE TRIGGER trigger_create_mirrors_on_update
  AFTER UPDATE ON transaction_splits
  FOR EACH ROW
  WHEN (OLD.amount IS DISTINCT FROM NEW.amount OR OLD.member_id IS DISTINCT FROM NEW.member_id)
  EXECUTE FUNCTION create_transaction_mirrors();

SELECT '✅ SISTEMA DE ESPELHAMENTO CONFIGURADO' as status;

-- =====================================================
-- PARTE 5: VERIFICAR MEMBROS DA FAMÍLIA
-- =====================================================

SELECT '🔧 VERIFICANDO MEMBROS DA FAMÍLIA...' as status;

-- Ver membros e seus vínculos
SELECT 
  fm.id,
  fm.name,
  fm.email,
  fm.user_id,
  fm.linked_user_id,
  p.email as profile_email,
  p.full_name as profile_name,
  CASE 
    WHEN fm.user_id IS NOT NULL OR fm.linked_user_id IS NOT NULL THEN '✅ VINCULADO'
    ELSE '❌ SEM VÍNCULO'
  END as status
FROM family_members fm
LEFT JOIN profiles p ON p.id = COALESCE(fm.user_id, fm.linked_user_id)
ORDER BY fm.created_at DESC;

-- Tentar vincular membros automaticamente pelo email
UPDATE family_members fm
SET linked_user_id = p.id
FROM profiles p
WHERE fm.email = p.email
AND fm.user_id IS NULL
AND fm.linked_user_id IS NULL;

SELECT '✅ MEMBROS VERIFICADOS E VINCULADOS' as status;

-- =====================================================
-- PARTE 6: LIMPAR TRANSAÇÕES ANTIGAS (OPCIONAL)
-- =====================================================

SELECT '🔧 LIMPANDO TRANSAÇÕES DE TESTE...' as status;

-- Remover transações de teste antigas (CUIDADO!)
-- Descomente apenas se quiser limpar tudo e começar do zero
-- DELETE FROM transaction_splits;
-- DELETE FROM transactions;

SELECT '⚠️ Transações antigas mantidas (descomente para limpar)' as status;

-- =====================================================
-- PARTE 7: VERIFICAÇÃO FINAL
-- =====================================================

SELECT '🎉 VERIFICAÇÃO FINAL...' as status;

-- Resumo geral
SELECT 
  '📊 RESUMO GERAL' as tipo,
  (SELECT COUNT(*) FROM auth.users) as usuarios,
  (SELECT COUNT(*) FROM profiles WHERE full_name IS NOT NULL) as profiles_ok,
  (SELECT COUNT(*) FROM family_members WHERE user_id IS NOT NULL OR linked_user_id IS NOT NULL) as membros_vinculados,
  (SELECT COUNT(*) FROM transactions WHERE is_shared = true AND source_transaction_id IS NULL) as transacoes_originais,
  (SELECT COUNT(*) FROM transactions WHERE source_transaction_id IS NOT NULL) as espelhos,
  (SELECT COUNT(*) FROM transaction_splits) as splits;

-- Ver triggers ativos
SELECT 
  '🔧 TRIGGERS ATIVOS' as tipo,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname LIKE '%mirror%' OR tgname LIKE '%user%'
ORDER BY tgname;

-- Ver funções criadas
SELECT 
  '⚙️ FUNÇÕES CRIADAS' as tipo,
  proname as function_name
FROM pg_proc
WHERE proname IN ('handle_new_user', 'create_transaction_mirrors');

-- =====================================================
-- ✅ SCRIPT COMPLETO EXECUTADO
-- =====================================================

SELECT '
🎉 CONFIGURAÇÃO COMPLETA!

✅ Profiles corrigidos
✅ Trigger de novos usuários configurado
✅ Sistema de espelhamento configurado
✅ Membros da família vinculados

📝 PRÓXIMOS PASSOS:

1. Recarregue o aplicativo (F5)
2. Vá em "Família" → "Adicionar Membro"
3. Digite o email: francy.von@gmail.com
4. Deve aparecer: ✅ "Usuário cadastrado"
5. Crie uma transação compartilhada
6. Verifique os logs no console (F12)
7. Faça login com o outro usuário
8. Veja a transação em "Compartilhados"

🐛 SE NÃO FUNCIONAR:
- Abra o console (F12)
- Veja os logs de debug
- Execute as queries de verificação abaixo

' as instrucoes;

-- =====================================================
-- QUERIES DE VERIFICAÇÃO (COPIE E EXECUTE SEPARADAMENTE)
-- =====================================================

-- Ver última transação compartilhada
-- SELECT * FROM transactions WHERE is_shared = true AND source_transaction_id IS NULL ORDER BY created_at DESC LIMIT 1;

-- Ver splits da última transação
-- SELECT ts.*, fm.name, fm.email FROM transaction_splits ts LEFT JOIN family_members fm ON fm.id = ts.member_id ORDER BY ts.created_at DESC LIMIT 5;

-- Ver espelhos criados
-- SELECT * FROM transactions WHERE source_transaction_id IS NOT NULL ORDER BY created_at DESC LIMIT 5;

-- Ver profiles
-- SELECT id, email, full_name FROM profiles ORDER BY created_at DESC;

-- Ver membros da família
-- SELECT fm.*, p.email as profile_email FROM family_members fm LEFT JOIN profiles p ON p.id = COALESCE(fm.user_id, fm.linked_user_id) ORDER BY fm.created_at DESC;
