CREATE OR REPLACE FUNCTION-- Deep Verification Fixes
-- Applies soft delete filters to RPCs

 public.get_monthly_projection(
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
  WHERE user_id = p_user_id AND deleted_at IS NULL
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
    WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
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
    WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
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
    WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
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
    WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
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
  WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
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
  WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL)
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
        WHERE t.deleted_at IS NULL AND (t.account_id = a.id OR t.destination_account_id = a.id)
          AND t.competence_date >= v_start_of_month
          AND t.competence_date <= v_end_of_month
      ), 0
    )
  ), 0) INTO v_credit_invoices
  FROM public.accounts a
  WHERE a.user_id = p_user_id AND a.deleted_at IS NULL
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
      WHERE t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL) AND 
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
      WHERE t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL) AND 
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
      WHERE t.deleted_at IS NULL AND (a.id IS NULL OR a.deleted_at IS NULL) AND 
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


CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result JSONB;
BEGIN
    -- SECURITY LOCK: IDOR Protection
    IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

    WITH tx AS (
        SELECT type, amount, is_refund, source_transaction_id, COALESCE(currency, 'BRL') as currency, date
        FROM transactions
        WHERE user_id = p_user_id AND deleted_at IS NULL
          AND source_transaction_id IS NULL
          AND type != 'TRANSFER'
          AND date >= p_start_date
          AND date <= p_end_date
    ),
    recent AS (
        SELECT t.id, t.type, t.amount, COALESCE(t.currency, 'BRL') as currency, t.date, t.description,
               t.is_shared, t.payer_id, t.account_id, t.source_transaction_id,
               jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon) AS category,
               jsonb_build_object('id', acc.id, 'name', acc.name, 'currency', COALESCE(acc.currency, 'BRL')) AS account
        FROM transactions t
        LEFT JOIN categories cat ON cat.id = t.category_id
        LEFT JOIN accounts acc ON acc.id = t.account_id
        WHERE t.user_id = p_user_id AND t.deleted_at IS NULL AND (acc.id IS NULL OR acc.deleted_at IS NULL)
          AND t.source_transaction_id IS NULL
          AND t.date >= p_start_date
          AND t.date <= p_end_date
          AND t.date <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT 5
    ),
    totals_by_curr AS (
        SELECT 
            currency,
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND (is_refund IS FALSE OR is_refund IS NULL)), 0) AS income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) - 
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND is_refund IS TRUE), 0) AS expense,
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND date > CURRENT_DATE), 0) AS pending_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND date > CURRENT_DATE), 0) AS pending_expense
        FROM tx
        GROUP BY currency
    ),
    totals_brl AS (
        SELECT 
            COALESCE((SELECT income FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_income,
            COALESCE((SELECT expense FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_expense,
            COALESCE((SELECT pending_income FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_pending_income,
            COALESCE((SELECT pending_expense FROM totals_by_curr WHERE currency = 'BRL'), 0) AS total_pending_expense
    )
    SELECT jsonb_build_object(
        'total_income',    (SELECT total_income FROM totals_brl),
        'total_expense',   (SELECT total_expense FROM totals_brl),
        'pending_income',  (SELECT total_pending_income FROM totals_brl),
        'pending_expense', (SELECT total_pending_expense FROM totals_brl),
        'balance',         (SELECT total_income - total_expense FROM totals_brl),
        'totals_by_currency', COALESCE((SELECT jsonb_agg(jsonb_build_object('currency', currency, 'income', income, 'expense', expense, 'pending_income', pending_income, 'pending_expense', pending_expense, 'balance', income - expense)) FROM totals_by_curr), '[]'::jsonb),
        'recent_transactions', COALESCE((SELECT jsonb_agg(r) FROM recent r), '[]'::jsonb)
    ) INTO v_result;

    RETURN COALESCE(v_result, '{"total_income":0,"total_expense":0,"pending_income":0,"pending_expense":0,"balance":0,"totals_by_currency":[],"recent_transactions":[]}'::jsonb);
END;
$function$;

