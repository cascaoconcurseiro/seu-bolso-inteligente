-- ============================================================================
-- AUDITORIA SIMPLIFICADA - VERSÃO TESTADA
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAÇÃO RÁPIDA DE DUPLICADOS
-- ============================================================================

-- 1.1 Splits duplicados
SELECT 
    'SPLITS DUPLICADOS' as tipo,
    COUNT(*) as total
FROM (
    SELECT transaction_id, member_id, user_id, amount
    FROM transaction_splits
    GROUP BY transaction_id, member_id, user_id, amount
    HAVING COUNT(*) > 1
) t;

-- 1.2 Mirrors duplicados
SELECT 
    'MIRRORS DUPLICADOS' as tipo,
    COUNT(*) as total
FROM (
    SELECT source_transaction_id, user_id
    FROM transactions
    WHERE source_transaction_id IS NOT NULL
    GROUP BY source_transaction_id, user_id
    HAVING COUNT(*) > 1
) t;

-- 1.3 Ledger duplicado
SELECT 
    'LEDGER DUPLICADO' as tipo,
    COUNT(*) as total
FROM (
    SELECT transaction_id, user_id, entry_type, related_user_id, amount
    FROM financial_ledger
    GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
    HAVING COUNT(*) > 1
) t;

-- ============================================================================
-- 2. DETALHES DOS DUPLICADOS (SE HOUVER)
-- ============================================================================

-- 2.1 Detalhes dos splits duplicados
SELECT 
    transaction_id,
    member_id,
    user_id,
    amount,
    COUNT(*) as duplicatas,
    STRING_AGG(id::text, ', ' ORDER BY created_at) as ids
FROM transaction_splits
GROUP BY transaction_id, member_id, user_id, amount
HAVING COUNT(*) > 1;

-- 2.2 Detalhes dos mirrors duplicados
SELECT 
    source_transaction_id,
    user_id,
    amount,
    COUNT(*) as duplicatas,
    STRING_AGG(id::text, ', ' ORDER BY created_at) as ids
FROM transactions
WHERE source_transaction_id IS NOT NULL
GROUP BY source_transaction_id, user_id, amount
HAVING COUNT(*) > 1;

-- 2.3 Detalhes do ledger duplicado
SELECT 
    transaction_id,
    user_id,
    entry_type,
    amount,
    COUNT(*) as duplicatas,
    STRING_AGG(id::text, ', ' ORDER BY created_at) as ids
FROM financial_ledger
GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
HAVING COUNT(*) > 1;

-- ============================================================================
-- 3. CONTAGEM DE TRIGGERS
-- ============================================================================

SELECT 
    c.relname as tabela,
    COUNT(*) as total_triggers,
    STRING_AGG(t.tgname, ', ' ORDER BY t.tgname) as triggers
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal 
  AND c.relnamespace = 'public'::regnamespace
GROUP BY c.relname
ORDER BY c.relname;

-- ============================================================================
-- 4. TRIGGERS DE MIRRORING
-- ============================================================================

SELECT 
    c.relname as tabela,
    t.tgname as trigger_name,
    p.proname as funcao
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND c.relnamespace = 'public'::regnamespace
  AND (
    t.tgname LIKE '%mirror%'
    OR p.proname LIKE '%mirror%'
  )
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- 5. FUNÇÕES DE MIRRORING
-- ============================================================================

SELECT 
    proname as funcao,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgfoid = pg_proc.oid) as usado_em_triggers
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (
    proname LIKE '%mirror%'
    OR proname LIKE '%espelh%'
  )
ORDER BY proname;

-- ============================================================================
-- 6. FUNÇÕES NÃO USADAS POR TRIGGERS
-- ============================================================================

SELECT 
    p.proname as funcao_sem_trigger
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.prokind = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_trigger t WHERE t.tgfoid = p.oid
  )
  AND p.proname NOT IN (
    'create_account_with_initial_deposit',
    'create_transfer',
    'create_withdrawal',
    'recalculate_all_account_balances',
    'get_monthly_projection',
    'settle_shared_transaction',
    'calculate_account_balance',
    'search_profiles_by_email'
  )
  AND p.proname NOT LIKE 'pg_%'
  AND p.proname NOT LIKE 'uuid_%'
ORDER BY p.proname;

-- ============================================================================
-- 7. RESUMO GERAL
-- ============================================================================

SELECT 
    'Transações totais' as metrica,
    COUNT(*)::text as valor
FROM transactions

UNION ALL

SELECT 
    'Transações compartilhadas (originais)' as metrica,
    COUNT(*)::text as valor
FROM transactions
WHERE is_shared = true AND source_transaction_id IS NULL

UNION ALL

SELECT 
    'Transações espelhadas' as metrica,
    COUNT(*)::text as valor
FROM transactions
WHERE source_transaction_id IS NOT NULL

UNION ALL

SELECT 
    'Splits totais' as metrica,
    COUNT(*)::text as valor
FROM transaction_splits

UNION ALL

SELECT 
    'Entradas de ledger' as metrica,
    COUNT(*)::text as valor
FROM financial_ledger

UNION ALL

SELECT 
    'Triggers ativos' as metrica,
    COUNT(*)::text as valor
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace

UNION ALL

SELECT 
    'Funções customizadas' as metrica,
    COUNT(*)::text as valor
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND prokind = 'f';

-- ============================================================================
-- 8. STATUS FINAL
-- ============================================================================

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM (
            SELECT transaction_id, member_id, user_id, amount
            FROM transaction_splits
            GROUP BY transaction_id, member_id, user_id, amount
            HAVING COUNT(*) > 1
        ) t) > 0 THEN '❌ TEM SPLITS DUPLICADOS'
        ELSE '✅ SEM SPLITS DUPLICADOS'
    END as status_splits,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM (
            SELECT source_transaction_id, user_id
            FROM transactions
            WHERE source_transaction_id IS NOT NULL
            GROUP BY source_transaction_id, user_id
            HAVING COUNT(*) > 1
        ) t) > 0 THEN '❌ TEM MIRRORS DUPLICADOS'
        ELSE '✅ SEM MIRRORS DUPLICADOS'
    END as status_mirrors,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM (
            SELECT transaction_id, user_id, entry_type, related_user_id, amount
            FROM financial_ledger
            GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
            HAVING COUNT(*) > 1
        ) t) > 0 THEN '❌ TEM LEDGER DUPLICADO'
        ELSE '✅ SEM LEDGER DUPLICADO'
    END as status_ledger;

-- ============================================================================
-- FIM DA AUDITORIA
-- ============================================================================
