-- Função para calcular saldo de conta
CREATE OR REPLACE FUNCTION calculate_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
  v_user_id UUID;
BEGIN
  SELECT COALESCE(initial_balance, 0), user_id 
  INTO v_initial_balance, v_user_id
  FROM accounts WHERE id = p_account_id;
  
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT v_initial_balance + COALESCE(SUM(
    CASE 
      WHEN type = 'INCOME' AND source_transaction_id IS NULL THEN amount
      WHEN type = 'EXPENSE' AND source_transaction_id IS NULL 
           AND (payer_id IS NULL OR payer_id IN (
             SELECT id FROM family_members WHERE user_id = v_user_id
           )) THEN -amount
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN amount
      ELSE 0
    END
  ), 0) INTO v_calculated_balance
  FROM transactions
  WHERE user_id = v_user_id
    AND (account_id = p_account_id OR destination_account_id = p_account_id);
  
  RETURN v_calculated_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar is_settled
CREATE OR REPLACE FUNCTION sync_transaction_settled_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_settled = TRUE THEN
    IF NOT EXISTS (
      SELECT 1 FROM transaction_splits 
      WHERE transaction_id = NEW.transaction_id 
      AND id != NEW.id
      AND (is_settled IS NULL OR is_settled = FALSE)
    ) THEN
      UPDATE transactions SET is_settled = TRUE WHERE id = NEW.transaction_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_settled_status ON transaction_splits;
CREATE TRIGGER trg_sync_settled_status
AFTER UPDATE OF is_settled ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION sync_transaction_settled_status();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_competence_date ON transactions(competence_date);
CREATE INDEX IF NOT EXISTS idx_transactions_source_transaction_id ON transactions(source_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_settled ON transaction_splits(transaction_id, is_settled);;
