-- Fix: Corrigir cálculo de competence_date para cartões de crédito
-- REGRA CORRETA:
-- - Se transação ANTES/NO dia de fechamento: competence_date = mês da transação
-- - Se transação DEPOIS do fechamento: competence_date = próximo mês

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
BEGIN
  -- Se já tem competence_date definido manualmente, não sobrescrever
  IF TG_OP = 'UPDATE' AND OLD.competence_date IS DISTINCT FROM NEW.competence_date THEN
    RETURN NEW;
  END IF;

  -- Buscar tipo da conta
  SELECT type, closing_day INTO v_account_type, v_closing_day
  FROM accounts
  WHERE id = NEW.account_id;

  -- Se não é cartão de crédito, usar mês da transação
  IF v_account_type IS NULL OR v_account_type != 'CREDIT_CARD' THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
    RETURN NEW;
  END IF;

  -- É cartão de crédito: calcular mês de FECHAMENTO da fatura
  v_transaction_date := NEW.date::date;
  v_transaction_day := EXTRACT(DAY FROM v_transaction_date);
  v_closing_day := COALESCE(v_closing_day, 1);

  -- LÓGICA CORRETA:
  -- Se transação foi DEPOIS do fechamento, vai para a PRÓXIMA fatura (próximo mês)
  -- Se transação foi ANTES/NO fechamento, vai para a fatura ATUAL (mesmo mês)
  
  IF v_transaction_day > v_closing_day THEN
    -- Transação depois do fechamento: próxima fatura (próximo mês)
    v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
  ELSE
    -- Transação antes/no fechamento: fatura atual (mesmo mês)
    v_competence_date := DATE_TRUNC('month', v_transaction_date)::date;
  END IF;

  NEW.competence_date := v_competence_date;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_credit_card_competence_date IS 
'Calcula competence_date correto: mês de FECHAMENTO da fatura (não de vencimento)';

-- Atualizar transações existentes de cartão de crédito
UPDATE transactions t
SET competence_date = (
  CASE 
    WHEN EXTRACT(DAY FROM t.date::date) > COALESCE(a.closing_day, 1) THEN
      -- Depois do fechamento: próximo mês
      (DATE_TRUNC('month', t.date::date) + INTERVAL '1 month')::date
    ELSE
      -- Antes/no fechamento: mesmo mês
      DATE_TRUNC('month', t.date::date)::date
  END
)
FROM accounts a
WHERE t.account_id = a.id
  AND a.type = 'CREDIT_CARD'
  AND t.type = 'EXPENSE';
