-- Migração: Correção do cálculo de compartilhados na Projeção Mensal
-- Criado em: 2026-05-26

CREATE OR REPLACE FUNCTION public.get_monthly_projection(
  p_user_id UUID,
  p_end_date DATE,
  p_currency VARCHAR DEFAULT 'BRL'
)
RETURNS TABLE (
  current_balance NUMERIC,
  future_income NUMERIC,
  future_expenses NUMERIC,
  credit_card_invoices NUMERIC,
  shared_debts NUMERIC,
  projected_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC := 0;
  v_future_income NUMERIC := 0;
  v_future_expenses NUMERIC := 0;
  v_credit_invoices NUMERIC := 0;
  v_shared_debts NUMERIC := 0;
  v_shared_credits NUMERIC := 0;
  v_shared_net NUMERIC := 0;
  v_projected NUMERIC := 0;
  v_start_of_month DATE;
  v_end_of_month DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  v_start_of_month := date_trunc('month', p_end_date)::date;
  v_end_of_month := (date_trunc('month', p_end_date) + interval '1 month - 1 day')::date;

  -- 1. SALDO ATUAL
  SELECT COALESCE(SUM(balance), 0) INTO v_current_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
    AND (
      (p_currency = 'BRL' AND (currency = 'BRL' OR currency IS NULL))
      OR
      (p_currency != 'BRL' AND currency = p_currency)
    );

  IF p_end_date < date_trunc('month', v_today)::date THEN
    -- Subtrair receitas lançadas após p_end_date
    SELECT v_current_balance - COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.type = 'INCOME'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (
        (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
        OR
        (p_currency != 'BRL' AND a.currency = p_currency)
      );

    -- Somar despesas lançadas após p_end_date
    SELECT v_current_balance + COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.type = 'EXPENSE'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (
        (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
        OR
        (p_currency != 'BRL' AND a.currency = p_currency)
      );

    -- Transferências
    SELECT v_current_balance + COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a_src ON a_src.id = t.account_id
    INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
    WHERE t.user_id = p_user_id
      AND t.type = 'TRANSFER'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a_src.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (
        (p_currency = 'BRL' AND (a_src.currency = 'BRL' OR a_src.currency IS NULL))
        OR
        (p_currency != 'BRL' AND a_src.currency = p_currency)
      )
      AND (
        a_dst.type IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        OR (p_currency = 'BRL' AND a_dst.currency != 'BRL' AND a_dst.currency IS NOT NULL)
        OR (p_currency != 'BRL' AND (a_dst.currency != p_currency OR a_dst.currency IS NULL))
      );

    SELECT v_current_balance - COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a_src ON a_src.id = t.account_id
    INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
    WHERE t.user_id = p_user_id
      AND t.type = 'TRANSFER'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a_dst.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (
        (p_currency = 'BRL' AND (a_dst.currency = 'BRL' OR a_dst.currency IS NULL))
        OR
        (p_currency != 'BRL' AND a_dst.currency = p_currency)
      )
      AND (
        a_src.type IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        OR (p_currency = 'BRL' AND a_src.currency != 'BRL' AND a_src.currency IS NOT NULL)
        OR (p_currency != 'BRL' AND (a_src.currency != p_currency OR a_src.currency IS NULL))
      );
  END IF;

  -- 2. RECEITAS FUTURAS
  SELECT COALESCE(SUM(t.amount), 0) INTO v_future_income
  FROM public.transactions t
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id
    AND t.type = 'INCOME'
    AND (
      (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
      OR
      (p_currency != 'BRL' AND t.currency = p_currency)
    )
    AND t.source_transaction_id IS NULL
    AND (a.type IS NULL OR a.type != 'CREDIT_CARD')
    AND (
      (v_start_of_month <= v_today AND v_end_of_month >= v_today 
       AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month 
       AND t.date > v_today)
      OR
      (v_start_of_month > v_today AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month)
    );

  -- 3. DESPESAS FUTURAS
  SELECT COALESCE(SUM(t.amount), 0) INTO v_future_expenses
  FROM public.transactions t
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id
    AND t.type = 'EXPENSE'
    AND (
      (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
      OR
      (p_currency != 'BRL' AND t.currency = p_currency)
    )
    AND t.source_transaction_id IS NULL
    AND (a.type IS NULL OR a.type != 'CREDIT_CARD')
    AND (
      (v_start_of_month <= v_today AND v_end_of_month >= v_today 
       AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month 
       AND t.date > v_today)
      OR
      (v_start_of_month > v_today AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month)
    );

  -- 4. FATURAS DE CARTÃO
  SELECT COALESCE(SUM(
    GREATEST(
      (
        SELECT COALESCE(SUM(
          CASE 
            WHEN t.type = 'EXPENSE' THEN t.amount
            WHEN t.type = 'INCOME' THEN -t.amount
            WHEN t.type = 'TRANSFER' AND t.destination_account_id = a.id THEN -t.amount
            WHEN t.type = 'TRANSFER' AND t.account_id = a.id THEN t.amount
            ELSE 0
          END
        ), 0)
        FROM public.transactions t
        WHERE (t.account_id = a.id OR t.destination_account_id = a.id)
          AND t.competence_date >= v_start_of_month
          AND t.competence_date <= v_end_of_month
      ), 0
    )
  ), 0) INTO v_credit_invoices
  FROM public.accounts a
  WHERE a.user_id = p_user_id
    AND a.type = 'CREDIT_CARD'
    AND a.is_active = true
    AND (
      (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
      OR
      (p_currency != 'BRL' AND a.currency = p_currency)
    );

  -- 5. COMPARTILHADOS (Atualizado para englobar todas as formas de compartilhamento e dívidas passadas)
  WITH my_members AS (
      SELECT id FROM public.family_members WHERE linked_user_id = p_user_id
  ),
  credits_split AS (
      SELECT 
          SUM(CASE WHEN t.type = 'INCOME' THEN -ts.amount ELSE ts.amount END) AS amount
      FROM public.transactions t
      JOIN public.transaction_splits ts ON t.id = ts.transaction_id
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE 
          (t.user_id = p_user_id AND t.payer_id IS NULL OR t.payer_id IN (SELECT id FROM my_members))
          AND ts.member_id NOT IN (SELECT id FROM my_members)
          AND ts.is_settled = false
          AND ts.settled_by_creditor = false
          AND (t.type = 'EXPENSE' OR t.type = 'INCOME')
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  ),
  credits_related AS (
      SELECT 
          SUM(t.amount) AS amount
      FROM public.transactions t
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE 
          t.user_id = p_user_id
          AND t.is_shared = false
          AND t.domain = 'SHARED'
          AND t.related_member_id IS NOT NULL
          AND t.is_settled = false
          AND t.type = 'EXPENSE'
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  ),
  debits_split AS (
      SELECT 
          SUM(ts.amount) AS amount
      FROM public.transactions t
      JOIN public.transaction_splits ts ON t.id = ts.transaction_id
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE 
          (t.user_id != p_user_id OR (t.user_id = p_user_id AND t.payer_id IS NOT NULL AND t.payer_id NOT IN (SELECT id FROM my_members)))
          AND ts.member_id IN (SELECT id FROM my_members)
          AND ts.is_settled = false
          AND ts.settled_by_debtor = false
          AND t.type = 'EXPENSE'
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  ),
  debits_direct AS (
      SELECT 
          SUM(CASE WHEN t.type = 'INCOME' THEN -t.amount ELSE t.amount END) AS amount
      FROM public.transactions t
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE 
          t.user_id = p_user_id 
          AND t.payer_id IS NOT NULL 
          AND t.payer_id NOT IN (SELECT id FROM my_members)
          AND t.source_transaction_id IS NULL
          AND t.is_settled = false
          AND (t.type = 'EXPENSE' OR t.type = 'INCOME')
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  ),
  debits_related AS (
      SELECT 
          SUM(t.amount) AS amount
      FROM public.transactions t
      LEFT JOIN public.accounts a ON a.id = t.account_id
      WHERE 
          t.user_id != p_user_id
          AND t.is_shared = false
          AND t.domain = 'SHARED'
          AND t.related_member_id IN (SELECT id FROM my_members)
          AND t.is_settled = false
          AND t.type = 'EXPENSE'
          AND t.trip_id IS NULL
          AND (
              (p_currency = 'BRL' AND (t.currency = 'BRL' OR t.currency IS NULL))
              OR (p_currency != 'BRL' AND t.currency = p_currency)
          )
          AND t.competence_date <= v_end_of_month
  )
  SELECT 
      COALESCE((SELECT SUM(amount) FROM credits_split), 0) + COALESCE((SELECT SUM(amount) FROM credits_related), 0),
      COALESCE((SELECT SUM(amount) FROM debits_split), 0) + COALESCE((SELECT SUM(amount) FROM debits_direct), 0) + COALESCE((SELECT SUM(amount) FROM debits_related), 0)
  INTO v_shared_credits, v_shared_debts;

  v_shared_net := v_shared_debts - v_shared_credits;

  v_projected := v_current_balance + v_future_income - v_future_expenses - v_credit_invoices - v_shared_net;

  RETURN QUERY SELECT 
    v_current_balance, 
    v_future_income, 
    v_future_expenses, 
    v_credit_invoices, 
    v_shared_net, 
    v_projected;
END;
$$;
