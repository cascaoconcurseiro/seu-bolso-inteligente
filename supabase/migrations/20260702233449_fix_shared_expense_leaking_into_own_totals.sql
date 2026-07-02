-- BUG (reportado pelo usuario): importar parcela compartilhada atribuida a outra
-- pessoa (payer_id = outro family_member) estava sendo contada no total de gasto
-- do PROPRIO usuario no Dashboard e na pagina de Transacoes -- mesmo a transacao
-- nao afetando accounts.balance (account_id fica NULL nesse fluxo), os totais
-- agregados somavam o valor cheio ignorando quem realmente deve pagar.
-- Fix: aplicar o mesmo filtro de payer_id que "atividade recente" ja usava
-- corretamente (so conta se payer_id IS NULL ou payer_id = o proprio usuario).
-- Testado ao vivo: total de julho caiu de R$1.802,79 pra R$0,00 apos o fix
-- (transacao AirBNB corrigida pra payer_id do assignee correto).

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_member_id UUID;
BEGIN
    IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

    SELECT id INTO v_member_id
    FROM public.family_members
    WHERE linked_user_id = p_user_id
    LIMIT 1;

    WITH tx_raw AS (
        SELECT
            t.type,
            t.amount,
            t.is_refund,
            COALESCE(t.currency, 'BRL') as currency,
            COALESCE(t.competence_date, t.date) AS ref_date
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = p_user_id
          AND t.deleted_at IS NULL
          AND t.source_transaction_id IS NULL
          AND t.type != 'TRANSFER'
          AND COALESCE(a.type, 'CHECKING') != 'CREDIT_CARD'
          AND (
            t.payer_id IS NULL
            OR (v_member_id IS NOT NULL AND t.payer_id = v_member_id)
          )
    ),
    tx AS (
        SELECT * FROM tx_raw
        WHERE ref_date >= p_start_date AND ref_date <= p_end_date
    ),
    recent AS (
        SELECT t.id, t.type, t.amount, COALESCE(t.currency, 'BRL') as currency, t.date, t.description,
               t.is_shared, t.payer_id, t.account_id, t.source_transaction_id,
               jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon) AS category,
               jsonb_build_object('id', acc.id, 'name', acc.name, 'currency', COALESCE(acc.currency, 'BRL')) AS account
        FROM transactions t
        LEFT JOIN categories cat ON cat.id = t.category_id
        LEFT JOIN accounts acc ON acc.id = t.account_id
        WHERE t.deleted_at IS NULL
          AND t.source_transaction_id IS NULL
          AND t.status != 'PENDING'
          AND COALESCE(t.competence_date, t.date) >= p_start_date
          AND COALESCE(t.competence_date, t.date) <= p_end_date
          AND t.date <= CURRENT_DATE
          AND (
            (t.user_id = p_user_id AND t.payer_id IS NULL)
            OR (v_member_id IS NOT NULL AND t.payer_id = v_member_id)
          )
        ORDER BY t.created_at DESC
        LIMIT 5
    ),
    totals_by_curr AS (
        SELECT
            currency,
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND (is_refund IS FALSE OR is_refund IS NULL) AND ref_date <= CURRENT_DATE), 0) AS income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND ref_date <= CURRENT_DATE), 0) -
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND is_refund IS TRUE AND ref_date <= CURRENT_DATE), 0) AS expense,
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND ref_date > CURRENT_DATE), 0) AS pending_income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE' AND ref_date > CURRENT_DATE), 0) AS pending_expense
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

CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary(p_user_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(total_balance numeric, total_income numeric, total_expenses numeric, net_savings numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
BEGIN
  SELECT id INTO v_member_id FROM public.family_members WHERE linked_user_id = p_user_id LIMIT 1;

  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(balance)
      FROM public.accounts
      WHERE user_id = p_user_id
        AND is_active = true
        AND deleted_at IS NULL
        AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        AND (is_international = false OR is_international IS NULL)
    ), 0) AS total_balance,

    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type = 'INCOME'
        AND deleted_at IS NULL
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND date <= CURRENT_DATE
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
        AND (payer_id IS NULL OR (v_member_id IS NOT NULL AND payer_id = v_member_id))
    ), 0) AS total_income,

    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type = 'EXPENSE'
        AND deleted_at IS NULL
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND date <= CURRENT_DATE
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
        AND (payer_id IS NULL OR (v_member_id IS NOT NULL AND payer_id = v_member_id))
    ), 0) AS total_expenses,

    COALESCE((
      SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type IN ('INCOME', 'EXPENSE')
        AND deleted_at IS NULL
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND date <= CURRENT_DATE
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
        AND (payer_id IS NULL OR (v_member_id IS NOT NULL AND payer_id = v_member_id))
    ), 0) AS net_savings;
END;
$function$;
