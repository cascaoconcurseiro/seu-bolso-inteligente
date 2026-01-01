-- =====================================================
-- DIAGNÓSTICO COMPLETO: Sistema de Espelhamento
-- Data: 27/12/2024
-- Baseado nos 7 problemas clássicos de espelhamento
-- =====================================================

-- =====================================================
-- 1️⃣ VERIFICAR SE TRIGGERS ESTÃO DISPARANDO
-- =====================================================
SELECT 
  '1️⃣ VERIFICAÇÃO DE TRIGGERS' as diagnostico;

-- Listar todos os triggers na tabela transactions
SELECT 
  tgname as trigger_name,
  CASE 
    WHEN tgtype::int & 1 = 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END as level,
  CASE 
    WHEN tgtype::int & 2 = 2 THEN 'BEFORE'
    WHEN tgtype::int & 64 = 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE 
    WHEN tgtype::int & 4 = 4 THEN 'INSERT'
    WHEN tgtype::int & 8 = 8 THEN 'DELETE'
    WHEN tgtype::int & 16 = 16 THEN 'UPDATE'
    ELSE 'MULTIPLE'
  END as event,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'public.transactions'::regclass
AND tgname NOT LIKE 'RI_%'
ORDER BY tgname;

-- ⚠️ PROBLEMA ESPERADO:
-- - Trigger só para INSERT (falta UPDATE)
-- - Trigger BEFORE quando deveria ser AFTER
-- - Trigger desabilitado (tgenabled = 'D')

-- =====================================================
-- 2️⃣ VERIFICAR SECURITY DEFINER
-- =====================================================
SELECT 
  '2️⃣ VERIFICAÇÃO DE SECURITY DEFINER' as diagnostico;

-- Listar funções relacionadas a espelhamento
SELECT 
  proname as function_name,
  prosecdef as has_security_definer,
  CASE 
    WHEN prosecdef THEN '✅ TEM SECURITY DEFINER'
    ELSE '❌ FALTA SECURITY DEFINER'
  END as status,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname ILIKE '%mirror%'
   OR proname ILIKE '%shared%transaction%'
   OR proname ILIKE '%sync%shared%'
ORDER BY proname;

-- ⚠️ PROBLEMA ESPERADO:
-- - Função sem SECURITY DEFINER = RLS bloqueia INSERT no outro usuário

-- =====================================================
-- 3️⃣ VERIFICAR RLS E POLÍTICAS
-- =====================================================
SELECT 
  '3️⃣ VERIFICAÇÃO DE RLS' as diagnostico;

-- Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('transactions', 'transaction_splits', 'family_members');

-- Listar políticas RLS em transactions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'transactions'
ORDER BY policyname;

-- ⚠️ PROBLEMA ESPERADO:
-- - Política INSERT usa auth.uid() = bloqueia espelho
-- - Falta política para SECURITY DEFINER bypass

-- =====================================================
-- 4️⃣ VERIFICAR GUARD CLAUSES
-- =====================================================
SELECT 
  '4️⃣ VERIFICAÇÃO DE GUARD CLAUSES' as diagnostico;

-- Buscar funções com guard clauses problemáticas
SELECT 
  proname,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE (proname ILIKE '%mirror%' OR proname ILIKE '%shared%')
AND pg_get_functiondef(oid) ILIKE '%source_transaction_id IS NOT NULL%RETURN%';

-- ⚠️ PROBLEMA ESPERADO:
-- - IF NEW.source_transaction_id IS NOT NULL THEN RETURN NEW
-- - Bloqueia espelhamento se campo vier preenchido

-- =====================================================
-- 5️⃣ VERIFICAR CAMPOS DE ATIVAÇÃO
-- =====================================================
SELECT 
  '5️⃣ VERIFICAÇÃO DE CAMPOS DE ATIVAÇÃO' as diagnostico;

-- Verificar transações que deveriam ter espelho mas não têm
SELECT 
  t.id,
  t.description,
  t.amount,
  t.is_shared,
  t.source_transaction_id,
  t.user_id,
  p.email as creator_email,
  COUNT(ts.id) as num_splits,
  COUNT(DISTINCT fm.user_id) as num_members_with_user_id,
  COUNT(m.id) as num_mirrors_created
