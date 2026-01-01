CREATE OR REPLACE FUNCTION recalculate_all_account_balances()
RETURNS TABLE(account_id UUID, account_name TEXT, old_balance NUMERIC, new_balance NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH updated AS (
    UPDATE accounts a
    SET balance = calculate_account_balance(a.id),
        updated_at = NOW()
    RETURNING a.id, a.name, a.balance
  )
  SELECT u.id, u.name, a.balance as old_bal, u.balance as new_bal
  FROM updated u
  JOIN accounts a ON a.id = u.id;
END;
$$ LANGUAGE plpgsql;;
