-- Fix: Corrigir cálculo de competence_date para cartões de crédito
-- REGRA CORRETA:
-- - Se transação ANTES do dia de fechamento: competence_date = mês da transação
-- - Se transação NO ou DEPOIS do fechamento: competence_date = próximo mês
-- - Se for parcela (is_installment = true): respeitar a competence_date já calculada pelo app

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
  -- 1. Se for uma parcela, não recalculamos automaticamente, pois o app envia
  -- as parcelas com meses futuros específicos.
  IF NEW.is_installment = true AND NEW.competence_date IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar tipo da conta
  SELECT type, closing_day INTO v_account_type, v_closing_day
  FROM accounts
  WHERE id = NEW.account_id;

  -- 2. Se não é cartão de crédito
  IF v_account_type IS NULL OR v_account_type != 'CREDIT_CARD' THEN
    -- Apenas define o mês se não tiver sido enviado pelo app (ou for update de data)
    IF TG_OP = 'INSERT' AND NEW.competence_date IS NULL THEN
      NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
    ELSIF TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
      NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
    END IF;
    RETURN NEW;
  END IF;

  -- 3. É cartão de crédito: calcular mês de FECHAMENTO da fatura
  v_transaction_date := NEW.date::date;
  v_transaction_day := EXTRACT(DAY FROM v_transaction_date);
  v_closing_day := COALESCE(v_closing_day, 1);

  -- LÓGICA CORRETA:
  -- Se transação foi NO DIA ou DEPOIS do fechamento (>=), vai para a PRÓXIMA fatura
  IF v_transaction_day >= v_closing_day THEN
    v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
  ELSE
    v_competence_date := DATE_TRUNC('month', v_transaction_date)::date;
  END IF;

  -- Se for UPDATE e não for parcela, forçamos o cálculo baseado na nova data (caso ela tenha mudado)
  -- Mas se o app enviou uma competência manual diferente da que calculamos, e diferente da original?
  -- Vamos confiar na lógica acima que padroniza.
  
  NEW.competence_date := v_competence_date;
  RETURN NEW;
END;
$$;
