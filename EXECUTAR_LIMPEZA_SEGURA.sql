-- ============================================================================
-- SCRIPT DE LIMPEZA SEGURA DO BANCO DE DADOS
-- Data: 31/12/2024
-- ATENÇÃO: FAZER BACKUP ANTES DE EXECUTAR!
-- ============================================================================

-- ============================================================================
-- PARTE 1: IDENTIFICAR DUPLICADOS (SOMENTE LEITURA)
-- Execute esta parte primeiro para ver o que será removido
-- ============================================================================

-- 1.1 Splits duplicados
WITH duplicates AS (
    SELECT 
        transaction_id,
        member_id,
        user_id,
        amount,
        COUNT(*) as total_duplicados,
        ARRAY_AGG(id ORDER BY created_at) as ids_ordenados
    FROM transaction_splits
    GROUP BY transaction_id, member_id, user_id, amount
    HAVING COUNT(*) > 1
)
SELECT 
    'SPLITS DUPLICADOS' as tipo,
    transaction_id,
    member_id,
    user_id,
    amount,
    total_duplicados,
    ids_ordenados,
    ids_ordenados[1] as id_manter,
    ids_ordenados[2:array_length(ids_ordenados, 1)] as ids_remover
FROM duplicates;

-- 1.2 Transações espelhadas duplicadas
WITH duplicates AS (
    SELECT 
        source_transaction_id,
        user_id,
        amount,
        COUNT(*) as total_duplicados,
        ARRAY_AGG(id ORDER BY created_at) as ids_ordenados
    FROM transactions
    WHERE source_transaction_id IS NOT NULL
    GROUP BY source_transaction_id, user_id, amount
    HAVING COUNT(*) > 1
)
SELECT 
    'MIRRORS DUPLICADOS' as tipo,
    source_transaction_id,
    user_id,
    amount,
    total_duplicados,
    ids_ordenados,
    ids_ordenados[1] as id_manter,
    ids_ordenados[2:array_length(ids_ordenados, 1)] as ids_remover
FROM duplicates;

-- 1.3 Entradas de ledger duplicadas
WITH duplicates AS (
    SELECT 
        transaction_id,
        user_id,
        entry_type,
        related_user_id,
        amount,
        COUNT(*) as total_duplicados,
        ARRAY_AGG(id ORDER BY created_at) as ids_ordenados
    FROM financial_ledger
    GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
    HAVING COUNT(*) > 1
)
SELECT 
    'LEDGER DUPLICADO' as tipo,
    transaction_id,
    user_id,
    entry_type,
    related_user_id,
    amount,
    total_duplicados,
    ids_ordenados,
    ids_ordenados[1] as id_manter,
    ids_ordenados[2:array_length(ids_ordenados, 1)] as ids_remover
FROM duplicates;

-- ============================================================================
-- PARTE 2: REMOVER DUPLICADOS (EXECUTAR APÓS BACKUP!)
-- ============================================================================

-- 2.1 Remover splits duplicados (manter o mais antigo)
-- ATENÇÃO: Execute esta query separadamente e verifique o resultado
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

-- Verificar quantos foram removidos
SELECT 'Splits duplicados removidos' as status;

-- 2.2 Remover transações espelhadas duplicadas (manter a mais antiga)
-- ATENÇÃO: Execute esta query separadamente e verifique o resultado
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

-- Verificar quantos foram removidos
SELECT 'Transações espelhadas duplicadas removidas' as status;

-- 2.3 Remover entradas de ledger duplicadas (manter a mais antiga)
-- ATENÇÃO: Execute esta query separadamente e verifique o resultado
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

-- Verificar quantos foram removidos
SELECT 'Entradas de ledger duplicadas removidas' as status;

-- ============================================================================
-- PARTE 3: IDENTIFICAR TRIGGERS OBSOLETOS
-- ============================================================================

-- 3.1 Listar todos os triggers de mirroring
SELECT 
    'TRIGGERS DE MIRRORING' as tipo,
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT t.tgisinternal
  AND c.relnamespace = 'public'::regnamespace
  AND (
    t.tgname LIKE '%mirror%'
    OR t.tgname LIKE '%espelh%'
    OR p.proname LIKE '%mirror%'
    OR p.proname LIKE '%espelh%'
  )
ORDER BY c.relname, t.tgname;

-- 3.2 Listar triggers que podem estar duplicados
SELECT 
    'TRIGGERS POTENCIALMENTE DUPLICADOS' as tipo,
    c.relname as table_name,
    t.tgname as trigger_name,
    COUNT(*) OVER (PARTITION BY c.relname, t.tgname) as count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE NOT t.tgisinternal
  AND c.relnamespace = 'public'::regnamespace
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- PARTE 4: REMOVER TRIGGERS OBSOLETOS (CUIDADO!)
-- ============================================================================

-- 4.1 Remover trigger antigo de mirroring na tabela transactions
-- ATENÇÃO: Só executar se confirmar que é obsoleto!
-- DROP TRIGGER IF EXISTS trg_transaction_mirroring ON transactions;
-- DROP FUNCTION IF EXISTS handle_transaction_mirroring CASCADE;

