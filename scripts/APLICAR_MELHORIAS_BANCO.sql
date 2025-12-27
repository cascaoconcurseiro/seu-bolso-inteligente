-- ============================================================================
-- SCRIPT CONSOLIDADO: MELHORIAS EM VIAGENS E CONTAS
-- ============================================================================
-- Execute este script no SQL Editor do Supabase
-- Aplica todas as melhorias de banco de dados de uma vez

-- IMPORTANTE: Execute TODO o conteúdo de uma vez

-- ============================================================================
-- 1. ADICIONAR TIPOS DE TRANSAÇÃO E COLUNA LINKED
-- ============================================================================

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'WITHDRAWAL';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'DEPOSIT';

ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_linked 
  ON transactions(linked_transaction_id) 
  WHERE linked_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_type 
  ON transactions(type);

-- ============================================================================
-- 2. FUNÇÃO: TRANSFERÊNCIA ENTRE CONTAS
-- ============================================================================

CREATE OR REPLACE FUNCTION transfer_between_accounts(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount DECIMAL(10,2),
  p_description TEXT DEFAULT 'Transferência',
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance DECIMAL(10,2);
  v_from_name TEXT;
  v_to_name TEXT;
  v_debit_id UUID;
  v_credit_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Não é possível transferir para a mesma conta';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;
  
  SELECT balance, name INTO v_from_balance, v_from_name
  FROM accounts 
  WHERE id = p_from_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de origem não encontrada';
  END IF;
  
  SELECT name INTO v_to_name
  FROM accounts 
  WHERE id = p_to_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de destino não encontrada';
  END IF;
  
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;
  
  INSERT INTO transactions (
    user_id, account_id, type, amount, description, date, category
  ) VALUES (
    v_user_id, p_from_account_id, 'TRANSFER', -p_amount, 
    p_description || ' → ' || v_to_name, p_date, 'Transferência'
  ) RETURNING id INTO v_debit_id;
  
  INSERT INTO transactions (
    user_id, account_id, type, amount, description, date, category, linked_transaction_id
  ) VALUES (
    v_user_id, p_to_account_id, 'TRANSFER', p_amount,
    p_description || ' ← ' || v_from_name, p_date, 'Transferência', v_debit_id
  ) RETURNING id INTO v_credit_id;
  
  UPDATE transactions 
  SET linked_transaction_id = v_credit_id 
  WHERE id = v_debit_id;
  
  UPDATE accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_from_account_id;
  UPDATE accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = p_to_account_id;
  
  RETURN json_build_object(
    'success', true, 'debit_id', v_debit_id, 'credit_id', v_credit_id,
    'amount', p_amount, 'from_account', v_from_name, 'to_account', v_to_name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION transfer_between_accounts TO authenticated;

-- ============================================================================
-- 3. FUNÇÃO: SAQUE DE CONTA
-- ============================================================================

CREATE OR REPLACE FUNCTION withdraw_from_account(
  p_account_id UUID,
  p_amount DECIMAL(10,2),
  p_description TEXT DEFAULT 'Saque em dinheiro',
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL(10,2);
  v_account_name TEXT;
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;
  
  SELECT balance, name INTO v_balance, v_account_name
  FROM accounts 
  WHERE id = p_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta não encontrada';
  END IF;
  
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente para saque';
  END IF;
  
  INSERT INTO transactions (
    user_id, account_id, type, amount, description, date, category
  ) VALUES (
    v_user_id, p_account_id, 'WITHDRAWAL', -p_amount, p_description, p_date, 'Saque'
  ) RETURNING id INTO v_transaction_id;
  
  UPDATE accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_account_id;
  
  RETURN json_build_object(
    'success', true, 'transaction_id', v_transaction_id,
    'amount', p_amount, 'account', v_account_name, 'new_balance', v_balance - p_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION withdraw_from_account TO authenticated;

-- ============================================================================
-- 4. FUNÇÃO: CRIAR CONTA COM DEPÓSITO INICIAL
-- ============================================================================

CREATE OR REPLACE FUNCTION create_account_with_initial_deposit(
  p_name TEXT,
  p_type TEXT,
  p_bank TEXT,
  p_initial_balance DECIMAL(10,2) DEFAULT 0,
  p_currency TEXT DEFAULT 'BRL'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  IF p_initial_balance < 0 THEN
    RAISE EXCEPTION 'Saldo inicial não pode ser negativo';
  END IF;
  
  INSERT INTO accounts (user_id, name, type, bank, balance, currency)
  VALUES (v_user_id, p_name, p_type, p_bank, p_initial_balance, p_currency)
  RETURNING id INTO v_account_id;
  
  IF p_initial_balance > 0 THEN
    INSERT INTO transactions (
      user_id, account_id, type, amount, description, date, category
    ) VALUES (
      v_user_id, v_account_id, 'DEPOSIT', p_initial_balance, 
      'Depósito inicial', CURRENT_DATE, 'Depósito'
    ) RETURNING id INTO v_transaction_id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 'account_id', v_account_id, 'initial_balance', p_initial_balance,
    'deposit_transaction_id', v_transaction_id, 'has_initial_deposit', p_initial_balance > 0
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION create_account_with_initial_deposit TO authenticated;

-- ============================================================================
-- 5. POLICIES PARA ITINERÁRIO E CHECKLIST
-- ============================================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Trip members can view itinerary" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip owners can manage itinerary" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can add itinerary items" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can update itinerary items" ON trip_itinerary;
DROP POLICY IF EXISTS "Trip members can delete itinerary items" ON trip_itinerary;

DROP POLICY IF EXISTS "Trip members can view checklist" ON trip_checklist;
DROP POLICY IF EXISTS "Trip owners can manage checklist" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can add checklist items" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can update checklist items" ON trip_checklist;
DROP POLICY IF EXISTS "Trip members can delete checklist items" ON trip_checklist;

-- Itinerário
CREATE POLICY "Trip members can view itinerary" ON trip_itinerary FOR SELECT
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can add itinerary items" ON trip_itinerary FOR INSERT
  WITH CHECK (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can update itinerary items" ON trip_itinerary FOR UPDATE
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can delete itinerary items" ON trip_itinerary FOR DELETE
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

-- Checklist
CREATE POLICY "Trip members can view checklist" ON trip_checklist FOR SELECT
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can add checklist items" ON trip_checklist FOR INSERT
  WITH CHECK (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can update checklist items" ON trip_checklist FOR UPDATE
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can delete checklist items" ON trip_checklist FOR DELETE
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

-- ============================================================================
-- 6. VALIDAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  v_has_transfer BOOLEAN;
  v_has_withdrawal BOOLEAN;
  v_has_deposit BOOLEAN;
  v_has_column BOOLEAN;
  v_func_transfer BOOLEAN;
  v_func_withdrawal BOOLEAN;
  v_func_account BOOLEAN;
  v_itinerary_policies INTEGER;
  v_checklist_policies INTEGER;
BEGIN
  -- Verificar tipos
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'TRANSFER'
  ) INTO v_has_transfer;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'WITHDRAWAL'
  ) INTO v_has_withdrawal;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'DEPOSIT'
  ) INTO v_has_deposit;
  
  -- Verificar coluna
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'linked_transaction_id'
  ) INTO v_has_column;
  
  -- Verificar funções
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'transfer_between_accounts') INTO v_func_transfer;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'withdraw_from_account') INTO v_func_withdrawal;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_account_with_initial_deposit') INTO v_func_account;
  
  -- Verificar policies
  SELECT COUNT(*) INTO v_itinerary_policies FROM pg_policies WHERE tablename = 'trip_itinerary';
  SELECT COUNT(*) INTO v_checklist_policies FROM pg_policies WHERE tablename = 'trip_checklist';
  
  RAISE NOTICE '=== VALIDAÇÃO COMPLETA ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Tipos de Transação:';
  RAISE NOTICE '  TRANSFER: %', CASE WHEN v_has_transfer THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  WITHDRAWAL: %', CASE WHEN v_has_withdrawal THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  DEPOSIT: %', CASE WHEN v_has_deposit THEN '✓' ELSE '✗' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Estrutura:';
  RAISE NOTICE '  Coluna linked_transaction_id: %', CASE WHEN v_has_column THEN '✓' ELSE '✗' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Funções RPC:';
  RAISE NOTICE '  transfer_between_accounts: %', CASE WHEN v_func_transfer THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  withdraw_from_account: %', CASE WHEN v_func_withdrawal THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  create_account_with_initial_deposit: %', CASE WHEN v_func_account THEN '✓' ELSE '✗' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Policies:';
  RAISE NOTICE '  trip_itinerary: % (esperado: 4)', v_itinerary_policies;
  RAISE NOTICE '  trip_checklist: % (esperado: 4)', v_checklist_policies;
  RAISE NOTICE '';
  
  IF v_has_transfer AND v_has_withdrawal AND v_has_deposit AND v_has_column AND
     v_func_transfer AND v_func_withdrawal AND v_func_account AND
     v_itinerary_policies = 4 AND v_checklist_policies = 4 THEN
    RAISE NOTICE '✓✓✓ TODAS AS MELHORIAS FORAM APLICADAS! ✓✓✓';
    RAISE NOTICE '';
    RAISE NOTICE 'Você pode agora:';
    RAISE NOTICE '  • Transferir entre contas';
    RAISE NOTICE '  • Sacar dinheiro';
    RAISE NOTICE '  • Criar contas com depósito inicial';
    RAISE NOTICE '  • Membros podem adicionar itinerário e checklist';
  ELSE
    RAISE WARNING 'Alguns itens falharam. Verifique os detalhes acima.';
  END IF;
END $$;
