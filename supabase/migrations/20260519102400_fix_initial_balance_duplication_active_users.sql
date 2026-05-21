-- Migration to fix duplicate initial balance counting for active users
-- Problem: REST API insertions bypass RPC and set initial_balance directly in accounts table while also creating transactions.
-- Result: Recalculated balance sums both, doubling the initial amount.
-- Solution: Scan and fix accounts with duplicate initial balances.

DO $$
DECLARE
  r RECORD;
  v_transaction_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- 1. Scan all accounts with non-zero initial_balance
  FOR r IN SELECT * FROM accounts WHERE initial_balance != 0 AND (deleted IS NOT TRUE OR deleted IS NULL) LOOP
    
    -- Check for ANY Income/Deposit transaction with the EXACT same amount and related to initial deposit
    SELECT id INTO v_transaction_id
    FROM transactions 
    WHERE account_id = r.id 
      AND amount = r.initial_balance
      AND type = 'INCOME'
      AND (description ILIKE 'Saldo inicial%' OR description ILIKE 'Depósito inicial%')
    LIMIT 1;

    -- If found, assume duplication and trust the transaction (set initial_balance = 0)
    IF v_transaction_id IS NOT NULL THEN
      UPDATE accounts SET initial_balance = 0 WHERE id = r.id;
      
      -- Force recalculation of account balance
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'recalculate_account_balance') THEN
          PERFORM recalculate_account_balance(r.id);
        ELSE
          -- Fallback if recalculate function doesn't exist, calculate_account_balance does
          UPDATE accounts SET balance = calculate_account_balance(r.id) WHERE id = r.id;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Fallback manual calculation if functions fail
        UPDATE accounts SET balance = (
          SELECT COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END), 0)
          FROM transactions
          WHERE account_id = r.id AND date <= CURRENT_DATE
        ) WHERE id = r.id;
      END;

      v_count := v_count + 1;
      RAISE NOTICE 'Fixed duplication for account % (Amount: %)', r.name, r.initial_balance;
    END IF;

  END LOOP;
  
  RAISE NOTICE 'Fixed % accounts with duplicated initial balance (Active Users Check)', v_count;
END;
$$;
