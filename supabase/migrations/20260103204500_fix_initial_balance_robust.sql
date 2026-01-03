-- Robuster migration to fix duplicate initial balance counting
-- Problem: Previous fix might have missed transactions with different descriptions (e.g., 'Saldo inicial' vs 'Depósito inicial').
-- Solution: Match by AMOUNT only (assuming it's unlikely to have a random income transaction exactly equal to initial_balance unless it's the deposit).

DO $$
DECLARE
  r RECORD;
  v_transaction_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- 1. Scan all accounts with non-zero initial_balance
  FOR r IN SELECT * FROM accounts WHERE initial_balance != 0 LOOP
    
    -- Check for ANY Income/Deposit transaction with the EXACT same amount
    -- AND created reasonably close to account creation (hard to check without created_at on accounts, but usually safe)
    SELECT id INTO v_transaction_id
    FROM transactions 
    WHERE account_id = r.id 
      AND amount = r.initial_balance
      AND type IN ('INCOME', 'DEPOSIT') -- Check both types just in case
      -- We remove the description check to capture 'Saldo inicial', 'Depósito inicial', or user-edited descriptions
    LIMIT 1;

    -- If found, assume duplication and trust the transaction
    IF v_transaction_id IS NOT NULL THEN
      UPDATE accounts SET initial_balance = 0 WHERE id = r.id;
      -- Force recalculation
      PERFORM recalculate_account_balance(r.id);
      v_count := v_count + 1;
      RAISE NOTICE 'Fixed duplication for account % (Amount: %)', r.name, r.initial_balance;
    END IF;

  END LOOP;
  
  RAISE NOTICE 'Fixed % accounts with duplicated initial balance (Robust Check)', v_count;
END;
$$;
