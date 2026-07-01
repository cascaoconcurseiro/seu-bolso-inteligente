-- Limpeza TOTAL de dados de teste — remove tudo criado hoje com prefixo [TEST]
BEGIN;

DO $$
DECLARE
  v_user_id UUID;
  v_count INT;
  v_account UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email ILIKE '%cascao%' LIMIT 1;

  -- 1. Splits de transações de teste
  DELETE FROM transaction_splits
  WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = v_user_id AND description LIKE '[TEST]%');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Splits removidos: %', v_count;

  -- 2. Soft-delete transações de teste
  UPDATE transactions SET deleted_at = NOW()
  WHERE user_id = v_user_id AND description LIKE '[TEST]%' AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Transações soft-deletadas: %', v_count;

  -- 3. Hard-delete transações já soft-deletadas
  DELETE FROM transactions WHERE user_id = v_user_id AND description LIKE '[TEST]%' AND deleted_at IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Transações hard-deletadas: %', v_count;

  -- 4. Remover budgets
  DELETE FROM budgets WHERE user_id = v_user_id AND name LIKE '[TEST]%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Budgets removidos: %', v_count;

  -- 5. Remover goals
  DELETE FROM goals WHERE user_id = v_user_id AND name LIKE '[TEST]%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Metas removidas: %', v_count;

  -- 6. Remover trips
  DELETE FROM trips WHERE owner_id = v_user_id AND name LIKE '[TEST]%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Viagens removidas: %', v_count;

  -- 7. Remover contas de teste
  DELETE FROM accounts WHERE user_id = v_user_id AND name LIKE '[TEST]%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Contas removidas: %', v_count;

  -- 8. Limpar financial_ledger
  DELETE FROM financial_ledger WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Financial ledger limpo: %', v_count;

  -- 9. Recalcular saldos das contas reais
  FOR v_account IN SELECT id FROM accounts WHERE user_id = v_user_id LOOP
    BEGIN
      PERFORM recalculate_account_balance(v_account);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  -- 10. Verificação final
  SELECT COUNT(*) INTO v_count FROM accounts WHERE user_id = v_user_id AND name LIKE '[TEST]%';
  RAISE NOTICE 'VERIFY contas: % (deve ser 0)', v_count;
  SELECT COUNT(*) INTO v_count FROM transactions WHERE user_id = v_user_id AND description LIKE '[TEST]%';
  RAISE NOTICE 'VERIFY transações: % (deve ser 0)', v_count;

  RAISE NOTICE '=== LIMPEZA CONCLUÍDA ===';
END;
$$;

COMMIT;
