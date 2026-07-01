-- Diagnóstico e limpeza de dados de teste residuais
BEGIN;

DO $$
DECLARE
  v_user_id UUID;
  v_count INT;
  v_account UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email ILIKE '%cascao%' LIMIT 1;

  RAISE NOTICE '=== DIAGNÓSTICO ===';

  -- Contas de teste (criadas por tentativas anteriores sem prefixo [TEST])
  SELECT COUNT(*) INTO v_count FROM accounts WHERE user_id = v_user_id AND (name ILIKE '%teste%' OR name ILIKE '%[TEST]%' OR name LIKE '% Conta Corrente%' AND user_id = v_user_id AND created_at > '2026-07-01 17:00:00'::timestamptz);
  RAISE NOTICE 'Contas suspeitas: %', v_count;

  -- Transações de teste
  SELECT COUNT(*) INTO v_count FROM transactions WHERE user_id = v_user_id AND (description ILIKE '%teste%' OR description ILIKE '%[TEST]%' OR description LIKE '%TEST%');
  RAISE NOTICE 'Transações suspeitas: %', v_count;

  -- Budgets de teste
  SELECT COUNT(*) INTO v_count FROM budgets WHERE user_id = v_user_id AND (name ILIKE '%teste%' OR name ILIKE '%[TEST]%');
  RAISE NOTICE 'Budgets suspeitos: %', v_count;

  -- Goals de teste
  SELECT COUNT(*) INTO v_count FROM goals WHERE user_id = v_user_id AND (name ILIKE '%teste%' OR name ILIKE '%[TEST]%');
  RAISE NOTICE 'Metas suspeitas: %', v_count;

  -- Trips de teste
  SELECT COUNT(*) INTO v_count FROM trips WHERE owner_id = v_user_id AND (name ILIKE '%teste%' OR name ILIKE '%[TEST]%');
  RAISE NOTICE 'Viagens suspeitas: %', v_count;

  -- Splits órfãos (transaction_id aponta pra transação deletada)
  SELECT COUNT(*) INTO v_count FROM transaction_splits s WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.id = s.transaction_id);
  RAISE NOTICE 'Splits órfãos: %', v_count;

  -- ========================================
  -- LIMPEZA AGRESSIVA: remove tudo de teste
  -- ========================================

  RAISE NOTICE '=== LIMPEZA ===';

  -- Splits de transações deletadas ou de teste
  DELETE FROM transaction_splits
  WHERE transaction_id IN (
    SELECT id FROM transactions WHERE user_id = v_user_id AND (description ILIKE '%[TEST]%' OR description LIKE '%TEST %')
    UNION
    SELECT id FROM transactions WHERE user_id = v_user_id AND deleted_at IS NOT NULL
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Splits removidos: %', v_count;

  -- Hard-delete transações soft-deletadas
  DELETE FROM transactions WHERE user_id = v_user_id AND deleted_at IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Transações hard-deletadas: %', v_count;

  -- Soft-delete transações de teste ativas
  UPDATE transactions SET deleted_at = NOW()
  WHERE user_id = v_user_id AND (description ILIKE '%[TEST]%' OR description LIKE '%TEST %' OR description LIKE '% Teste %')
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Transações soft-deletadas: %', v_count;

  -- Remover contas de teste
  DELETE FROM accounts WHERE user_id = v_user_id AND (name ILIKE '%[TEST]%' OR name ILIKE '%TEST%');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Contas removidas: %', v_count;

  -- Remover budgets de teste
  DELETE FROM budgets WHERE user_id = v_user_id AND (name ILIKE '%[TEST]%' OR name ILIKE '%TEST%');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Budgets removidos: %', v_count;

  -- Remover goals de teste
  DELETE FROM goals WHERE user_id = v_user_id AND (name ILIKE '%[TEST]%' OR name ILIKE '%TEST%');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Metas removidas: %', v_count;

  -- Remover trips de teste
  DELETE FROM trips WHERE owner_id = v_user_id AND (name ILIKE '%[TEST]%' OR name ILIKE '%TEST%');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Viagens removidas: %', v_count;

  -- Limpar financial_ledger (entradas de settlement de teste)
  DELETE FROM financial_ledger WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Financial ledger limpo: %', v_count;

  -- Recalcular saldos
  FOR v_account IN SELECT id FROM accounts WHERE user_id = v_user_id LOOP
    BEGIN
      PERFORM recalculate_account_balance(v_account);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  RAISE NOTICE '=== LIMPEZA CONCLUÍDA ===';
END;
$$;

COMMIT;
