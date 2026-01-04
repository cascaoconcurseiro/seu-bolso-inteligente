-- Corrigir competence_date de transações compartilhadas
-- Para transações compartilhadas de cartão, usar mês do VENCIMENTO
-- Para transações do cartão (não compartilhadas), usar mês do FECHAMENTO

-- Criar função para calcular competence_date de transações compartilhadas
CREATE OR REPLACE FUNCTION public.calculate_shared_transaction_competence_date(
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

  -- Para transações compartilhadas, usar o mês do VENCIMENTO
  -- Porque é quando o usuário vai efetivamente PAGAR
  
  IF EXTRACT(DAY FROM p_transaction_date) <= v_closing_day THEN
    -- Entra na fatura que fecha neste mês
    IF v_due_day > v_closing_day THEN
      -- Vence no mesmo mês
      v_competence_date := DATE_TRUNC('month', p_transaction_date)::DATE;
    ELSE
      -- Vence no próximo mês
      v_competence_date := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month')::DATE;
    END IF;
  ELSE
    -- Entra na fatura que fecha no próximo mês
    IF v_due_day > v_closing_day THEN
      -- Vence no próximo mês
      v_competence_date := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month')::DATE;
    ELSE
      -- Vence em 2 meses
      v_competence_date := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '2 months')::DATE;
    END IF;
  END IF;

  RETURN v_competence_date;
END;
$$;

COMMENT ON FUNCTION public.calculate_shared_transaction_competence_date IS 
'Calcula a data de competência (mês de vencimento) para transações compartilhadas de cartão de crédito';

-- Atualizar transações compartilhadas existentes
DO $$
DECLARE
  v_transaction RECORD;
  v_account RECORD;
  v_new_competence_date DATE;
  v_updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Corrigindo competence_date de transações compartilhadas...';

  -- Buscar transações compartilhadas que têm splits (são as compartilhadas de verdade)
  FOR v_transaction IN
    SELECT DISTINCT t.id, t.date, t.competence_date, t.account_id, t.description
    FROM transactions t
    INNER JOIN transaction_splits ts ON ts.transaction_id = t.id
    INNER JOIN accounts a ON a.id = t.account_id
    WHERE a.type = 'CREDIT_CARD'
      AND t.is_shared = true
      AND t.competence_date IS NOT NULL
  LOOP
    SELECT closing_day, due_day INTO v_account
    FROM accounts
    WHERE id = v_transaction.account_id;

    v_new_competence_date := calculate_shared_transaction_competence_date(
      v_transaction.date::DATE,
      v_account.closing_day,
      v_account.due_day
    );

    IF v_new_competence_date != v_transaction.competence_date THEN
      UPDATE transactions
      SET competence_date = v_new_competence_date
      WHERE id = v_transaction.id;

      v_updated_count := v_updated_count + 1;
      
      RAISE NOTICE 'Atualizado: % - % -> %', 
        v_transaction.description,
        v_transaction.competence_date,
        v_new_competence_date;
    END IF;
  END LOOP;

  RAISE NOTICE 'Correção concluída! % transações compartilhadas atualizadas.', v_updated_count;
END $$;
