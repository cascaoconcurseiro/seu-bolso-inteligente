-- Migration to fix future transactions impacting current account balance
-- Goal: Ensure accounts.balance only reflects transactions where date <= CURRENT_DATE

-- 1. Function to recalculate account balance (Updated to respect date)
CREATE OR REPLACE FUNCTION recalculate_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
BEGIN
  -- Buscar saldo inicial
  SELECT COALESCE(initial_balance, 0) INTO v_initial_balance
  FROM accounts WHERE id = p_account_id;
  
  -- Calcular saldo baseado APENAS em transações até HOJE
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
    AND (payer_id IS NULL OR payer_id = (SELECT id FROM family_members WHERE user_id = transactions.user_id LIMIT 1))
    AND date <= CURRENT_DATE; -- FIX: Ignore future transactions
  
  -- Atualizar saldo da conta
  UPDATE accounts SET balance = v_calculated_balance, updated_at = NOW()
  WHERE id = p_account_id;
  
  RETURN v_calculated_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger for INSERT
CREATE OR REPLACE FUNCTION update_account_balance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atualiza se tem account_id, não é pago por outro E A DATA É HOJE OU PASSADO
  IF NEW.account_id IS NOT NULL AND 
     (NEW.payer_id IS NULL OR NEW.payer_id = (SELECT id FROM family_members WHERE user_id = NEW.user_id LIMIT 1)) AND
     NEW.date <= CURRENT_DATE THEN -- FIX: Ignore future transactions
    
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

-- 3. Trigger for DELETE
CREATE OR REPLACE FUNCTION update_account_balance_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Só reverte se tinha account_id, não era pago por outro E A DATA ERA HOJE OU PASSADO
  IF OLD.account_id IS NOT NULL AND 
     (OLD.payer_id IS NULL OR OLD.payer_id = (SELECT id FROM family_members WHERE user_id = OLD.user_id LIMIT 1)) AND
     OLD.date <= CURRENT_DATE THEN -- FIX: Ignore future transactions
    
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

-- 4. Trigger for UPDATE (New logic to handle date changes)
CREATE OR REPLACE FUNCTION update_account_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou conta, valor, tipo ou DATA, recalcular é mais seguro e simples
  -- do que tentar fazer delta lógico considerando todas as permutações de data (futuro->passado, passado->futuro)
  
  IF OLD.account_id IS DISTINCT FROM NEW.account_id OR
     OLD.amount IS DISTINCT FROM NEW.amount OR
     OLD.type IS DISTINCT FROM NEW.type OR
     OLD.date IS DISTINCT FROM NEW.date OR
     OLD.destination_account_id IS DISTINCT FROM NEW.destination_account_id THEN
     
     -- Recalcular conta antiga (se existia)
     IF OLD.account_id IS NOT NULL THEN
       PERFORM recalculate_account_balance(OLD.account_id);
     END IF;
     
     -- Recalcular nova conta (se diferente da antiga e não nula)
     IF NEW.account_id IS NOT NULL AND NEW.account_id IS DISTINCT FROM OLD.account_id THEN
       PERFORM recalculate_account_balance(NEW.account_id);
     END IF;
     
     -- Se contas são iguais, o primeiro recalculo já resolveu, mas se mudou apenas valor/data na mesma conta:
     IF NEW.account_id IS NOT NULL AND NEW.account_id = OLD.account_id THEN
       PERFORM recalculate_account_balance(NEW.account_id);
     END IF;
     
     -- Lidar com conta destino em transferências
     IF OLD.destination_account_id IS DISTINCT FROM NEW.destination_account_id THEN
        IF OLD.destination_account_id IS NOT NULL THEN
          PERFORM recalculate_account_balance(OLD.destination_account_id);
        END IF;
        IF NEW.destination_account_id IS NOT NULL THEN
          PERFORM recalculate_account_balance(NEW.destination_account_id);
        END IF;
     END IF;
     
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate update trigger
DROP TRIGGER IF EXISTS trg_update_balance_update ON transactions;
CREATE TRIGGER trg_update_balance_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_update();

-- 5. Force recalculation of ALL accounts now to fix any existing drift
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM accounts LOOP
    PERFORM recalculate_account_balance(r.id);
  END LOOP;
END;
$$;
