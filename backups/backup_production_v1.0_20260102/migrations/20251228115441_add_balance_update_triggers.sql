-- Trigger para atualizar saldo após INSERT
CREATE OR REPLACE FUNCTION update_account_balance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atualiza se tem account_id e não é pago por outro
  IF NEW.account_id IS NOT NULL AND 
     (NEW.payer_id IS NULL OR NEW.payer_id = (SELECT id FROM family_members WHERE user_id = NEW.user_id LIMIT 1)) THEN
    
    IF NEW.type = 'EXPENSE' THEN
      UPDATE accounts 
      SET balance = balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
      
    ELSIF NEW.type = 'INCOME' THEN
      UPDATE accounts 
      SET balance = balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
      
    ELSIF NEW.type = 'TRANSFER' THEN
      -- Debita origem
      UPDATE accounts 
      SET balance = balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
      
      -- Credita destino
      IF NEW.destination_account_id IS NOT NULL THEN
        UPDATE accounts 
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.destination_account_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_update_balance_insert ON transactions;
CREATE TRIGGER trg_update_balance_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_insert();

-- Trigger para reverter saldo após DELETE
CREATE OR REPLACE FUNCTION update_account_balance_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.account_id IS NOT NULL AND 
     (OLD.payer_id IS NULL OR OLD.payer_id = (SELECT id FROM family_members WHERE user_id = OLD.user_id LIMIT 1)) THEN
    
    IF OLD.type = 'EXPENSE' THEN
      UPDATE accounts 
      SET balance = balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
      
    ELSIF OLD.type = 'INCOME' THEN
      UPDATE accounts 
      SET balance = balance - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
      
    ELSIF OLD.type = 'TRANSFER' THEN
      UPDATE accounts 
      SET balance = balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.account_id;
      
      IF OLD.destination_account_id IS NOT NULL THEN
        UPDATE accounts 
        SET balance = balance - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.destination_account_id;
      END IF;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_update_balance_delete ON transactions;
CREATE TRIGGER trg_update_balance_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_delete();

-- Função para recalcular saldo de uma conta
CREATE OR REPLACE FUNCTION recalculate_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
BEGIN
  -- Buscar saldo inicial
  SELECT COALESCE(initial_balance, 0) INTO v_initial_balance
  FROM accounts WHERE id = p_account_id;
  
  -- Calcular saldo baseado em transações
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
    AND (payer_id IS NULL OR payer_id = (SELECT id FROM family_members WHERE user_id = transactions.user_id LIMIT 1));
  
  -- Atualizar saldo da conta
  UPDATE accounts SET balance = v_calculated_balance, updated_at = NOW()
  WHERE id = p_account_id;
  
  RETURN v_calculated_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
