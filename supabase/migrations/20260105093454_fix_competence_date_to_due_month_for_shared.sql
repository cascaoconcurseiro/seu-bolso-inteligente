-- =====================================================
-- MIGRATION: Fix competence_date to use DUE MONTH for shared transactions
-- Data: 2026-01-05
-- Descrição: Para transações compartilhadas de cartão, competence_date deve ser mês de VENCIMENTO
-- =====================================================

-- Função para calcular mês de vencimento (não mês de fechamento)
CREATE OR REPLACE FUNCTION public.calculate_credit_card_due_month(
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
  v_invoice_month DATE;
  v_due_month DATE;
BEGIN
  v_closing_day := COALESCE(p_closing_day, 1);
  v_due_day := COALESCE(p_due_day, 10);

  -- Determinar em qual fatura a transação entra
  IF EXTRACT(DAY FROM p_transaction_date) <= v_closing_day THEN
    -- Entra na fatura que fecha neste mês
    v_invoice_month := DATE_TRUNC('month', p_transaction_date)::DATE;
  ELSE
    -- Entra na fatura que fecha no próximo mês
    v_invoice_month := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month')::DATE;
  END IF;

  -- Calcular mês de vencimento
  IF v_due_day <= v_closing_day THEN
    -- Vencimento é no próximo mês após o fechamento
    v_due_month := (v_invoice_month + INTERVAL '1 month')::DATE;
  ELSE
    -- Vencimento é no mesmo mês do fechamento
    v_due_month := v_invoice_month;
  END IF;

  RETURN v_due_month;
END;
$$;

COMMENT ON FUNCTION public.calculate_credit_card_due_month IS 
  'Calcula o mês de VENCIMENTO da fatura (para exibição em Compartilhados)';

-- Atualizar competence_date de transações compartilhadas de cartão para usar mês de vencimento
WITH shared_credit_card_transactions AS (
  SELECT 
    t.id,
    calculate_credit_card_due_month(t.date::DATE, a.closing_day, a.due_day) as correct_due_month
  FROM transactions t
  JOIN accounts a ON t.account_id = a.id
  WHERE a.type = 'CREDIT_CARD'
    AND t.is_shared = true
    AND t.source_transaction_id IS NULL
)
UPDATE transactions t
SET competence_date = scct.correct_due_month
FROM shared_credit_card_transactions scct
WHERE t.id = scct.id;

-- Sincronizar transações espelho
UPDATE transactions mirror
SET competence_date = original.competence_date
FROM transactions original
WHERE mirror.source_transaction_id = original.id
  AND mirror.source_transaction_id IS NOT NULL
  AND original.is_shared = true;;
