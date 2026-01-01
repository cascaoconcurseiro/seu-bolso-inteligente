-- ============================================
-- FIX: Transações Compartilhadas - linked_user_id
-- ============================================
-- Este script corrige o problema de transações compartilhadas
-- não aparecerem para todos os membros da família.
--
-- PROBLEMA: Membros sem linked_user_id não recebem espelhos
-- SOLUÇÃO: Auto-vincular membros e re-sincronizar transações
-- ============================================

-- 1. VERIFICAR ESTADO ATUAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '=== VERIFICAÇÃO INICIAL ===';
  RAISE NOTICE 'Membros sem linked_user_id: %', (
    SELECT COUNT(*) FROM family_members WHERE linked_user_id IS NULL
  );
  RAISE NOTICE 'Transações compartilhadas: %', (
    SELECT COUNT(*) FROM transactions WHERE is_shared = true AND source_transaction_id IS NULL
  );
  RAISE NOTICE 'Espelhos criados: %', (
    SELECT COUNT(*) FROM transactions WHERE source_transaction_id IS NOT NULL
  );
END $$;

-- 2. CORRIGIR linked_user_id DOS MEMBROS
-- ============================================

-- Auto-vincular membros que têm email correspondente a um profile
UPDATE family_members fm
SET 
  linked_user_id = p.id,
  updated_at = NOW()
FROM profiles p
WHERE fm.email = p.email
AND fm.linked_user_id IS NULL
AND p.id IS NOT NULL;

-- Mostrar resultado
DO $$
BEGIN
  RAISE NOTICE '=== MEMBROS VINCULADOS ===';
  RAISE NOTICE 'Total de membros: %', (SELECT COUNT(*) FROM family_members);
  RAISE NOTICE 'Membros vinculados: %', (SELECT COUNT(*) FROM family_members WHERE linked_user_id IS NOT NULL);
  RAISE NOTICE 'Membros não vinculados: %', (SELECT COUNT(*) FROM family_members WHERE linked_user_id IS NULL);
END $$;

