-- Fix: Calcular competence_date correto para cartões de crédito
-- Para cartões: competence_date = mês de vencimento da fatura
-- Para outros: competence_date = mês da transação

CREATE OR REPLACE FUNCTION public.set_credit_card_competence_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_type TEXT;
  v_closing_day INTEGER;
  v_due_day INTEGER;
  v_transaction_date DATE;
  v_transaction_day INTEGER;
  v_competence_date DATE;
BEGIN
  -- Se já tem competence_date definido manualmente, não sobrescrever
  IF TG_OP = 'UPDATE' AND OLD.competence_date IS DISTINCT FROM NEW.competence_date THEN
    RETURN NEW;
  END IF;

  -- Buscar tipo da conta
  SELECT type, closing_day, due_day INTO v_account_type, v_closing_day, v_due_day
  FROM accounts
  WHERE id = NEW.account_id;

  -- Se não é cartão de crédito, usar mês da transação
  IF v_account_type IS NULL OR v_account_type != 'CREDIT_CARD' THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
    RETURN NEW;
  END IF;

  -- É cartão de crédito: calcular mês de vencimento
  v_transaction_date := NEW.date::date;
  v_transaction_day := EXTRACT(DAY FROM v_transaction_date);
  v_closing_day := COALESCE(v_closing_day, 1);
  v_due_day := COALESCE(v_due_day, 10);

  -- Lógica:
  -- Se transação foi DEPOIS do fechamento, vai para a próxima fatura (vence em 2 meses)
  -- Se transação foi ANTES/NO fechamento, vai para a fatura atual (vence no próximo mês)
  
  IF v_transaction_day > v_closing_day THEN
    -- Transação depois do fechamento: vence em 2 meses
    v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '2 months')::date;
  ELSE
    -- Transação antes/no fechamento: vence no próximo mês
    v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
  END IF;

  NEW.competence_date := v_competence_date;
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_set_credit_card_competence_date ON transactions;

CREATE TRIGGER trigger_set_credit_card_competence_date
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_credit_card_competence_date();

COMMENT ON FUNCTION set_credit_card_competence_date IS 
'Calcula competence_date correto: para cartões usa mês de vencimento, para outros usa mês da transação';

-- Atualizar transações existentes de cartão de crédito
UPDATE transactions t
SET competence_date = (
  CASE 
    WHEN EXTRACT(DAY FROM t.date::date) > COALESCE(a.closing_day, 1) THEN
      (DATE_TRUNC('month', t.date::date) + INTERVAL '2 months')::date
    ELSE
      (DATE_TRUNC('month', t.date::date) + INTERVAL '1 month')::date
  END
)
FROM accounts a
WHERE t.account_id = a.id
  AND a.type = 'CREDIT_CARD'
  AND t.type = 'EXPENSE';;
