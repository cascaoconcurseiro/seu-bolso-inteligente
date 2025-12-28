-- =====================================================
-- CORREÇÃO DE INTEGRIDADE FINANCEIRA - PÉ DE MEIA
-- =====================================================
-- Este script corrige:
-- 1. Preenche competence_date em todas as transações
-- 2. Recalcula saldos de todas as contas
-- 3. Sincroniza is_settled entre transaction_splits e transactions
-- 4. Remove duplicidades
-- 5. Cria função unificada de cálculo de saldo

-- =====================================================
-- 1. PREENCHER COMPETENCE_DATE EM TRANSAÇÕES ANTIGAS
-- =====================================================
UPDATE transactions 
SET competence_date = DATE_TRUNC('month', date::date)::date
WHERE competence_date IS NULL;

-- Garantir que competence_date nunca seja null no futuro
ALTER TABLE transactions 
ALTER COLUMN competence_date SET DEFAULT DATE_TRUNC('month', CURRENT_DATE)::date;

-- =====================================================
-- 2. FUNÇÃO UNIFICADA DE CÁLCULO DE SALDO
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
  v_user_id UUID;
BEGIN
  -- Buscar saldo inicial e user_id da conta
  SELECT COALESCE(initial_balance, 0), user_id 
  INTO v_initial_balance, v_user_id
  FROM accounts WHERE id = p_account_id;
  
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular saldo baseado em transações
  -- REGRAS:
  -- 1. INCOME: +amount (apenas se não é espelhada)
  -- 2. EXPENSE: -amount (apenas se não é espelhada E não é paga por outro)
  -- 3. TRANSFER origem: -amount
  -- 4. TRANSFER destino: +amount
  -- 5. Ignorar transações espelhadas (source_transaction_id IS NOT NULL)
  SELECT v_initial_balance + COALESCE(SUM(
    CASE 
      -- Receitas: sempre somam
      WHEN type = 'INCOME' AND source_transaction_id IS NULL THEN amount
      
      -- Despesas: subtraem apenas se EU paguei (payer_id é null ou é meu family_member)
      WHEN type = 'EXPENSE' AND source_transaction_id IS NULL 
           AND (payer_id IS NULL OR payer_id IN (
             SELECT id FROM family_members WHERE user_id = v_user_id
           )) THEN -amount
      
      -- Transferência saindo da conta
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      
      -- Transferência entrando na conta
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

-- =====================================================
-- 3. RECALCULAR SALDOS DE TODAS AS CONTAS
-- =====================================================
CREATE OR REPLACE FUNCTION recalculate_all_account_balances()
RETURNS TABLE(account_id UUID, old_balance NUMERIC, new_balance NUMERIC) AS $$
DECLARE
  acc RECORD;
  new_bal NUMERIC;
BEGIN
  FOR acc IN SELECT id, balance FROM accounts LOOP
    new_bal := calculate_account_balance(acc.id);
    
    IF acc.balance != new_bal THEN
      UPDATE accounts SET balance = new_bal, updated_at = NOW() WHERE id = acc.id;
      
      account_id := acc.id;
      old_balance := acc.balance;
      new_balance := new_bal;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executar recálculo
SELECT * FROM recalculate_all_account_balances();

-- =====================================================
-- 4. SINCRONIZAR IS_SETTLED
-- =====================================================
-- Quando todos os splits de uma transação estão settled, marcar a transação como settled
UPDATE transactions t
SET is_settled = TRUE
WHERE t.is_shared = TRUE
  AND t.is_settled IS NOT TRUE
  AND NOT EXISTS (
    SELECT 1 FROM transaction_splits ts 
    WHERE ts.transaction_id = t.id 
    AND (ts.is_settled IS NULL OR ts.is_settled = FALSE)
  )
  AND EXISTS (
    SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id
  );

-- =====================================================
-- 5. TRIGGER PARA MANTER IS_SETTLED SINCRONIZADO
-- =====================================================
CREATE OR REPLACE FUNCTION sync_transaction_settled_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um split é marcado como settled, verificar se todos estão settled
  IF NEW.is_settled = TRUE THEN
    -- Verificar se todos os splits da transação estão settled
    IF NOT EXISTS (
      SELECT 1 FROM transaction_splits 
      WHERE transaction_id = NEW.transaction_id 
      AND id != NEW.id
      AND (is_settled IS NULL OR is_settled = FALSE)
    ) THEN
      -- Todos settled, marcar transação como settled
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

-- =====================================================
-- 6. CORRIGIR TRIGGERS DE SALDO (VERSÃO MELHORADA)
-- =====================================================
CREATE OR REPLACE FUNCTION update_account_balance_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_member_id UUID;
BEGIN
  -- Buscar o family_member_id do usuário
  SELECT id INTO v_user_member_id 
  FROM family_members 
  WHERE user_id = NEW.user_id 
  LIMIT 1;
  
  -- Ignorar transações espelhadas (elas não afetam saldo)
  IF NEW.source_transaction_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Só atualiza se tem account_id
  IF NEW.account_id IS NOT NULL THEN
    IF NEW.type = 'INCOME' THEN
      UPDATE accounts 
      SET balance = balance + NEW.amount, updated_at = NOW()
      WHERE id = NEW.account_id;
      
    ELSIF NEW.type = 'EXPENSE' THEN
      -- Só debita se EU paguei (payer_id é null ou é meu)
      IF NEW.payer_id IS NULL OR NEW.payer_id = v_user_member_id THEN
        UPDATE accounts 
        SET balance = balance - NEW.amount, updated_at = NOW()
        WHERE id = NEW.account_id;
      END IF;
      
    ELSIF NEW.type = 'TRANSFER' THEN
      -- Debita origem
      UPDATE accounts 
      SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.account_id;
      
      -- Credita destino
      IF NEW.destination_account_id IS NOT NULL THEN
        UPDATE accounts 
        SET balance = balance + NEW.amount, updated_at = NOW()
        WHERE id = NEW.destination_account_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_account_balance_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_user_member_id UUID;
BEGIN
  -- Buscar o family_member_id do usuário
  SELECT id INTO v_user_member_id 
  FROM family_members 
  WHERE user_id = OLD.user_id 
  LIMIT 1;
  
  -- Ignorar transações espelhadas
  IF OLD.source_transaction_id IS NOT NULL THEN
    RETURN OLD;
  END IF;
  
  IF OLD.account_id IS NOT NULL THEN
    IF OLD.type = 'INCOME' THEN
      UPDATE accounts 
      SET balance = balance - OLD.amount, updated_at = NOW()
      WHERE id = OLD.account_id;
      
    ELSIF OLD.type = 'EXPENSE' THEN
      IF OLD.payer_id IS NULL OR OLD.payer_id = v_user_member_id THEN
        UPDATE accounts 
        SET balance = balance + OLD.amount, updated_at = NOW()
        WHERE id = OLD.account_id;
      END IF;
      
    ELSIF OLD.type = 'TRANSFER' THEN
      UPDATE accounts 
      SET balance = balance + OLD.amount, updated_at = NOW()
      WHERE id = OLD.account_id;
      
      IF OLD.destination_account_id IS NOT NULL THEN
        UPDATE accounts 
        SET balance = balance - OLD.amount, updated_at = NOW()
        WHERE id = OLD.destination_account_id;
      END IF;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar triggers
DROP TRIGGER IF EXISTS trg_update_balance_insert ON transactions;
CREATE TRIGGER trg_update_balance_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_insert();

DROP TRIGGER IF EXISTS trg_update_balance_delete ON transactions;
CREATE TRIGGER trg_update_balance_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_delete();

-- =====================================================
-- 7. REMOVER TRANSAÇÕES ESPELHADAS ÓRFÃS
-- =====================================================
-- Transações espelhadas cujo source_transaction_id não existe mais
DELETE FROM transactions 
WHERE source_transaction_id IS NOT NULL 
AND source_transaction_id NOT IN (SELECT id FROM transactions WHERE source_transaction_id IS NULL);

-- =====================================================
-- 8. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_transactions_competence_date ON transactions(competence_date);
CREATE INDEX IF NOT EXISTS idx_transactions_source_transaction_id ON transactions(source_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_settled ON transaction_splits(transaction_id, is_settled);

-- =====================================================
-- 9. RECALCULAR SALDOS NOVAMENTE APÓS CORREÇÕES
-- =====================================================
SELECT * FROM recalculate_all_account_balances();

-- Notificar PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
