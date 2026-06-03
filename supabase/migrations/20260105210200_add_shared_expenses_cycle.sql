-- Adicionar colunas em profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS shared_expenses_behavior TEXT DEFAULT 'CURRENT_MONTH',
ADD COLUMN IF NOT EXISTS shared_closing_day INTEGER,
ADD COLUMN IF NOT EXISTS shared_due_day INTEGER;

-- Atualizar o trigger de transações (set_credit_card_competence_date)
CREATE OR REPLACE FUNCTION public.set_credit_card_competence_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_type TEXT;
  v_closing_day INTEGER;
  v_transaction_date DATE;
  v_transaction_day INTEGER;
  v_competence_date DATE;
  v_is_shared BOOLEAN;
  v_profile RECORD;
BEGIN
  -- 1. Se for uma parcela, não recalculamos automaticamente
  IF NEW.is_installment = true AND NEW.competence_date IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar tipo da conta
  SELECT type, closing_day INTO v_account_type, v_closing_day
  FROM accounts
  WHERE id = NEW.account_id;

  -- 2. Se não é cartão de crédito
  IF v_account_type IS NULL OR v_account_type != 'CREDIT_CARD' THEN
    -- Check if it is an UPDATE and it has splits (is shared)
    IF TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
      SELECT EXISTS(SELECT 1 FROM transaction_splits WHERE transaction_id = NEW.id) INTO v_is_shared;
      
      IF v_is_shared THEN
        SELECT * INTO v_profile FROM profiles WHERE id = NEW.user_id;
        IF v_profile.shared_expenses_behavior = 'CYCLE' AND v_profile.shared_closing_day IS NOT NULL THEN
          v_transaction_day := EXTRACT(DAY FROM NEW.date::date);
          IF v_transaction_day >= v_profile.shared_closing_day THEN
            NEW.competence_date := (DATE_TRUNC('month', NEW.date::date) + INTERVAL '1 month')::date;
          ELSE
            NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
          END IF;
          RETURN NEW;
        END IF;
      END IF;
      -- Comportamento padrão se não for compartilhado ou não tiver ciclo
      NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
    ELSIF TG_OP = 'INSERT' AND NEW.competence_date IS NULL THEN
      -- No insert, os splits ainda não existem, a data será recalculada pelo trigger em transaction_splits
      NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
    END IF;
    RETURN NEW;
  END IF;

  -- 3. É cartão de crédito: calcular mês de FECHAMENTO da fatura
  v_transaction_date := NEW.date::date;
  v_transaction_day := EXTRACT(DAY FROM v_transaction_date);
  v_closing_day := COALESCE(v_closing_day, 1);

  IF v_transaction_day >= v_closing_day THEN
    v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
  ELSE
    v_competence_date := DATE_TRUNC('month', v_transaction_date)::date;
  END IF;

  NEW.competence_date := v_competence_date;
  RETURN NEW;
END;
$$;

-- Criar trigger para quando um split for inserido (para transações recém-criadas)
CREATE OR REPLACE FUNCTION public.update_shared_competence_after_split()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_profile RECORD;
  v_transaction_day INTEGER;
  v_new_competence DATE;
BEGIN
  -- Pegar transação
  SELECT t.*, a.type as account_type INTO v_transaction
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.id = NEW.transaction_id;

  -- Só aplicar se não for cartão de crédito
  IF v_transaction.account_type != 'CREDIT_CARD' THEN
    SELECT * INTO v_profile FROM profiles WHERE id = v_transaction.user_id;
    
    IF v_profile.shared_expenses_behavior = 'CYCLE' AND v_profile.shared_closing_day IS NOT NULL THEN
      v_transaction_day := EXTRACT(DAY FROM v_transaction.date::date);
      
      IF v_transaction_day >= v_profile.shared_closing_day THEN
        v_new_competence := (DATE_TRUNC('month', v_transaction.date::date) + INTERVAL '1 month')::date;
      ELSE
        v_new_competence := DATE_TRUNC('month', v_transaction.date::date)::date;
      END IF;

      IF v_new_competence != v_transaction.competence_date THEN
        -- Atualizar transação para não engatilhar loop infinito no set_credit_card_competence_date, 
        -- ele vai processar e manter v_new_competence se bater.
        UPDATE transactions SET competence_date = v_new_competence WHERE id = v_transaction.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_shared_competence_after_split ON transaction_splits;
CREATE TRIGGER trigger_update_shared_competence_after_split
AFTER INSERT ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION update_shared_competence_after_split();
