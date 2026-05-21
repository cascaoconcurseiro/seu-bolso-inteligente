-- Corrigir lógica de competence_date para usar mês de FECHAMENTO, não vencimento
-- Problema: competence_date estava usando mês do vencimento
-- Solução: competence_date deve ser o mês em que a fatura FECHA

-- Recriar função com lógica correta
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
  v_competence_date DATE;
BEGIN
  v_closing_day := COALESCE(p_closing_day, 1);

  -- Lógica correta:
  -- Se a transação foi feita ATÉ o closing_day, entra na fatura que fecha NESTE mês
  -- Se a transação foi feita DEPOIS do closing_day, entra na fatura que fecha NO PRÓXIMO mês
  -- competence_date = mês em que a fatura FECHA (sempre dia 1 do mês)
  
  IF EXTRACT(DAY FROM p_transaction_date) <= v_closing_day THEN
    -- Entra na fatura que fecha neste mês
    v_competence_date := DATE_TRUNC('month', p_transaction_date)::DATE;
  ELSE
    -- Entra na fatura que fecha no próximo mês
    v_competence_date := (DATE_TRUNC('month', p_transaction_date) + INTERVAL '1 month')::DATE;
  END IF;

  RETURN v_competence_date;
END;
$$;

COMMENT ON FUNCTION public.calculate_credit_card_competence_date IS 
'Calcula a data de competência (mês de fechamento) para transações de cartão de crédito';

-- Atualizar transações existentes com a lógica correta
DO $$
DECLARE
  v_transaction RECORD;
  v_account RECORD;
  v_new_competence_date DATE;
  v_updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Corrigindo competence_date para usar mês de fechamento...';

  FOR v_transaction IN
    SELECT t.id, t.date, t.competence_date, t.account_id, t.description
    FROM transactions t
    INNER JOIN accounts a ON a.id = t.account_id
    WHERE a.type = 'CREDIT_CARD'
      AND t.is_shared = true
      AND t.competence_date IS NOT NULL
  LOOP
    SELECT closing_day, due_day INTO v_account
    FROM accounts
    WHERE id = v_transaction.account_id;

    v_new_competence_date := calculate_credit_card_competence_date(
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

  RAISE NOTICE 'Correção concluída! % transações atualizadas.', v_updated_count;
END $$;
