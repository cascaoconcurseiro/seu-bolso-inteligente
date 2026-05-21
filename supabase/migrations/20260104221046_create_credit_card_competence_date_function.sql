-- Criar função para calcular competence_date correta para cartões de crédito
CREATE OR REPLACE FUNCTION public.calculate_credit_card_competence_date(
  p_transaction_date DATE,
  p_closing_day INTEGER,
  p_due_day INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_closing_day INTEGER;
  v_due_day INTEGER;
  v_competence_date DATE;
BEGIN
  v_closing_day := COALESCE(p_closing_day, 1);
  v_due_day := COALESCE(p_due_day, 10);

  IF EXTRACT(DAY FROM p_transaction_date) <= v_closing_day THEN
    IF v_due_day > v_closing_day THEN
      v_competence_date := DATE_TRUNC('month', p_transaction_date)::DATE;
    ELSE
      v_competence_date := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month')::DATE;
    END IF;
  ELSE
    IF v_due_day > v_closing_day THEN
      v_competence_date := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month')::DATE;
    ELSE
      v_competence_date := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '2 months')::DATE;
    END IF;
  END IF;

  RETURN v_competence_date;
END;
$$;

COMMENT ON FUNCTION public.calculate_credit_card_competence_date IS 'Calcula a data de competência correta para transações de cartão de crédito baseado no closing_day e due_day';

GRANT EXECUTE ON FUNCTION public.calculate_credit_card_competence_date TO authenticated;;