-- 3. CRIAR FUNÇÃO PARA RE-SINCRONIZAR TRANSAÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION resync_all_shared_transactions()
RETURNS TABLE(
  transaction_id UUID,
  description TEXT,
  mirrors_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx RECORD;
  v_mirrors_before INTEGER;
  v_mirrors_after INTEGER;
BEGIN
  -- Para cada transação compartilhada original
  FOR v_tx IN
    SELECT id, description
    FROM transactions
    WHERE is_shared = true
    AND source_transaction_id IS NULL
    ORDER BY created_at DESC
  LOOP
    -- Contar espelhos antes
    SELECT COUNT(*) INTO v_mirrors_before
    FROM transactions
    WHERE source_transaction_id = v_tx.id;
    
    -- Re-sincronizar
    PERFORM sync_shared_transaction(v_tx.id);
    
    -- Contar espelhos depois
    SELECT COUNT(*) INTO v_mirrors_after
    FROM transactions
    WHERE source_transaction_id = v_tx.id;
    
    -- Retornar resultado
    transaction_id := v_tx.id;
    description := v_tx.description;
    mirrors_created := v_mirrors_after - v_mirrors_before;
    
    RETURN NEXT;
    
    RAISE NOTICE 'Transação %: % - Espelhos criados: %', 
      v_tx.id, v_tx.description, mirrors_created;
  END LOOP;
END;
$$;

-- 4. EXECUTAR RE-SINCRONIZAÇÃO
-- ============================================

SELECT * FROM resync_all_shared_transactions();

-- 5. CRIAR TRIGGER PARA AUTO-VINCULAR NOVOS MEMBROS
-- ============================================

CREATE OR REPLACE FUNCTION auto_link_family_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Se email foi fornecido e linked_user_id está NULL
  IF NEW.email IS NOT NULL AND NEW.linked_user_id IS NULL THEN
    -- Buscar usuário com este email
    SELECT id INTO v_user_id
    FROM profiles
    WHERE email = NEW.email
    LIMIT 1;
    
    -- Se encontrou, vincular
    IF v_user_id IS NOT NULL THEN
      NEW.linked_user_id := v_user_id;
      RAISE NOTICE 'Auto-vinculado membro % (%) ao usuário %', 
        NEW.name, NEW.email, v_user_id;
    ELSE
      RAISE NOTICE 'Membro % (%) não tem conta no sistema ainda', 
        NEW.name, NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_auto_link_family_member ON family_members;
CREATE TRIGGER trg_auto_link_family_member
  BEFORE INSERT OR UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_family_member();

-- 6. CRIAR TRIGGER PARA SINCRONIZAR QUANDO MEMBRO É VINCULADO
-- ============================================

CREATE OR REPLACE FUNCTION sync_transactions_on_member_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Se linked_user_id foi preenchido agora
  IF OLD.linked_user_id IS NULL AND NEW.linked_user_id IS NOT NULL THEN
    RAISE NOTICE 'Membro % foi vinculado ao usuário %. Sincronizando transações...', 
      NEW.name, NEW.linked_user_id;
    
    -- Para cada transação compartilhada onde este membro tem split
    FOR v_tx_id IN
      SELECT DISTINCT ts.transaction_id
      FROM transaction_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      WHERE ts.member_id = NEW.id
      AND t.is_shared = true
      AND t.source_transaction_id IS NULL
    LOOP
      -- Re-sincronizar
      PERFORM sync_shared_transaction(v_tx_id);
      v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Sincronizadas % transações para membro %', v_count, NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_sync_on_member_link ON family_members;
CREATE TRIGGER trg_sync_on_member_link
  AFTER UPDATE ON family_members
  FOR EACH ROW
  WHEN (OLD.linked_user_id IS NULL AND NEW.linked_user_id IS NOT NULL)
  EXECUTE FUNCTION sync_transactions_on_member_link();

-- 7. VERIFICAÇÃO FINAL
-- ============================================

DO $$
DECLARE
  v_members_total INTEGER;
  v_members_linked INTEGER;
  v_members_unlinked INTEGER;
  v_tx_shared INTEGER;
  v_tx_mirrors INTEGER;
  v_tx_without_mirrors INTEGER;
BEGIN
  -- Contar membros
  SELECT COUNT(*) INTO v_members_total FROM family_members;
  SELECT COUNT(*) INTO v_members_linked FROM family_members WHERE linked_user_id IS NOT NULL;
  SELECT COUNT(*) INTO v_members_unlinked FROM family_members WHERE linked_user_id IS NULL;
  
  -- Contar transações
  SELECT COUNT(*) INTO v_tx_shared 
  FROM transactions 
  WHERE is_shared = true AND source_transaction_id IS NULL;
  
  SELECT COUNT(*) INTO v_tx_mirrors 
  FROM transactions 
  WHERE source_transaction_id IS NOT NULL;
  
  -- Contar transações sem espelhos (que deveriam ter)
  SELECT COUNT(DISTINCT t.id) INTO v_tx_without_mirrors
  FROM transactions t
  JOIN transaction_splits ts ON ts.transaction_id = t.id
  JOIN family_members fm ON fm.id = ts.member_id
  LEFT JOIN transactions m ON m.source_transaction_id = t.id AND m.user_id = fm.linked_user_id
  WHERE t.is_shared = true
  AND t.source_transaction_id IS NULL
  AND fm.linked_user_id IS NOT NULL
  AND fm.linked_user_id != t.user_id
  AND m.id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Membros da família:';
  RAISE NOTICE '  Total: %', v_members_total;
  RAISE NOTICE '  Vinculados: % (%.0f%%)', v_members_linked, 
    CASE WHEN v_members_total > 0 THEN (v_members_linked::FLOAT / v_members_total * 100) ELSE 0 END;
  RAISE NOTICE '  Não vinculados: %', v_members_unlinked;
  RAISE NOTICE '';
  RAISE NOTICE 'Transações compartilhadas:';
  RAISE NOTICE '  Originais: %', v_tx_shared;
  RAISE NOTICE '  Espelhos: %', v_tx_mirrors;
  RAISE NOTICE '  Sem espelhos (problema): %', v_tx_without_mirrors;
  RAISE NOTICE '';
  
  IF v_tx_without_mirrors = 0 THEN
    RAISE NOTICE '✅ SUCESSO! Todas as transações têm espelhos corretos.';
  ELSE
    RAISE WARNING '⚠️ ATENÇÃO! % transações ainda sem espelhos.', v_tx_without_mirrors;
  END IF;
  
  IF v_members_unlinked > 0 THEN
    RAISE NOTICE '⚠️ ATENÇÃO! % membros ainda não vinculados (não têm conta no sistema).', v_members_unlinked;
  END IF;
END $$;

-- 8. QUERY PARA VER DETALHES
-- ============================================

-- Ver membros e seus vínculos
SELECT 
  fm.name as "Nome",
  fm.email as "Email",
  CASE 
    WHEN fm.linked_user_id IS NOT NULL THEN '✅ Vinculado'
    ELSE '❌ Não vinculado'
  END as "Status",
  p.email as "Email da Conta",
  (
    SELECT COUNT(*) 
    FROM transaction_splits ts 
    WHERE ts.member_id = fm.id
  ) as "Splits",
  (
    SELECT COUNT(*) 
    FROM transactions t 
    WHERE t.user_id = fm.linked_user_id 
    AND t.source_transaction_id IS NOT NULL
  ) as "Espelhos Recebidos"
FROM family_members fm
LEFT JOIN profiles p ON p.id = fm.linked_user_id
ORDER BY fm.created_at DESC;

-- Ver transações compartilhadas e seus espelhos
SELECT 
  t.description as "Descrição",
  t.amount as "Valor",
  p.email as "Criado Por",
  (
    SELECT COUNT(*) 
    FROM transaction_splits ts 
    WHERE ts.transaction_id = t.id
  ) as "Splits",
  (
    SELECT COUNT(*) 
    FROM transactions m 
    WHERE m.source_transaction_id = t.id
  ) as "Espelhos",
  t.created_at as "Data"
FROM transactions t
JOIN profiles p ON p.id = t.user_id
WHERE t.is_shared = true
AND t.source_transaction_id IS NULL
ORDER BY t.created_at DESC
LIMIT 10;
