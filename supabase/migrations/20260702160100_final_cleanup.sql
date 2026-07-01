-- Limpeza final: financial_ledger e verificação completa
BEGIN;

DO $$
DECLARE
  v_user_id UUID;
  v_count INT;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email ILIKE '%cascao%' LIMIT 1;

  DELETE FROM financial_ledger WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Financial ledger limpo: % registros', v_count;

  -- Verificação final completa
  SELECT COUNT(*) INTO v_count FROM accounts WHERE user_id = v_user_id AND (name ILIKE '%test%' OR name ILIKE '%[TEST]%');
  RAISE NOTICE 'Contas teste: % (deve ser 0)', v_count;

  SELECT COUNT(*) INTO v_count FROM transactions WHERE user_id = v_user_id AND (description ILIKE '%test%' OR description ILIKE '%[TEST]%');
  RAISE NOTICE 'Transações teste: % (deve ser 0)', v_count;

  SELECT COUNT(*) INTO v_count FROM budgets WHERE user_id = v_user_id AND (name ILIKE '%test%' OR name ILIKE '%[TEST]%');
  RAISE NOTICE 'Budgets teste: % (deve ser 0)', v_count;

  SELECT COUNT(*) INTO v_count FROM goals WHERE user_id = v_user_id AND (name ILIKE '%test%' OR name ILIKE '%[TEST]%');
  RAISE NOTICE 'Metas teste: % (deve ser 0)', v_count;

  SELECT COUNT(*) INTO v_count FROM trips WHERE owner_id = v_user_id AND (name ILIKE '%test%' OR name ILIKE '%[TEST]%');
  RAISE NOTICE 'Viagens teste: % (deve ser 0)', v_count;

  RAISE NOTICE '=== TUDO LIMPO ===';
END;
$$;

COMMIT;
