-- ============================================================================
-- AUDITORIA COMPLETA DO BANCO DE DADOS
-- Data: 31/12/2024
-- Objetivo: Identificar duplicidades, funções obsoletas e triggers desnecessários
-- ============================================================================

-- ============================================================================
-- PARTE 1: ANÁLISE DE TRIGGERS
-- ============================================================================

-- 1.1 Listar TODOS os triggers
SELECT 
    schemaname,
    tablename,
    triggername,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT tgisinternal
  AND schemaname = 'public'
ORDER BY tablename, triggername;

-- 1.2 Identificar triggers duplicados (mesmo nome, mesma tabela)
SELECT 
    tablename,
    triggername,
    COUNT(*) as count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT tgisinternal
  AND schemaname = 'public'
GROUP BY tablename, triggername
HAVING COUNT(*) > 1;

-- 1.3 Triggers na tabela transactions
SELECT 
    triggername,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'transactions'
  AND NOT tgisinternal
ORDER BY triggername;

-- 1.4 Triggers na tabela transaction_splits
SELECT 
    triggername,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'transaction_splits'
  AND NOT tgisinternal
ORDER BY triggername;

-- ============================================================================
-- PARTE 2: ANÁLISE DE FUNÇÕES
-- ============================================================================

-- 2.1 Listar TODAS as funções customizadas
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- 2.2 Funções relacionadas a espelhamento/mirroring
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (
    proname LIKE '%mirror%'
    OR proname LIKE '%espelh%'
    OR proname LIKE '%shared%'
    OR proname LIKE '%split%'
  )
ORDER BY proname;

-- 2.3 Funções que não são usadas por nenhum trigger
SELECT 
    p.proname as unused_function
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.prokind = 'f'
  AND NOT EXISTS (
    SELECT 1 
    FROM pg_trigger t 
    WHERE t.tgfoid = p.oid
  )
  AND p.proname NOT IN (
    -- Funções RPC usadas pelo frontend
    'create_account_with_initial_deposit',
    'create_transfer',
    'create_withdrawal',
    'recalculate_all_account_balances',
    'get_monthly_projection',
    'settle_shared_transaction'
  )
ORDER BY p.proname;

-- ============================================================================
-- PARTE 3: ANÁLISE DE DADOS DUPLICADOS
-- ============================================================================

-- 3.1 Splits duplicados (mesma transação, mesmo membro, mesmo valor)
SELECT 
    transaction_id,
    member_id,
    user_id,
    amount,
    COUNT(*) as duplicates,
    ARRAY_AGG(id) as split_ids
FROM transaction_splits
GROUP BY transaction_id, member_id, user_id, amount
HAVING COUNT(*) > 1;

-- 3.2 Transações espelhadas duplicadas (mesmo source_transaction_id, mesmo user)
SELECT 
    source_transaction_id,
    user_id,
    amount,
    COUNT(*) as duplicates,
    ARRAY_AGG(id) as mirror_ids
FROM transactions
WHERE source_transaction_id IS NOT NULL
GROUP BY source_transaction_id, user_id, amount
HAVING COUNT(*) > 1;

-- 3.3 Entradas de ledger duplicadas
SELECT 
    transaction_id,
    user_id,
    entry_type,
    related_user_id,
    amount,
    COUNT(*) as duplicates,
    ARRAY_AGG(id) as ledger_ids
FROM financial_ledger
GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
HAVING COUNT(*) > 1;

-- 3.4 Membros de família duplicados (mesmo family_id, mesmo linked_user_id)
SELECT 
    family_id,
    linked_user_id,
    COUNT(*) as duplicates,
    ARRAY_AGG(id) as member_ids
FROM family_members
GROUP BY family_id, linked_user_id
HAVING COUNT(*) > 1;

-- 3.5 Convites de família duplicados (mesmo family_id, mesmo invited_email)
SELECT 
    family_id,
    invited_email,
    status,
    COUNT(*) as duplicates,
    ARRAY_AGG(id) as invitation_ids
FROM family_invitations
GROUP BY family_id, invited_email, status
HAVING COUNT(*) > 1;

-- ============================================================================
-- PARTE 4: ANÁLISE DE POLÍTICAS RLS
-- ============================================================================

-- 4.1 Listar todas as políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4.2 Políticas duplicadas (mesmo nome, mesma tabela)
SELECT 
    tablename,
    policyname,
    COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1;

-- 4.3 Políticas na tabela transactions
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'transactions'
ORDER BY policyname;

-- ============================================================================
-- PARTE 5: ANÁLISE DE ÍNDICES
-- ============================================================================

-- 5.1 Índices duplicados (mesmas colunas, mesma tabela)
SELECT 
    t.relname as table_name,
    i.relname as index_name,
    array_agg(a.attname ORDER BY a.attnum) as columns,
    COUNT(*) OVER (PARTITION BY t.relname, array_agg(a.attname ORDER BY a.attnum)) as duplicate_count
FROM pg_index ix
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relkind = 'r'
  AND t.relnamespace = 'public'::regnamespace
GROUP BY t.relname, i.relname, ix.indrelid
HAVING COUNT(*) OVER (PARTITION BY t.relname, array_agg(a.attname ORDER BY a.attnum)) > 1;

-- 5.2 Índices não utilizados (nunca foram escaneados)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY tablename, indexname;

-- ============================================================================
-- PARTE 6: ANÁLISE DE VIEWS
-- ============================================================================

-- 6.1 Listar todas as views
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- 6.2 Views que não são usadas (não aparecem em queries)
-- (Nota: Isso requer análise manual ou logs de query)
SELECT 
    viewname
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================================================
-- PARTE 7: ANÁLISE DE CONSTRAINTS
-- ============================================================================

-- 7.1 Foreign keys duplicadas
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    COUNT(*) OVER (PARTITION BY tc.table_name, kcu.column_name, ccu.table_name, ccu.column_name) as duplicate_count
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- PARTE 8: RESUMO EXECUTIVO
-- ============================================================================

-- 8.1 Contagem geral de objetos
SELECT 
    'Triggers' as object_type,
    COUNT(*) as total
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT tgisinternal AND n.nspname = 'public'

UNION ALL

SELECT 
    'Functions' as object_type,
    COUNT(*) as total
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.prokind = 'f'

UNION ALL

SELECT 
    'RLS Policies' as object_type,
    COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Indexes' as object_type,
    COUNT(*) as total
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Views' as object_type,
    COUNT(*) as total
FROM pg_views
WHERE schemaname = 'public';

-- ============================================================================
-- PARTE 9: TRIGGERS ESPECÍFICOS A INVESTIGAR
-- ============================================================================

-- 9.1 Verificar se existem triggers antigos de mirroring
SELECT 
    triggername,
    tablename
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT tgisinternal
  AND n.nspname = 'public'
  AND (
    triggername LIKE '%mirror%'
    OR triggername LIKE '%espelh%'
  )
ORDER BY tablename, triggername;

-- 9.2 Verificar triggers que chamam funções inexistentes
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND c.relnamespace = 'public'::regnamespace
  AND p.proname IS NULL;

-- ============================================================================
-- FIM DA AUDITORIA
-- ============================================================================
