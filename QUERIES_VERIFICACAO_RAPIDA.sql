-- ============================================================================
-- QUERIES DE VERIFICAÇÃO RÁPIDA
-- Use estas queries para verificar rapidamente o estado do banco
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAÇÃO DE DUPLICADOS (RÁPIDA)
-- ============================================================================

-- 1.1 Quantos splits duplicados?
SELECT COUNT(*) as total_splits_duplicados
FROM (
    SELECT transaction_id, member_id, user_id, amount
    FROM transaction_splits
    GROUP BY transaction_id, member_id, user_id, amount
    HAVING COUNT(*) > 1
) t;

-- 1.2 Quantos mirrors duplicados?
SELECT COUNT(*) as total_mirrors_duplicados
FROM (
    SELECT source_transaction_id, user_id
    FROM transactions
    WHERE source_transaction_id IS NOT NULL
    GROUP BY source_transaction_id, user_id
    HAVING COUNT(*) > 1
) t;

-- 1.3 Quantas entradas de ledger duplicadas?
SELECT COUNT(*) as total_ledger_duplicado
FROM (
    SELECT transaction_id, user_id, entry_type, related_user_id, amount
    FROM financial_ledger
    GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
    HAVING COUNT(*) > 1
) t;

-- ============================================================================
-- 2. CONTAGEM DE OBJETOS
-- ============================================================================

-- 2.1 Resumo geral
SELECT 
    'Triggers' as tipo,
    COUNT(*) as total
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace

UNION ALL

SELECT 
    'Funções' as tipo,
    COUNT(*) as total
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND prokind = 'f'

UNION ALL

SELECT 
    'Políticas RLS' as tipo,
    COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Índices' as tipo,
    COUNT(*) as total
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Views' as tipo,
    COUNT(*) as total
FROM pg_views
WHERE schemaname = 'public';

-- ============================================================================
-- 3. TRIGGERS ATIVOS POR TABELA
-- ============================================================================

SELECT 
    c.relname as tabela,
    COUNT(*) as total_triggers,
    ARRAY_AGG(t.tgname ORDER BY t.tgname) as triggers
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal 
  AND c.relnamespace = 'public'::regnamespace
GROUP BY c.relname
ORDER BY COUNT(*) DESC, c.relname;

-- ============================================================================
-- 4. FUNÇÕES DE MIRRORING/ESPELHAMENTO
-- ============================================================================

SELECT 
    proname as funcao,
    pg_get_function_arguments(oid) as parametros,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgfoid = pg_proc.oid) as usado_por_triggers
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (
    proname LIKE '%mirror%'
    OR proname LIKE '%espelh%'
    OR proname LIKE '%shared%'
    OR proname LIKE '%split%'
  )
ORDER BY proname;

-- ============================================================================
-- 5. ÚLTIMAS TRANSAÇÕES COMPARTILHADAS
-- ============================================================================

-- 5.1 Últimas 5 transações originais compartilhadas
SELECT 
    id,
    user_id,
    amount,
    description,
    date,
    is_shared,
    domain,
    created_at,
    (SELECT COUNT(*) FROM transaction_splits WHERE transaction_id = t.id) as total_splits,
    (SELECT COUNT(*) FROM transactions WHERE source_transaction_id = t.id) as total_mirrors
FROM transactions t
WHERE is_shared = true 
  AND source_transaction_id IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- 5.2 Últimas 5 transações espelhadas
SELECT 
    id,
    user_id,
    amount,
    description,
    source_transaction_id,
    created_at
FROM transactions
WHERE source_transaction_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 6. VERIFICAÇÃO DE INTEGRIDADE
-- ============================================================================

-- 6.1 Splits sem transação original
SELECT 
    'Splits órfãos' as problema,
    COUNT(*) as total
FROM transaction_splits ts
WHERE NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.id = ts.transaction_id
);

-- 6.2 Mirrors sem transação original
SELECT 
    'Mirrors órfãos' as problema,
    COUNT(*) as total
FROM transactions t
WHERE source_transaction_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transactions t2 WHERE t2.id = t.source_transaction_id
  );

-- 6.3 Ledger sem transação
SELECT 
    'Ledger órfão' as problema,
    COUNT(*) as total
FROM financial_ledger fl
WHERE NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.id = fl.transaction_id
);

-- 6.4 Splits sem mirror correspondente
SELECT 
    'Splits sem mirror' as problema,
    COUNT(*) as total
FROM transaction_splits ts
WHERE NOT EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.source_transaction_id = ts.transaction_id 
      AND t.user_id = ts.user_id
);

