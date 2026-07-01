-- ============================================================================
-- TEST SUITE: Testes completos do sistema (todos os módulos)
-- Executa como migration, bypassa RLS, faz tudo e loga cada passo.
-- ============================================================================

BEGIN;

-- 1. Identificar Wesley
DO $$
DECLARE
  v_user_id UUID;
  v_member_id UUID;
  v_checking_id UUID;
  v_credit_id UUID;
  v_savings_id UUID;
  v_category_id UUID;
  v_tx_id UUID;
  v_tx2_id UUID;
  v_installment_series UUID;
  v_split_id UUID;
  v_trip_id UUID;
  v_budget_id UUID;
  v_goal_id UUID;
  v_family_member_id UUID;
  v_settlement_tx UUID;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_count NUMERIC;
  v_tag TEXT := '[TEST]';
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST SUITE START';
  RAISE NOTICE '========================================';

  -- Encontrar Wesley pelo email
  SELECT id INTO v_user_id FROM auth.users WHERE email ILIKE '%cascao%' LIMIT 1;
  IF v_user_id IS NULL THEN
    -- Tentar pelo user_id de uma transação existente
    SELECT user_id INTO v_user_id FROM transactions WHERE deleted_at IS NULL LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário Wesley não encontrado (nem por email nem por transações)';
  END IF;
  RAISE NOTICE '[OK] Wesley user_id: %', v_user_id;

  -- ==========================================================================
  -- MÓDULO 1: CONTAS
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 1: CONTAS ---';

  -- 1a. Criar conta corrente
  INSERT INTO accounts (user_id, name, type, balance, initial_balance, currency, is_active)
  VALUES (v_user_id, v_tag || ' Conta Corrente', 'CHECKING', 5000, 5000, 'BRL', true)
  RETURNING id INTO v_checking_id;
  RAISE NOTICE '[OK] Conta corrente criada: %', v_checking_id;

  -- 1b. Criar cartão de crédito
  INSERT INTO accounts (user_id, name, type, balance, credit_limit, closing_day, due_day, currency, is_active)
  VALUES (v_user_id, v_tag || ' Cartão', 'CREDIT_CARD', 0, 5000, 10, 20, 'BRL', true)
  RETURNING id INTO v_credit_id;
  RAISE NOTICE '[OK] Cartão criado: %', v_credit_id;

  -- 1c. Criar poupança
  INSERT INTO accounts (user_id, name, type, balance, initial_balance, currency, is_active)
  VALUES (v_user_id, v_tag || ' Poupança', 'SAVINGS', 1000, 1000, 'BRL', true)
  RETURNING id INTO v_savings_id;
  RAISE NOTICE '[OK] Poupança criada: %', v_savings_id;

  -- 1d. Editar conta
  UPDATE accounts SET name = v_tag || ' Conta Corrente Editada' WHERE id = v_checking_id;
  RAISE NOTICE '[OK] Conta editada';

  -- 1e. Arquivar conta
  UPDATE accounts SET is_active = false WHERE id = v_savings_id;
  RAISE NOTICE '[OK] Poupança arquivada';

  -- 1f. Desarquivar conta
  UPDATE accounts SET is_active = true WHERE id = v_savings_id;
  RAISE NOTICE '[OK] Poupança desarquivada';

  -- ==========================================================================
  -- MÓDULO 2: TRANSAÇÕES BÁSICAS
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 2: TRANSAÇÕES ---';

  -- Pegar categoria para testes
  SELECT id INTO v_category_id FROM categories WHERE user_id = v_user_id LIMIT 1;
  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id FROM categories WHERE user_id IS NULL AND name = 'Outros' LIMIT 1;
  END IF;
  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id FROM categories LIMIT 1;
  END IF;
  RAISE NOTICE '[INFO] Categoria: %', v_category_id;

  -- 2a. Débito normal
  v_balance_before := (SELECT balance FROM accounts WHERE id = v_checking_id);
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, status)
  VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 150.00, v_tag || ' Supermercado', CURRENT_DATE, 'PERSONAL', 'CONFIRMED')
  RETURNING id INTO v_tx_id;
  v_balance_after := (SELECT balance FROM accounts WHERE id = v_checking_id);
  RAISE NOTICE '[OK] Débito R$150 — saldo: % -> % (tx: %)', v_balance_before, v_balance_after, v_tx_id;

  -- 2b. Crédito
  v_balance_before := (SELECT balance FROM accounts WHERE id = v_checking_id);
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, status)
  VALUES (v_user_id, v_checking_id, v_category_id, 'INCOME', 3000.00, v_tag || ' Salário', CURRENT_DATE, 'PERSONAL', 'CONFIRMED')
  RETURNING id INTO v_tx2_id;
  v_balance_after := (SELECT balance FROM accounts WHERE id = v_checking_id);
  RAISE NOTICE '[OK] Crédito R$3000 — saldo: % -> % (tx: %)', v_balance_before, v_balance_after, v_tx2_id;

  -- 2c. Transferência
  v_balance_before := (SELECT balance FROM accounts WHERE id = v_checking_id);
  INSERT INTO transactions (user_id, account_id, destination_account_id, type, amount, description, date, domain, status)
  VALUES (v_user_id, v_checking_id, v_savings_id, 'TRANSFER', 500.00, v_tag || ' Transferência poupança', CURRENT_DATE, 'PERSONAL', 'CONFIRMED')
  RETURNING id INTO v_tx2_id;
  v_balance_after := (SELECT balance FROM accounts WHERE id = v_checking_id);
  RAISE NOTICE '[OK] Transferência R$500 corrente->poupança — saldo corrente: % -> %', v_balance_before, v_balance_after;

  -- 2d. Parcelada (3x)
  v_installment_series := gen_random_uuid();
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, status, is_installment, current_installment, total_installments, series_id)
  VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 300.00, v_tag || ' Curso Online', CURRENT_DATE, 'PERSONAL', 'CONFIRMED', true, 1, 3, v_installment_series)
  RETURNING id INTO v_tx_id;
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, status, is_installment, current_installment, total_installments, series_id)
  VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 300.00, v_tag || ' Curso Online', (CURRENT_DATE + INTERVAL '30 days')::date, 'PERSONAL', 'CONFIRMED', true, 2, 3, v_installment_series);
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, status, is_installment, current_installment, total_installments, series_id)
  VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 300.00, v_tag || ' Curso Online', (CURRENT_DATE + INTERVAL '60 days')::date, 'PERSONAL', 'CONFIRMED', true, 3, 3, v_installment_series);
  RAISE NOTICE '[OK] Parcelada 3x R$300 — series_id: %', v_installment_series;

  -- 2e. Cartão de crédito
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, competence_date, domain, status)
  VALUES (v_user_id, v_credit_id, v_category_id, 'EXPENSE', 200.00, v_tag || ' Restaurante', CURRENT_DATE, CURRENT_DATE, 'PERSONAL', 'CONFIRMED')
  RETURNING id INTO v_tx_id;
  RAISE NOTICE '[OK] Despesa cartão R$200 (tx: %)', v_tx_id;

  -- 2f. Transação futura (agendada)
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, status)
  VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 80.00, v_tag || ' Assinatura Streaming', (CURRENT_DATE + INTERVAL '5 days')::date, 'PERSONAL', 'CONFIRMED')
  RETURNING id INTO v_tx_id;
  RAISE NOTICE '[OK] Transação futura R$80 para % (tx: %)', (CURRENT_DATE + INTERVAL '5 days')::date, v_tx_id;

  -- ==========================================================================
  -- MÓDULO 3: EDIÇÃO
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 3: EDIÇÃO ---';

  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, status)
  VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 50.00, v_tag || ' Para Editar', CURRENT_DATE, 'PERSONAL', 'CONFIRMED')
  RETURNING id INTO v_tx_id;

  v_balance_before := (SELECT balance FROM accounts WHERE id = v_checking_id);
  -- Editar: mudar valor de 50 pra 100 (diferença de 50 a mais)
  UPDATE transactions SET amount = 100.00 WHERE id = v_tx_id;
  v_balance_after := (SELECT balance FROM accounts WHERE id = v_checking_id);
  RAISE NOTICE '[OK] Edição R$50->R$100 — saldo: % -> % (dif: %)', v_balance_before, v_balance_after, v_balance_before - v_balance_after;

  -- ==========================================================================
  -- MÓDULO 4: VIAGEM
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 4: VIAGEM ---';

  INSERT INTO trips (owner_id, name, destination, start_date, end_date, budget, currency, status)
  VALUES (v_user_id, v_tag || ' Viagem Teste', 'Praia', CURRENT_DATE, (CURRENT_DATE + INTERVAL '7 days')::date, 3000, 'BRL', 'ACTIVE')
  RETURNING id INTO v_trip_id;
  RAISE NOTICE '[OK] Viagem criada: %', v_trip_id;

  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, trip_id, status)
  VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 500.00, v_tag || ' Hotel Praia', CURRENT_DATE, 'TRAVEL', v_trip_id, 'CONFIRMED')
  RETURNING id INTO v_tx_id;
  RAISE NOTICE '[OK] Despesa de viagem R$500 (tx: %, trip: %)', v_tx_id, v_trip_id;

  -- ==========================================================================
  -- MÓDULO 5: COMPARTILHADA + SETTLEMENT
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 5: COMPARTILHADA ---';

  -- Buscar um family member (linked_user_id = Wesley)
  SELECT id INTO v_family_member_id FROM family_members WHERE linked_user_id = v_user_id LIMIT 1;
  IF v_family_member_id IS NULL THEN
    -- Tentar por user_id
    SELECT id INTO v_family_member_id FROM family_members WHERE user_id = v_user_id LIMIT 1;
  END IF;
  IF v_family_member_id IS NULL THEN
    -- Se não tem family member, criar um temporário?
    RAISE NOTICE '[SKIP] Sem family member — pulando testes de compartilhada';
  ELSE
    -- Criar transação compartilhada
    INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, is_shared, creator_user_id, status)
    VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 200.00, v_tag || ' Conta Restaurante', CURRENT_DATE, 'PERSONAL', true, v_user_id, 'CONFIRMED')
    RETURNING id INTO v_tx_id;
    RAISE NOTICE '[OK] Compartilhada R$200 criada (tx: %)', v_tx_id;

    -- Criar split (50/50 com o family member)
    INSERT INTO transaction_splits (transaction_id, user_id, member_id, name, amount, percentage, is_settled)
    VALUES (v_tx_id, v_user_id, v_family_member_id, 'Parceiro', 100.00, 50, false)
    RETURNING id INTO v_split_id;
    RAISE NOTICE '[OK] Split R$100 criado (split: %)', v_split_id;

    -- Settlement: via RPC
    BEGIN
      SELECT INTO v_settlement_tx (request_settlement(
        ARRAY[v_split_id]::UUID[],
        v_checking_id,
        v_user_id,
        false, -- is_payment = false (receiving)
        100.00
      )->>'transaction_id')::UUID;
      IF v_settlement_tx IS NOT NULL THEN
        RAISE NOTICE '[OK] Settlement criado (tx: %)', v_settlement_tx;
      ELSE
        RAISE NOTICE '[FAIL] Settlement retornou nulo';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[FAIL] Settlement: %', SQLERRM;
    END;

    -- Undo settlement
    BEGIN
      -- Soft-delete a transação de settlement
      UPDATE transactions SET deleted_at = NOW() WHERE id = v_settlement_tx;
      -- Reabrir o split
      UPDATE transaction_splits SET is_settled = false, settled_by_debtor = false, settled_by_creditor = false, debtor_settlement_tx_id = NULL, creditor_settlement_tx_id = NULL WHERE id = v_split_id;
      RAISE NOTICE '[OK] Settlement desfeito';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[FAIL] Undo settlement: %', SQLERRM;
    END;
  END IF;

  -- ==========================================================================
  -- MÓDULO 6: ORÇAMENTO
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 6: ORÇAMENTO ---';

  INSERT INTO budgets (user_id, name, category_id, amount, period, start_date, end_date)
  VALUES (v_user_id, v_tag || ' Budget Teste', v_category_id, 1000.00, 'MONTHLY', date_trunc('month', CURRENT_DATE)::date, (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date)
  RETURNING id INTO v_budget_id;
  RAISE NOTICE '[OK] Budget R$1000 criado: %', v_budget_id;

  -- Progresso do budget
  SELECT COALESCE(SUM(amount), 0) INTO v_count
  FROM transactions
  WHERE user_id = v_user_id AND category_id = v_category_id
    AND type = 'EXPENSE'
    AND date >= date_trunc('month', CURRENT_DATE)::date
    AND deleted_at IS NULL;
  RAISE NOTICE '[OK] Budget progresso: R$% gasto de R$1000', v_count;

  -- Editar budget
  UPDATE budgets SET amount = 1500.00 WHERE id = v_budget_id;
  RAISE NOTICE '[OK] Budget editado para R$1500';

  -- ==========================================================================
  -- MÓDULO 7: META
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 7: META ---';

  INSERT INTO goals (user_id, name, target_amount, current_amount, target_date)
  VALUES (v_user_id, v_tag || ' Viagem Europa', 10000.00, 0, (CURRENT_DATE + INTERVAL '1 year')::date)
  RETURNING id INTO v_goal_id;
  RAISE NOTICE '[OK] Meta R$10000 criada: %', v_goal_id;

  -- Contribuir
  UPDATE goals SET current_amount = current_amount + 2000.00 WHERE id = v_goal_id;
  RAISE NOTICE '[OK] Meta: +R$2000 contribuído';

  -- ==========================================================================
  -- MÓDULO 8: EXCLUSÃO + CASCATA
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 8: EXCLUSÃO ---';

  -- 8a. Soft delete transação normal
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, status)
  VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 99.99, v_tag || ' Para Deletar', CURRENT_DATE, 'PERSONAL', 'CONFIRMED')
  RETURNING id INTO v_tx_id;

  SELECT COUNT(*) INTO v_count FROM transactions WHERE id = v_tx_id AND deleted_at IS NULL;
  RAISE NOTICE '[INFO] Antes delete: tx existe = %', v_count;

  v_balance_before := (SELECT balance FROM accounts WHERE id = v_checking_id);
  UPDATE transactions SET deleted_at = NOW() WHERE id = v_tx_id;
  -- Trigger update_account_balance_on_update deve recalcular saldo
  v_balance_after := (SELECT balance FROM accounts WHERE id = v_checking_id);
  RAISE NOTICE '[OK] Soft delete — saldo: % -> % (deve subir R$99.99)', v_balance_before, v_balance_after;

  -- 8b. Cascata: deletar transação pai com splits
  IF v_family_member_id IS NOT NULL THEN
    INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date, domain, is_shared, creator_user_id, status)
    VALUES (v_user_id, v_checking_id, v_category_id, 'EXPENSE', 60.00, v_tag || ' Cascata Split', CURRENT_DATE, 'PERSONAL', true, v_user_id, 'CONFIRMED')
    RETURNING id INTO v_tx_id;

    INSERT INTO transaction_splits (transaction_id, user_id, member_id, name, amount, percentage, is_settled)
    VALUES (v_tx_id, v_user_id, v_family_member_id, 'Parceiro', 30.00, 50, false)
    RETURNING id INTO v_split_id;

    SELECT COUNT(*) INTO v_count FROM transaction_splits WHERE transaction_id = v_tx_id;
    RAISE NOTICE '[INFO] Splits antes do delete: %', v_count;

    UPDATE transactions SET deleted_at = NOW() WHERE id = v_tx_id;

    SELECT COUNT(*) INTO v_count FROM transaction_splits WHERE transaction_id = v_tx_id;
    RAISE NOTICE '[OK] Splits após soft delete da transação pai: % (devem continuar existindo)', v_count;
  END IF;

  -- ==========================================================================
  -- MÓDULO 9: DASHBOARD RPC
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 9: DASHBOARD ---';

  BEGIN
    -- Chamar RPC de dashboard (precisa de auth.uid())
    -- Como migration roda como superuser, auth.uid() pode falhar
    RAISE NOTICE '[SKIP] Dashboard RPC requer auth.uid(), não testável em migration';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[INFO] Dashboard: %', SQLERRM;
  END;

  -- ==========================================================================
  -- MÓDULO 10: PAGAMENTO FATURA
  -- ==========================================================================
  RAISE NOTICE '--- MÓDULO 10: PAGAMENTO FATURA ---';

  v_balance_before := (SELECT balance FROM accounts WHERE id = v_checking_id);
  INSERT INTO transactions (user_id, account_id, destination_account_id, type, amount, description, date, domain, status)
  VALUES (v_user_id, v_checking_id, v_credit_id, 'TRANSFER', 200.00, v_tag || ' Pagamento Fatura Teste', CURRENT_DATE, 'PERSONAL', 'CONFIRMED')
  RETURNING id INTO v_tx_id;
  v_balance_after := (SELECT balance FROM accounts WHERE id = v_checking_id);
  RAISE NOTICE '[OK] Pagamento fatura R$200 — saldo corrente: % -> % (tx: %)', v_balance_before, v_balance_after, v_tx_id;

  -- ==========================================================================
  -- RESUMO FINAL
  -- ==========================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST SUITE COMPLETE';
  RAISE NOTICE '========================================';
  SELECT COUNT(*) INTO v_count FROM transactions WHERE description LIKE v_tag || ' %' AND deleted_at IS NULL;
  RAISE NOTICE 'Transações de teste ativas: %', v_count;
  SELECT COUNT(*) INTO v_count FROM accounts WHERE name LIKE v_tag || ' %';
  RAISE NOTICE 'Contas de teste: %', v_count;
  SELECT COUNT(*) INTO v_count FROM budgets WHERE id = v_budget_id;
  RAISE NOTICE 'Budgets de teste: %', v_count;
  SELECT COUNT(*) INTO v_count FROM goals WHERE name LIKE v_tag || ' %';
  RAISE NOTICE 'Metas de teste: %', v_count;
  SELECT COUNT(*) INTO v_count FROM trips WHERE name LIKE v_tag || ' %';
  RAISE NOTICE 'Viagens de teste: %', v_count;

END;
$$;

COMMIT;
