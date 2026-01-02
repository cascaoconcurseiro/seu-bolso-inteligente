-- Add TRANSFER and WITHDRAWAL transaction types
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

-- Transfer function
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

-- Withdrawal function
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

-- Account creation function
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

-- Trip permissions
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

CREATE POLICY "Trip members can view itinerary" ON trip_itinerary FOR SELECT
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can add itinerary items" ON trip_itinerary FOR INSERT
  WITH CHECK (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can update itinerary items" ON trip_itinerary FOR UPDATE
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can delete itinerary items" ON trip_itinerary FOR DELETE
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can view checklist" ON trip_checklist FOR SELECT
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can add checklist items" ON trip_checklist FOR INSERT
  WITH CHECK (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can update checklist items" ON trip_checklist FOR UPDATE
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));

CREATE POLICY "Trip members can delete checklist items" ON trip_checklist FOR DELETE
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));;
