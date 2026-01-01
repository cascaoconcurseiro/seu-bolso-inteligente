-- Remover as funções duplicadas
DROP FUNCTION IF EXISTS create_account_with_initial_deposit(text, text, text, numeric, text);
DROP FUNCTION IF EXISTS create_account_with_initial_deposit(text, account_type, text, numeric, text);

-- Criar uma única versão correta
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
  INSERT INTO accounts (user_id, name, type, bank_id, balance, initial_balance, currency, is_active)
  VALUES (v_user_id, p_name, v_account_type, p_bank, p_initial_balance, p_initial_balance, p_currency, true)
  RETURNING id INTO v_account_id;
  
  -- Criar transação de depósito inicial se houver saldo
  IF p_initial_balance > 0 THEN
    INSERT INTO transactions (
      user_id, account_id, type, amount, description, date, category, domain
    ) VALUES (
      v_user_id, v_account_id, 'INCOME', p_initial_balance, 
      'Depósito inicial', CURRENT_DATE, 'Depósito', 'PERSONAL'
    ) RETURNING id INTO v_transaction_id;
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
$$;;
