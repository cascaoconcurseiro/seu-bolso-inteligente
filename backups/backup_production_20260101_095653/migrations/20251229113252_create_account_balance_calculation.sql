CREATE OR REPLACE FUNCTION calculate_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'INCOME' AND account_id = p_account_id THEN amount
      WHEN type = 'EXPENSE' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN amount
      ELSE 0
    END
  ), 0) INTO v_balance
  FROM transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id);
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql STABLE;;
