-- Limpeza final: remove TODOS os dados [TEST] de qualquer usuário
BEGIN;

DO $$
DECLARE
  v_count INT;
  v_account UUID;
  v_user UUID;
BEGIN
  -- 1. Splits de transações [TEST]
  DELETE FROM transaction_splits
  WHERE transaction_id IN (SELECT id FROM transactions WHERE description LIKE '[TEST]%');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Splits removidos: %', v_count;

  -- 2. Soft-delete transações [TEST]
  UPDATE transactions SET deleted_at = NOW()
  WHERE description LIKE '[TEST]%' AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Transações soft-deletadas: %', v_count;

  -- 3. Hard-delete (agora que já estão soft-deletadas, sem FK pra splits)
  DELETE FROM transactions WHERE description LIKE '[TEST]%' AND deleted_at IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Transações hard-deletadas: %', v_count;

  -- 4. Remover TODAS transações que referenciam contas [TEST]
  -- (inclui settlement receipts que não têm [TEST] na descrição)
  UPDATE transactions SET deleted_at = NOW()
  WHERE deleted_at IS NULL AND (
    account_id IN (SELECT id FROM accounts WHERE name LIKE '[TEST]%')
    OR destination_account_id IN (SELECT id FROM accounts WHERE name LIKE '[TEST]%')
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Transações de contas [TEST] soft-deletadas: %', v_count;

  DELETE FROM transactions
  WHERE deleted_at IS NOT NULL AND (
    account_id IN (SELECT id FROM accounts WHERE name LIKE '[TEST]%')
    OR destination_account_id IN (SELECT id FROM accounts WHERE name LIKE '[TEST]%')
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Transações de contas [TEST] hard-deletadas: %', v_count;

  -- 5. Agora sim, deletar contas (sem FK violada)
  DELETE FROM accounts WHERE name LIKE '[TEST]%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Contas removidas: %', v_count;

  -- 6. Budgets
  DELETE FROM budgets WHERE name LIKE '[TEST]%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Budgets removidos: %', v_count;

  -- 7. Goals
  DELETE FROM goals WHERE name LIKE '[TEST]%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Metas removidas: %', v_count;

  -- 8. Trips
  DELETE FROM trips WHERE name LIKE '[TEST]%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Viagens removidas: %', v_count;

  -- 9. Financial ledger
  DELETE FROM financial_ledger;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Financial ledger limpo: %', v_count;

  -- 10. Recalcular TODOS os saldos
  FOR v_account IN SELECT id FROM accounts LOOP
    BEGIN
      PERFORM recalculate_account_balance(v_account);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  -- 11. Verificação final
  SELECT COUNT(*) INTO v_count FROM transactions WHERE description LIKE '[TEST]%';
  RAISE NOTICE 'VERIFY transações [TEST]: % (deve ser 0)', v_count;
  SELECT COUNT(*) INTO v_count FROM accounts WHERE name LIKE '[TEST]%';
  RAISE NOTICE 'VERIFY contas [TEST]: % (deve ser 0)', v_count;

  RAISE NOTICE '=== TUDO LIMPO ===';
END;
$$;

COMMIT;