-- ============================================================================
-- 7. ANÁLISE DE PERFORMANCE
-- ============================================================================

-- 7.1 Tabelas maiores
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho,
    pg_total_relation_size(schemaname||'.'||tablename) as tamanho_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- 7.2 Índices não utilizados
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as vezes_usado,
    pg_size_pretty(pg_relation_size(indexrelid)) as tamanho
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE 'pg_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- 8. VERIFICAÇÃO DE CONSTRAINTS
-- ============================================================================

-- 8.1 Verificar se constraints UNIQUE existem
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%unique%'
    OR indexdef LIKE '%UNIQUE%'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 9. ANÁLISE DE DADOS RECENTES
-- ============================================================================

-- 9.1 Transações criadas nas últimas 24h
SELECT 
    DATE_TRUNC('hour', created_at) as hora,
    COUNT(*) as total_transacoes,
    COUNT(*) FILTER (WHERE is_shared = true) as compartilhadas,
    COUNT(*) FILTER (WHERE source_transaction_id IS NOT NULL) as espelhadas
FROM transactions
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;

-- 9.2 Splits criados nas últimas 24h
SELECT 
    DATE_TRUNC('hour', created_at) as hora,
    COUNT(*) as total_splits
FROM transaction_splits
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hora DESC;

-- ============================================================================
-- 10. VERIFICAÇÃO DE POLÍTICAS RLS
-- ============================================================================

-- 10.1 Políticas por tabela
SELECT 
    tablename,
    COUNT(*) as total_politicas,
    ARRAY_AGG(policyname ORDER BY policyname) as politicas
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY COUNT(*) DESC, tablename;

-- 10.2 Políticas potencialmente duplicadas
SELECT 
    tablename,
    policyname,
    COUNT(*) as duplicatas
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1;

-- ============================================================================
-- 11. SAÚDE GERAL DO SISTEMA
-- ============================================================================

SELECT 
    'Transações totais' as metrica,
    COUNT(*)::text as valor
FROM transactions

UNION ALL

SELECT 
    'Transações compartilhadas' as metrica,
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
    'Splits não quitados' as metrica,
    COUNT(*)::text as valor
FROM transaction_splits
WHERE is_settled = false

UNION ALL

SELECT 
    'Entradas de ledger' as metrica,
    COUNT(*)::text as valor
FROM financial_ledger

UNION ALL

SELECT 
    'Famílias ativas' as metrica,
    COUNT(*)::text as valor
FROM families

UNION ALL

SELECT 
    'Membros de família' as metrica,
    COUNT(*)::text as valor
FROM family_members

UNION ALL

SELECT 
    'Viagens ativas' as metrica,
    COUNT(*)::text as valor
FROM trips

UNION ALL

SELECT 
    'Membros de viagem' as metrica,
    COUNT(*)::text as valor
FROM trip_members;

-- ============================================================================
-- 12. VERIFICAÇÃO FINAL - TUDO OK?
-- ============================================================================

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM (
            SELECT transaction_id, member_id, user_id, amount
            FROM transaction_splits
            GROUP BY transaction_id, member_id, user_id, amount
            HAVING COUNT(*) > 1
        ) t) > 0 THEN '❌ Splits duplicados encontrados'
        ELSE '✅ Sem splits duplicados'
    END as status_splits,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM (
            SELECT source_transaction_id, user_id
            FROM transactions
            WHERE source_transaction_id IS NOT NULL
            GROUP BY source_transaction_id, user_id
            HAVING COUNT(*) > 1
        ) t) > 0 THEN '❌ Mirrors duplicados encontrados'
        ELSE '✅ Sem mirrors duplicados'
    END as status_mirrors,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM (
            SELECT transaction_id, user_id, entry_type, related_user_id, amount
            FROM financial_ledger
            GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
            HAVING COUNT(*) > 1
        ) t) > 0 THEN '❌ Ledger duplicado encontrado'
        ELSE '✅ Sem ledger duplicado'
    END as status_ledger,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM transaction_splits ts
              WHERE NOT EXISTS (
                  SELECT 1 FROM transactions t WHERE t.id = ts.transaction_id
              )) > 0 THEN '❌ Splits órfãos encontrados'
        ELSE '✅ Sem splits órfãos'
    END as status_integridade;

-- ============================================================================
-- FIM DAS QUERIES DE VERIFICAÇÃO
-- ============================================================================

SELECT '✅ Queries de verificação carregadas. Execute conforme necessário!' as status;
