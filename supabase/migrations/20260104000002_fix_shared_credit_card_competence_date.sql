-- Corrigir competence_date de transações compartilhadas de cartão de crédito
-- Problema: Transação de janeiro com vencimento em fevereiro aparece em janeiro
-- Solução: Atualizar competence_date para o mês do vencimento (due_day)

-- Esta migration corrige transações existentes e adiciona lógica para futuras transações

DO $$
DECLARE
  v_transaction RECORD;
  v_account RECORD;
  v_new_competence_date DATE;
  v_transaction_date DATE;
  v_closing_day INTEGER;
  v_due_day INTEGER;
  v_updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando correção de competence_date para transações compartilhadas de cartão...';

  -- Buscar todas as transações compartilhadas em cartões de crédito
  FOR v_transaction IN
    SELECT t.id, t.date, t.competence_date, t.account_id, t.description
    FROM transactions t
    INNER JOIN accounts a ON a.id = t.account_id
    WHERE a.type = 'CREDIT_CARD'
      AND t.is_shared = true
      AND t.competence_date IS NOT NULL
  LOOP
    -- Buscar dados do cartão
    SELECT closing_day, due_day INTO v_account
    FROM accounts
    WHERE id = v_transaction.account_id;

    v_closing_day := COALESCE(v_account.closing_day, 1);
    v_due_day := COALESCE(v_account.due_day, 10);
    v_transaction_date := v_transaction.date::DATE;

    -- Calcular o mês correto da competência baseado no vencimento
    -- Lógica:
    -- 1. Se a transação foi feita ANTES do closing_day do mês, ela entra na fatura que fecha neste mês
    -- 2. Se a transação foi feita DEPOIS do closing_day, ela entra na fatura do próximo mês
    -- 3. A competence_date deve ser o mês em que a fatura VENCE (não fecha)
    
    IF EXTRACT(DAY FROM v_transaction_date) <= v_closing_day THEN
      -- Transação entra na fatura que fecha neste mês
      -- Se due_day > closing_day: vence no mesmo mês
      -- Se due_day <= closing_day: vence no próximo mês
      IF v_due_day > v_closing_day THEN
        -- Vence no mesmo mês da transação
        v_new_competence_date := DATE_TRUNC('month', v_transaction_date)::DATE;
      ELSE
        -- Vence no próximo mês
        v_new_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::DATE;
      END IF;
    ELSE
      -- Transação entra na fatura do próximo mês
      -- Se due_day > closing_day: vence no próximo mês
      -- Se due_day <= closing_day: vence em 2 meses
      IF v_due_day > v_closing_day THEN
        -- Vence no próximo mês
        v_new_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::DATE;
      ELSE
        -- Vence em 2 meses
        v_new_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '2 months')::DATE;
      END IF;
    END IF;

    -- Atualizar apenas se a competence_date mudou
    IF v_new_competence_date != v_transaction.competence_date THEN
      UPDATE transactions
      SET competence_date = v_new_competence_date
      WHERE id = v_transaction.id;

      v_updated_count := v_updated_count + 1;
      
      RAISE NOTICE 'Atualizado: % - % -> % (closing: %, due: %)', 
        v_transaction.description,
        v_transaction.competence_date,
        v_new_competence_date,
        v_closing_day,
        v_due_day;
    END IF;
  END LOOP;

  RAISE NOTICE 'Correção concluída! % transações atualizadas.', v_updated_count;
END $$;

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

  -- Lógica de cálculo da competência
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

COMMENT ON FUNCTION public.calculate_credit_card_competence_date IS 
'Calcula a data de competência correta para transações de cartão de crédito baseado no closing_day e due_day';

GRANT EXECUTE ON FUNCTION public.calculate_credit_card_competence_date TO authenticated;
