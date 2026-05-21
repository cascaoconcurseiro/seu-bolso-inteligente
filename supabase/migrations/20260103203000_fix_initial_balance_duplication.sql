-- Migration to fix duplicate initial balance counting
-- Problem: create_account_with_initial_deposit was setting accounts.initial_balance AND creating a transaction.
-- Result: recalculated balance summed both, doubling the initial amount.

DO $$
DECLARE
  r RECORD;
  v_transaction_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- 1. Data Fix: For each account with initial_balance != 0
  FOR r IN SELECT * FROM accounts WHERE initial_balance != 0 LOOP
    
    -- Check for matching transaction (same amount, 'Depósito inicial')
    SELECT id INTO v_transaction_id
    FROM transactions 
    WHERE account_id = r.id 
      AND amount = r.initial_balance 
      AND description = 'Depósito inicial'
      AND type = 'INCOME'
    LIMIT 1;

    -- If matches, assume duplication: Zero out the column (transaction is the truth)
    IF v_transaction_id IS NOT NULL THEN
      UPDATE accounts SET initial_balance = 0 WHERE id = r.id;
      -- Force recalculation
      PERFORM recalculate_account_balance(r.id);
      v_count := v_count + 1;
      RAISE NOTICE 'Fixed duplication for account % (Amount: %)', r.name, r.initial_balance;
    END IF;

  END LOOP;
  
  RAISE NOTICE 'Fixed % accounts with duplicated initial balance', v_count;
END;
$$;

-- 2. Update RPC to avoid future duplication
-- We keep the signature but change logic to NOT set initial_balance in accounts table if we create a transaction
CREATE OR REPLACE FUNCTION create_account_with_initial_deposit(
  p_name TEXT,
  p_type TEXT,
  p_bank TEXT DEFAULT NULL,
  p_initial_balance NUMERIC DEFAULT 0,
  p_currency TEXT DEFAULT 'BRL'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
  v_transaction_id UUID;
  v_user_id UUID;
  v_account_type account_type;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  IF p_initial_balance < 0 THEN
    RAISE EXCEPTION 'Saldo inicial não pode ser negativo';
  END IF;
  
  -- Converter texto para enum
  v_account_type := p_type::account_type;
  
  -- Criar conta com bank_id
  -- FIX: Sempre gravar initial_balance = 0 pois vamos criar uma transação para representar esse valor
  INSERT INTO accounts (user_id, name, type, bank_id, balance, initial_balance, currency, is_active)
  VALUES (v_user_id, p_name, v_account_type, p_bank, 0, 0, p_currency, true)
  RETURNING id INTO v_account_id;
  
  -- Criar transação de depósito inicial se houver saldo
  IF p_initial_balance > 0 THEN
    INSERT INTO transactions (
      user_id, account_id, type, amount, description, date, category, domain
    ) VALUES (
      v_user_id, v_account_id, 'INCOME', p_initial_balance, 
      'Depósito inicial', CURRENT_DATE, 'Depósito', 'PERSONAL'
    ) RETURNING id INTO v_transaction_id;
    
    -- Atualizar saldo da conta para refletir a transação
    -- (Embora o trigger update_account_balance_on_insert deva cuidar disso, garantimos aqui)
    PERFORM recalculate_account_balance(v_account_id);
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'account_id', v_account_id, 
    'initial_balance', p_initial_balance,
    'deposit_transaction_id', v_transaction_id, 
    'has_initial_deposit', p_initial_balance > 0
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
