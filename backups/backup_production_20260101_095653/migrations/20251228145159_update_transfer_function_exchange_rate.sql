-- Update transfer_between_accounts function to support exchange rate for cross-currency transfers
CREATE OR REPLACE FUNCTION public.transfer_between_accounts(
  p_from_account_id uuid, 
  p_to_account_id uuid, 
  p_amount numeric, 
  p_description text DEFAULT 'Transferência'::text, 
  p_date date DEFAULT CURRENT_DATE,
  p_exchange_rate numeric DEFAULT NULL,
  p_destination_amount numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_from_balance DECIMAL(10,2);
  v_from_name TEXT;
  v_from_currency TEXT;
  v_to_name TEXT;
  v_to_currency TEXT;
  v_debit_id UUID;
  v_credit_id UUID;
  v_user_id UUID;
  v_credit_amount DECIMAL(10,2);
  v_is_cross_currency BOOLEAN;
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
  
  -- Get source account info
  SELECT balance, name, COALESCE(currency, 'BRL') INTO v_from_balance, v_from_name, v_from_currency
  FROM accounts 
  WHERE id = p_from_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de origem não encontrada';
  END IF;
  
  -- Get destination account info
  SELECT name, COALESCE(currency, 'BRL') INTO v_to_name, v_to_currency
  FROM accounts 
  WHERE id = p_to_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de destino não encontrada';
  END IF;
  
  -- Check if cross-currency transfer
  v_is_cross_currency := v_from_currency <> v_to_currency;
  
  -- Validate exchange rate for cross-currency transfers
  IF v_is_cross_currency AND (p_exchange_rate IS NULL OR p_exchange_rate <= 0) THEN
    RAISE EXCEPTION 'Taxa de câmbio é obrigatória para transferências entre moedas diferentes';
  END IF;
  
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;
  
  -- Calculate credit amount
  IF v_is_cross_currency THEN
    v_credit_amount := COALESCE(p_destination_amount, p_amount / p_exchange_rate);
  ELSE
    v_credit_amount := p_amount;
  END IF;
  
  -- Create debit transaction (from source account)
  INSERT INTO transactions (
    user_id, account_id, type, amount, description, date, category, currency, exchange_rate
  ) VALUES (
    v_user_id, p_from_account_id, 'TRANSFER', -p_amount, 
    p_description || ' → ' || v_to_name, p_date, 'Transferência', v_from_currency,
    CASE WHEN v_is_cross_currency THEN p_exchange_rate ELSE NULL END
  ) RETURNING id INTO v_debit_id;
  
  -- Create credit transaction (to destination account)
  INSERT INTO transactions (
    user_id, account_id, type, amount, description, date, category, linked_transaction_id, currency, exchange_rate
  ) VALUES (
    v_user_id, p_to_account_id, 'TRANSFER', v_credit_amount,
    p_description || ' ← ' || v_from_name, p_date, 'Transferência', v_debit_id, v_to_currency,
    CASE WHEN v_is_cross_currency THEN p_exchange_rate ELSE NULL END
  ) RETURNING id INTO v_credit_id;
  
  -- Link transactions
  UPDATE transactions 
  SET linked_transaction_id = v_credit_id 
  WHERE id = v_debit_id;
  
  -- Update account balances
  UPDATE accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_from_account_id;
  UPDATE accounts SET balance = balance + v_credit_amount, updated_at = NOW() WHERE id = p_to_account_id;
  
  RETURN json_build_object(
    'success', true, 
    'debit_id', v_debit_id, 
    'credit_id', v_credit_id,
    'amount', p_amount, 
    'credit_amount', v_credit_amount,
    'from_account', v_from_name, 
    'to_account', v_to_name,
    'from_currency', v_from_currency,
    'to_currency', v_to_currency,
    'exchange_rate', p_exchange_rate,
    'is_cross_currency', v_is_cross_currency
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;;