-- 4.2 Verificar se há outros triggers obsoletos
-- (Adicionar aqui após análise manual)

-- ============================================================================
-- PARTE 5: IDENTIFICAR FUNÇÕES NÃO UTILIZADAS
-- ============================================================================

-- 5.1 Funções que não são usadas por nenhum trigger
SELECT 
    'FUNÇÕES SEM TRIGGER' as tipo,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.prokind = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_trigger t WHERE t.tgfoid = p.oid
  )
  AND p.proname NOT IN (
    -- Funções RPC usadas pelo frontend (NÃO REMOVER!)
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

-- 5.2 Funções de mirroring/espelhamento
SELECT 
    'FUNÇÕES DE MIRRORING' as tipo,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (
    proname LIKE '%mirror%'
    OR proname LIKE '%espelh%'
    OR proname LIKE '%shared%'
  )
ORDER BY proname;

-- ============================================================================
-- PARTE 6: ADICIONAR CONSTRAINTS PARA PREVENIR DUPLICAÇÕES
-- ============================================================================

-- 6.1 Constraint UNIQUE em transaction_splits
-- Previne splits duplicados para mesma transação e membro
CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_splits_unique
ON transaction_splits(transaction_id, member_id, user_id)
WHERE is_settled = false;

COMMENT ON INDEX idx_transaction_splits_unique IS 
  'Previne splits duplicados para mesma transação e membro';

-- 6.2 Constraint UNIQUE em transações espelhadas
-- Previne mirrors duplicados para mesma transação original e usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_mirror_unique
ON transactions(source_transaction_id, user_id)
WHERE source_transaction_id IS NOT NULL;

COMMENT ON INDEX idx_transactions_mirror_unique IS 
  'Previne transações espelhadas duplicadas';

-- 6.3 Constraint UNIQUE em ledger
-- Previne entradas de ledger duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_ledger_unique
ON financial_ledger(transaction_id, user_id, entry_type, COALESCE(related_user_id, '00000000-0000-0000-0000-000000000000'::uuid));

COMMENT ON INDEX idx_financial_ledger_unique IS 
  'Previne entradas de ledger duplicadas';

-- ============================================================================
-- PARTE 7: VALIDAÇÃO FINAL
-- ============================================================================

-- 7.1 Verificar se ainda há duplicados
SELECT 
    'VALIDAÇÃO: Splits duplicados restantes' as tipo,
    COUNT(*) as total
FROM (
    SELECT 
        transaction_id, member_id, user_id, amount,
        COUNT(*) as cnt
    FROM transaction_splits
    GROUP BY transaction_id, member_id, user_id, amount
    HAVING COUNT(*) > 1
) t;

-- 7.2 Verificar se ainda há mirrors duplicados
SELECT 
    'VALIDAÇÃO: Mirrors duplicados restantes' as tipo,
    COUNT(*) as total
FROM (
    SELECT 
        source_transaction_id, user_id,
        COUNT(*) as cnt
    FROM transactions
    WHERE source_transaction_id IS NOT NULL
    GROUP BY source_transaction_id, user_id
    HAVING COUNT(*) > 1
) t;

-- 7.3 Verificar se ainda há ledger duplicado
SELECT 
    'VALIDAÇÃO: Ledger duplicado restante' as tipo,
    COUNT(*) as total
FROM (
    SELECT 
        transaction_id, user_id, entry_type, related_user_id, amount,
        COUNT(*) as cnt
    FROM financial_ledger
    GROUP BY transaction_id, user_id, entry_type, related_user_id, amount
    HAVING COUNT(*) > 1
) t;

-- 7.4 Contagem final de objetos
SELECT 
    'RESUMO FINAL' as tipo,
    (SELECT COUNT(*) FROM pg_trigger t 
     JOIN pg_class c ON t.tgrelid = c.oid 
     WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace) as total_triggers,
    (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prokind = 'f') as total_functions,
    (SELECT COUNT(*) FROM transaction_splits) as total_splits,
    (SELECT COUNT(*) FROM transactions WHERE source_transaction_id IS NOT NULL) as total_mirrors,
    (SELECT COUNT(*) FROM financial_ledger) as total_ledger_entries;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

-- INSTRUÇÕES DE USO:
-- 1. FAZER BACKUP do banco de dados
-- 2. Executar PARTE 1 para ver duplicados
-- 3. Executar PARTE 2 para remover duplicados (APÓS BACKUP!)
-- 4. Executar PARTE 3 para identificar triggers obsoletos
-- 5. Executar PARTE 4 MANUALMENTE após confirmar quais triggers remover
-- 6. Executar PARTE 5 para identificar funções não usadas
-- 7. Executar PARTE 6 para adicionar constraints
-- 8. Executar PARTE 7 para validar limpeza

SELECT '✅ Script de limpeza carregado. LEIA AS INSTRUÇÕES antes de executar!' as status;
