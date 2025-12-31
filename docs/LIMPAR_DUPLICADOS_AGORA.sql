-- ============================================================================
-- SCRIPT PARA LIMPAR DUPLICADOS - PRONTO PARA EXECUTAR
-- Data: 31/12/2024
-- ATENÇÃO: FAZER BACKUP ANTES DE EXECUTAR!
-- ============================================================================

-- ============================================================================
-- PASSO 1: VERIFICAR SE HÁ DUPLICADOS (SOMENTE LEITURA)
-- ============================================================================

-- Verificar splits duplicados
SELECT 
    'SPLITS DUPLICADOS' as tipo,
    COUNT(*) as total
FROM (
    SELECT transaction_id, member_id, user_id, amount
    FROM transaction_splits
    GROUP BY transaction_id, member_id, user_id, amount
    HAVING COUNT(*) > 1
) t;

-- Verificar mirrors duplicados
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

-- Verificar ledger duplicado
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
-- PASSO 2: REMOVER DUPLICADOS (EXECUTAR APÓS CONFIRMAR BACKUP!)
-- ============================================================================

-- 2.1 Remover splits duplicados (mantém o mais antigo)
DELETE FROM transaction_splits
WHERE id IN (
    SELECT id FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY transaction_id, member_id, user_id, amount 
                ORDER BY created_at
            ) as rn
        FROM transaction_splits
    ) t
    WHERE rn > 1
);

-- 2.2 Remover mirrors duplicados (mantém o mais antigo)
DELETE FROM transactions
WHERE id IN (
    SELECT id FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY source_transaction_id, user_id 
                ORDER BY created_at
            ) as rn
        FROM transactions
        WHERE source_transaction_id IS NOT NULL
    ) t
    WHERE rn > 1
);

-- 2.3 Remover ledger duplicado (mantém o mais antigo)
DELETE FROM financial_ledger
WHERE id IN (
    SELECT id FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY transaction_id, user_id, entry_type, related_user_id, amount 
                ORDER BY created_at
            ) as rn
        FROM financial_ledger
    ) t
    WHERE rn > 1
);

-- ============================================================================
-- PASSO 3: ADICIONAR CONSTRAINTS PARA PREVENIR DUPLICAÇÕES FUTURAS
-- ============================================================================

-- 3.1 Constraint em transaction_splits
CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_splits_unique
ON transaction_splits(transaction_id, member_id, user_id)
WHERE is_settled = false;

-- 3.2 Constraint em transações espelhadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_mirror_unique
ON transactions(source_transaction_id, user_id)
WHERE source_transaction_id IS NOT NULL;

-- 3.3 Constraint em ledger
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_ledger_unique
ON financial_ledger(
    transaction_id, 
    user_id, 
    entry_type, 
    COALESCE(related_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ============================================================================
-- PASSO 4: VALIDAR QUE NÃO HÁ MAIS DUPLICADOS
-- ============================================================================

-- Verificar splits
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SEM SPLITS DUPLICADOS'
        ELSE '❌ AINDA HÁ ' || COUNT(*) || ' SPLITS DUPLICADOS'
    END as status
FROM (
    SELECT transaction_id, member_id, user_id, amount
    FROM transaction_splits
    GROUP BY transaction_id, member_id, user_id, amount
    HAVING COUNT(*) > 1
) t;

-- Verificar mirrors
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SEM MIRRORS DUPLICADOS'
        ELSE '❌ AINDA HÁ ' || COUNT(*) || ' MIRRORS DUPLICADOS'
    END as status
FROM (
    SELECT source_transaction_id, user_id
    FROM transactions
    WHERE source_transaction_id IS NOT NULL
    GROUP BY source_transaction_id, user_id
    HAVING COUNT(*) > 1
) t;

-- Verificar ledger
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SEM LEDGER DUPLICADO'
        ELSE '❌ AINDA HÁ ' || COUNT(*) || ' LEDGER DUPLICADO'
    END as status
FROM (
    SELECT transaction_id, user_id, entry_type, related_user_id, amount
    FROM financial_ledger
    GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
    HAVING COUNT(*) > 1
) t;

-- ============================================================================
-- RESUMO FINAL
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
    'Entradas de ledger' as metrica,
    COUNT(*)::text as valor
FROM financial_ledger;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

SELECT '✅ Limpeza concluída! Verifique os resultados acima.' as status;
