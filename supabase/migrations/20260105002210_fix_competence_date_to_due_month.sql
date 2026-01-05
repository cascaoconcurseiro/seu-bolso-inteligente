-- =====================================================
-- MIGRATION: Fix competence_date to use due month
-- Data: 2026-01-04
-- Descrição: Alterar calculate_credit_card_competence_date para retornar mês de VENCIMENTO
-- =====================================================

-- O problema: A função estava retornando o mês de FECHAMENTO da fatura,
-- mas para o compartilhado precisamos do mês de VENCIMENTO.

-- Exemplo:
-- Transação: 04/01/2026
-- Closing day: 26
-- Due day: 2
-- Fatura fecha: 26/01/2026
-- Fatura vence: 02/02/2026
-- competence_date deve ser: 2026-02-01 (mês de vencimento)

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
  v_closing_month DATE;
  v_due_month DATE;
BEGIN
  v_closing_day := COALESCE(p_closing_day, 1);
  v_due_day := COALESCE(p_due_day, 10);

  -- Determinar em qual mês a fatura FECHA
  IF EXTRACT(DAY FROM p_transaction_date) <= v_closing_day THEN
    -- Entra na fatura que fecha neste mês
    v_closing_month := DATE_TRUNC('month', p_transaction_date)::DATE;
  ELSE
    -- Entra na fatura que fecha no próximo mês
    v_closing_month := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month')::DATE;
  END IF;

  -- Determinar em qual mês a fatura VENCE
  -- Se due_day <= closing_day, a fatura vence no próximo mês após o fechamento
  -- Se due_day > closing_day, a fatura vence no mesmo mês do fechamento
  IF v_due_day <= v_closing_day THEN
    -- Vence no próximo mês
    v_due_month := (v_closing_month + INTERVAL '1 month')::DATE;
  ELSE
    -- Vence no mesmo mês
    v_due_month := v_closing_month;
  END IF;

  -- Retornar o mês de VENCIMENTO (para exibir no compartilhado)
  RETURN v_due_month;
END;
$$;

COMMENT ON FUNCTION public.calculate_credit_card_competence_date IS 
  'Calcula a data de competência (mês de VENCIMENTO da fatura) para transações de cartão de crédito';;