FROM transactions t
LEFT JOIN profiles p ON p.id = t.user_id
LEFT JOIN transaction_splits ts ON ts.transaction_id = t.id
LEFT JOIN family_members fm ON fm.id = ts.member_id AND fm.user_id IS NOT NULL
LEFT JOIN transactions m ON m.source_transaction_id = t.id
WHERE t.is_shared = true
AND t.source_transaction_id IS NULL
GROUP BY t.id, t.description, t.amount, t.is_shared, t.source_transaction_id, t.user_id, p.email
HAVING COUNT(DISTINCT fm.user_id) > 0 AND COUNT(m.id) = 0
ORDER BY t.created_at DESC;

-- ⚠️ PROBLEMA ESPERADO:
-- - is_shared = true mas sem espelhos
-- - Splits existem mas membros sem user_id
-- - Campo shared_with_user_id vazio

-- =====================================================
-- 6️⃣ VERIFICAR FOREIGN KEYS
-- =====================================================
SELECT 
  '6️⃣ VERIFICAÇÃO DE FOREIGN KEYS' as diagnostico;

-- Listar constraints FK em transactions
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'transactions'
ORDER BY tc.constraint_name;

-- Verificar se há FKs que podem causar erro
SELECT 
  'Transações com trip_id inválido' as problema,
  COUNT(*) as total
FROM transactions t
WHERE t.trip_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM trips WHERE id = t.trip_id);

SELECT 
  'Transações com category_id inválido' as problema,
  COUNT(*) as total
FROM transactions t
WHERE t.category_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM categories WHERE id = t.category_id);

SELECT 
  'Transações com account_id inválido' as problema,
  COUNT(*) as total
FROM transactions t
WHERE t.account_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM accounts WHERE id = t.account_id);

-- ⚠️ PROBLEMA ESPERADO:
-- - FK de trip/category/account do usuário A não existe para usuário B
-- - Causa rollback silencioso

-- =====================================================
-- 7️⃣ VERIFICAR UPDATE vs INSERT
-- =====================================================
SELECT 
  '7️⃣ VERIFICAÇÃO DE UPDATE vs INSERT' as diagnostico;

-- Verificar se triggers cobrem UPDATE
SELECT 
  tgname,
  CASE 
    WHEN tgtype::int & 4 = 4 THEN 'INSERT'
    WHEN tgtype::int & 16 = 16 THEN 'UPDATE'
    WHEN tgtype::int & 8 = 8 THEN 'DELETE'
    ELSE 'MULTIPLE'
  END as event
FROM pg_trigger
WHERE tgrelid = 'public.transactions'::regclass
AND tgname ILIKE '%mirror%'
   OR tgname ILIKE '%shared%'
   OR tgname ILIKE '%sync%';

-- ⚠️ PROBLEMA ESPERADO:
-- - Trigger só para INSERT
-- - Usuário cria despesa, depois marca como compartilhada = UPDATE não dispara

-- =====================================================
-- RESUMO DO DIAGNÓSTICO
-- =====================================================
SELECT 
  '📊 RESUMO DO DIAGNÓSTICO' as titulo;

-- Estatísticas gerais
SELECT 
  'Transações compartilhadas (originais)' as tipo,
  COUNT(*) as total
FROM transactions
WHERE is_shared = true
AND source_transaction_id IS NULL;

SELECT 
  'Espelhos criados' as tipo,
  COUNT(*) as total
FROM transactions
WHERE source_transaction_id IS NOT NULL;

SELECT 
  'Splits existentes' as tipo,
  COUNT(*) as total
FROM transaction_splits;

SELECT 
  'Membros com user_id vinculado' as tipo,
  COUNT(*) as total
FROM family_members
WHERE user_id IS NOT NULL;

SELECT 
  'Membros com linked_user_id' as tipo,
  COUNT(*) as total
FROM family_members
WHERE linked_user_id IS NOT NULL;

-- Transações problemáticas
SELECT 
  'Transações compartilhadas SEM espelhos' as problema,
  COUNT(DISTINCT t.id) as total
FROM transactions t
LEFT JOIN transaction_splits ts ON ts.transaction_id = t.id
LEFT JOIN family_members fm ON fm.id = ts.member_id
LEFT JOIN transactions m ON m.source_transaction_id = t.id
WHERE t.is_shared = true
AND t.source_transaction_id IS NULL
AND (fm.user_id IS NOT NULL OR fm.linked_user_id IS NOT NULL)
AND m.id IS NULL;

-- =====================================================
-- PRÓXIMOS PASSOS
-- =====================================================
SELECT 
  '🔧 PRÓXIMOS PASSOS' as titulo;

SELECT 
  'Execute o script: scripts/FIX_ESPELHAMENTO_DEFINITIVO.sql' as acao,
  'Corrige todos os 7 problemas identificados' as descricao;
