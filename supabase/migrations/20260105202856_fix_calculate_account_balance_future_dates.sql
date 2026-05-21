-- Fix: calculate_account_balance deve ignorar transações futuras
DROP FUNCTION IF EXISTS public.calculate_account_balance(UUID);

CREATE OR REPLACE FUNCTION public.calculate_account_balance(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_balance NUMERIC := 0;
BEGIN
  -- Buscar saldo inicial
  SELECT COALESCE(initial_balance, 0) INTO v_initial_balance
  FROM accounts WHERE id = p_account_id;
  
  -- Calcular saldo baseado APENAS em transações até HOJE
  SELECT v_initial_balance + COALESCE(SUM(
    CASE 
      WHEN type = 'INCOME' AND account_id = p_account_id THEN amount
      WHEN type = 'EXPENSE' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN amount
      ELSE 0
    END
  ), 0) INTO v_balance
  FROM transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND date <= CURRENT_DATE; -- ✅ FIX: Ignorar transações futuras
  
  RETURN v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_account_balance TO authenticated;

COMMENT ON FUNCTION public.calculate_account_balance IS 
'Calcula saldo da conta baseado no saldo inicial + transações até hoje (excluindo futuras)';;
