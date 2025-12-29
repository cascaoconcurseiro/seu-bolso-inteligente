-- Corrigir a RPC para usar bank_id em vez de bank
CREATE OR REPLACE FUNCTION create_account_with_initial_deposit(
  p_name TEXT,
  p_type account_type,
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
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  IF p_initial_balance < 0 THEN
    RAISE EXCEPTION 'Saldo inicial não pode ser negativo';
  END IF;
  
  -- Usar bank_id em vez de bank
  INSERT INTO accounts (user_id, name, type, bank_id, balance, initial_balance, currency)
  VALUES (v_user_id, p_name, p_type, p_bank, p_initial_balance, p_initial_balance, p_currency)
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
$$;;
