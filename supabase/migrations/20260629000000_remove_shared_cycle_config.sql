-- Remove shared cycle configuration — shared expenses now follow credit card cycle
BEGIN;

-- 1. Drop constraints
ALTER TABLE public.families DROP CONSTRAINT IF EXISTS valid_shared_closing_day;
ALTER TABLE public.families DROP CONSTRAINT IF EXISTS valid_shared_due_day;

-- 2. Drop columns
ALTER TABLE public.families DROP COLUMN IF EXISTS shared_closing_day;
ALTER TABLE public.families DROP COLUMN IF EXISTS shared_due_day;

-- 3. Shared expenses always follow credit card cycle — update default + existing rows
ALTER TABLE public.profiles ALTER COLUMN shared_expenses_behavior SET DEFAULT 'CYCLE';
UPDATE public.profiles SET shared_expenses_behavior = 'CYCLE' WHERE shared_expenses_behavior IS DISTINCT FROM 'CYCLE';

-- 4. Update set_credit_card_competence_date RPC — remove shared cycle logic,
--    shared non-credit-card transactions now use month-based competence_date
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
  -- Se for uma parcela de cartão com data já definida, não recalcula
  IF NEW.is_installment = true AND NEW.competence_date IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar tipo e fechamento da conta atual
  SELECT type, closing_day INTO v_account_type, v_closing_day
  FROM accounts
  WHERE id = NEW.account_id;

  -- Regra do Cartão de Crédito
  IF v_account_type = 'CREDIT_CARD' THEN
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
  END IF;

  -- Comportamento padrão para contas normais e compartilhadas
  IF TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
  ELSIF TG_OP = 'INSERT' AND NEW.competence_date IS NULL THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Update post-split trigger — remove shared cycle logic
CREATE OR REPLACE FUNCTION public.update_shared_competence_after_split()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  -- Pegar a transação raiz e seu tipo de conta
  SELECT t.*, a.type as account_type INTO v_transaction
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.id = NEW.transaction_id;

  -- Apenas cartão de crédito tem ciclo especial; o resto usa mês calendário
  -- que já é o padrão, então nada a fazer para não-cartão
  RETURN NEW;
END;
$$;

COMMIT;
