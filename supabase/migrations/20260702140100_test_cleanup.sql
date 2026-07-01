-- ============================================================================
-- TEST SUITE CLEANUP: Remove todos os dados criados pelo test suite
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_user_id UUID;
  v_tag TEXT := '[TEST]';
  v_count INT;
  v_account UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP START';
  RAISE NOTICE '========================================';

  SELECT id INTO v_user_id FROM auth.users WHERE email LIKE '%cascao%' LIMIT 1;

  -- 1. Remover splits de transações de teste
  DELETE FROM transaction_splits
  WHERE transaction_id IN (
    SELECT id FROM transactions WHERE user_id = v_user_id AND description LIKE v_tag || ' %'
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[OK] Splits removidos: %', v_count;

  -- 2. Soft-delete todas as transações de teste (triggers recalcularão saldos)
  UPDATE transactions SET deleted_at = NOW()
  WHERE user_id = v_user_id AND description LIKE v_tag || ' %' AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[OK] Transações soft-deletadas: %', v_count;

  -- 3. Hard delete de transações já soft-deletadas de testes anteriores
  DELETE FROM transactions
  WHERE user_id = v_user_id AND description LIKE v_tag || ' %' AND deleted_at IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[OK] Transações hard-deletadas: %', v_count;

  -- 4. Remover budgets de teste
  DELETE FROM budgets
  WHERE user_id = v_user_id
    AND id IN (SELECT id FROM budgets WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT 1);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[OK] Budgets removidos: %', v_count;

  -- 5. Remover goals de teste
  DELETE FROM goals
  WHERE user_id = v_user_id AND name LIKE v_tag || ' %';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[OK] Metas removidas: %', v_count;

  -- 6. Remover trips de teste
  DELETE FROM trips
  WHERE owner_id = v_user_id AND name LIKE v_tag || ' %';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[OK] Viagens removidas: %', v_count;

  -- 7. Remover contas de teste
  DELETE FROM accounts
  WHERE user_id = v_user_id AND name LIKE v_tag || ' %';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[OK] Contas removidas: %', v_count;

  -- 8. Recalcular saldos das contas reais restantes
  FOR v_account IN SELECT id FROM accounts WHERE user_id = v_user_id LOOP
    BEGIN
      PERFORM recalculate_account_balance(v_account);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[WARN] Falha ao recalcular conta %: %', v_account, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE '[OK] Saldos recalculados';

  -- 9. Verificação final
  SELECT COUNT(*) INTO v_count FROM transactions WHERE user_id = v_user_id AND description LIKE v_tag || ' %';
  RAISE NOTICE '[VERIFY] Transações restantes: % (deve ser 0)', v_count;
  SELECT COUNT(*) INTO v_count FROM accounts WHERE user_id = v_user_id AND name LIKE v_tag || ' %';
  RAISE NOTICE '[VERIFY] Contas restantes: % (deve ser 0)', v_count;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP COMPLETE';
  RAISE NOTICE '========================================';
END;
$$;

COMMIT;
