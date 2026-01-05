-- =====================================================
-- MIGRATION: Revert competence_date to closing month
-- Data: 2026-01-04
-- Descrição: competence_date deve ser mês de FECHAMENTO para faturas
-- =====================================================

-- competence_date = mês de FECHAMENTO da fatura (para exibir na fatura correta)
-- Para Compartilhados, calcular dinamicamente o mês de vencimento no frontend

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
  v_closing_month DATE;
BEGIN
  v_closing_day := COALESCE(p_closing_day, 1);

  -- competence_date = mês em que a fatura FECHA
  -- Se a transação foi feita ATÉ o closing_day, entra na fatura que fecha NESTE mês
  -- Se a transação foi feita DEPOIS do closing_day, entra na fatura que fecha NO PRÓXIMO mês
  
  IF EXTRACT(DAY FROM p_transaction_date) <= v_closing_day THEN
    -- Entra na fatura que fecha neste mês
    v_closing_month := DATE_TRUNC('month', p_transaction_date)::DATE;
  ELSE
    -- Entra na fatura que fecha no próximo mês
    v_closing_month := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month')::DATE;
  END IF;

  RETURN v_closing_month;
END;
$$;

COMMENT ON FUNCTION public.calculate_credit_card_competence_date IS 
  'Calcula a data de competência (mês de FECHAMENTO da fatura) para transações de cartão de crédito';

-- Recalcular competence_date de todas as transações de cartão
WITH transactions_to_fix AS (
  SELECT 
    t.id,
    calculate_credit_card_competence_date(t.date::DATE, a.closing_day, a.due_day) as correct_competence_date
  FROM transactions t
  JOIN accounts a ON t.account_id = a.id
  WHERE a.type = 'CREDIT_CARD'
    AND t.source_transaction_id IS NULL
)
UPDATE transactions t
SET competence_date = ttf.correct_competence_date
FROM transactions_to_fix ttf
WHERE t.id = ttf.id;

-- Sincronizar transações espelho
UPDATE transactions mirror
SET competence_date = original.competence_date
FROM transactions original
WHERE mirror.source_transaction_id = original.id
  AND mirror.source_transaction_id IS NOT NULL;
