-- ============================================================================
-- Fix: recalculate_account_balance needs SET search_path = 'public'
-- Triggers with search_path = '' call this function, which then can't find
-- the accounts/transactions/family_members tables (unqualified references).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
BEGIN
  SELECT COALESCE(initial_balance, 0) INTO v_initial_balance
  FROM accounts WHERE id = p_account_id;

  SELECT v_initial_balance + COALESCE(SUM(
    CASE
      WHEN type = 'INCOME' THEN amount
      WHEN type = 'EXPENSE' THEN -amount
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN amount
      ELSE 0
    END
  ), 0) INTO v_calculated_balance
  FROM transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND (
      payer_id IS NULL
      OR payer_id = ANY(
        ARRAY(SELECT id FROM family_members WHERE user_id = transactions.user_id)
      )
    )
    AND date <= CURRENT_DATE
    AND deleted_at IS NULL;

  UPDATE accounts SET balance = v_calculated_balance, updated_at = NOW()
  WHERE id = p_account_id;

  RETURN v_calculated_balance;
END;
$$;

COMMIT;
