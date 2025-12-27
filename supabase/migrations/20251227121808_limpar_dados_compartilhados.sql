-- LIMPAR TUDO RELACIONADO A COMPARTILHAMENTO

-- 1. DELETAR TODAS AS TRANSAÇÕES COMPARTILHADAS (originais e espelhos)
DELETE FROM transactions
WHERE is_shared = true;

-- 2. DELETAR TODOS OS SPLITS
DELETE FROM transaction_splits;

-- 3. DELETAR TODOS OS MEMBROS DA FAMÍLIA
DELETE FROM family_members;

-- 4. DELETAR TODAS AS FAMÍLIAS
DELETE FROM families;

-- 5. VERIFICAR O QUE SOBROU
SELECT 'Transações restantes' as tabela, COUNT(*) as total FROM transactions
UNION ALL
SELECT 'Splits restantes', COUNT(*) FROM transaction_splits
UNION ALL
SELECT 'Membros restantes', COUNT(*) FROM family_members
UNION ALL
SELECT 'Famílias restantes', COUNT(*) FROM families
UNION ALL
SELECT 'Usuários (mantidos)', COUNT(*) FROM profiles;;
