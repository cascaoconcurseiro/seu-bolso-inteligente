-- ============================================================================
-- Migration: Fix Dashboard Summary Payer Filter + Settlement Balance
-- Purpose:
-- 1. get_dashboard_summary: exclude shared expenses paid by other family members
--    from the user's income/expense totals (payer_id filter in tx_raw).
-- 2. request_settlement (migration 06 introduced manual balance update again):
--    remove the manual balance update so triggers handle it (no double-counting).
-- ============================================================================

BEGIN;

-- 1. Fix get_dashboard_summary to exclude expenses paid by others
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

    WITH tx_raw AS (
        SELECT
            t.type,
            t.amount,
            t.is_refund,
            t.source_transaction_id,
            COALESCE(t.currency, 'BRL') as currency,
            CASE
                WHEN a.type = 'CREDIT_CARD' THEN
                    CASE
                        WHEN COALESCE(a.due_day, 10) <= COALESCE(a.closing_day, 1) THEN
                            (DATE_TRUNC('month', COALESCE(t.competence_date, t.date)) + INTERVAL '1 month')::date
                        ELSE
                            DATE_TRUNC('month', COALESCE(t.competence_date, t.date))::date
                    END
                ELSE
                    COALESCE(t.competence_date, t.date)
            END AS ref_date,
            t.date
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = p_user_id
          AND t.deleted_at IS NULL
          AND t.source_transaction_id IS NULL
          AND t.type != 'TRANSFER'
          -- Exclude expenses paid by other family members (payer_id set means someone else paid)
          AND (
            t.payer_id IS NULL 
            OR t.payer_id = (SELECT fm.id FROM family_members fm WHERE fm.user_id = p_user_id LIMIT 1)
          )
    ),
    tx AS (
        SELECT
            type,
            amount,
            is_refund,
            source_transaction_id,
            currency,
            ref_date,
            date
        FROM tx_raw
        WHERE ref_date >= p_start_date
          AND ref_date <= p_end_date
    ),
    recent AS (
        SELECT t.id, t.type, t.amount, COALESCE(t.currency, 'BRL') as currency, t.date, t.description,
               t.is_shared, t.payer_id, t.account_id, t.source_transaction_id,
               jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon) AS category,
               jsonb_build_object('id', acc.id, 'name', acc.name, 'currency', COALESCE(acc.currency, 'BRL')) AS account
        FROM transactions t
        LEFT JOIN categories cat ON cat.id = t.category_id
        LEFT JOIN accounts acc ON acc.id = t.account_id
        WHERE t.user_id = p_user_id
          AND t.deleted_at IS NULL
          AND t.source_transaction_id IS NULL
          AND t.payer_id IS NULL
          AND (
            CASE
                WHEN acc.type = 'CREDIT_CARD' THEN
                    CASE
                        WHEN COALESCE(acc.due_day, 10) <= COALESCE(acc.closing_day, 1) THEN
                            (DATE_TRUNC('month', COALESCE(t.competence_date, t.date)) + INTERVAL '1 month')::date
                        ELSE
                            DATE_TRUNC('month', COALESCE(t.competence_date, t.date))::date
                    END
                ELSE
                    COALESCE(t.competence_date, t.date)
            END
          ) >= p_start_date
          AND (
            CASE
                WHEN acc.type = 'CREDIT_CARD' THEN
                    CASE
                        WHEN COALESCE(acc.due_day, 10) <= COALESCE(acc.closing_day, 1) THEN
                            (DATE_TRUNC('month', COALESCE(t.competence_date, t.date)) + INTERVAL '1 month')::date
                        ELSE
                            DATE_TRUNC('month', COALESCE(t.competence_date, t.date))::date
                    END
                ELSE
                    COALESCE(t.competence_date, t.date)
            END
          ) <= p_end_date
        ORDER BY t.created_at DESC
        LIMIT 5
    ),
    totals_by_curr AS (
        SELECT
            currency,
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND (is_refund IS FALSE OR is_refund IS NULL)), 0) AS income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) -
            COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME' AND is_refund IS TRUE), 0) AS expense,
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


-- 2. Fix request_settlement (migration 06 re-introduced manual balance update)
-- Remove the manual balance update — triggers handle it automatically
CREATE OR REPLACE FUNCTION request_settlement(
  p_split_ids UUID[],
  p_account_id UUID,
  p_user_id UUID,
  p_is_payment BOOLEAN,
  p_amount NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_total_amount NUMERIC := 0;
  v_tx_id UUID;
  v_processed_count INTEGER := 0;
  v_month_name TEXT;
BEGIN
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  END IF;

  -- Verify all splits and calculate fallback amount if p_amount not provided
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT s.*, t.user_id AS creditor_user_id 
    INTO v_split 
    FROM transaction_splits s
    JOIN transactions t ON s.transaction_id = t.id
    WHERE s.id = v_split_id;

    IF v_split IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
    END IF;
    
    IF v_split.is_settled THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi totalmente liquidado.');
    END IF;
    
    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

  -- Use p_amount if provided, else fallback to sum of splits
  IF p_amount IS NOT NULL THEN
    v_total_amount := p_amount;
  END IF;

  -- Determine month string in Portuguese
  v_month_name := CASE EXTRACT(MONTH FROM CURRENT_DATE)
    WHEN 1 THEN 'Janeiro' WHEN 2 THEN 'Fevereiro' WHEN 3 THEN 'Março'
    WHEN 4 THEN 'Abril' WHEN 5 THEN 'Maio' WHEN 6 THEN 'Junho'
    WHEN 7 THEN 'Julho' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Setembro'
    WHEN 10 THEN 'Outubro' WHEN 11 THEN 'Novembro' WHEN 12 THEN 'Dezembro'
  END;

  -- Create transaction for the initiator
  -- Trigger update_account_balance_on_insert handles balance automatically — no manual update needed
  INSERT INTO transactions (
    user_id, account_id, amount, type, description, date, domain, is_shared, created_at, updated_at
  ) VALUES (
    p_user_id, p_account_id, v_total_amount, 
    CASE WHEN p_is_payment THEN 'EXPENSE'::transaction_type ELSE 'INCOME'::transaction_type END,
    CASE WHEN p_is_payment THEN 'Pagamento de despesa compartilhada - ' ELSE 'Recebimento de despesa compartilhada - ' END || v_month_name || '/' || EXTRACT(YEAR FROM CURRENT_DATE),
    CURRENT_DATE, 'PERSONAL'::transaction_domain, false, NOW(), NOW()
  )
  RETURNING id INTO v_tx_id;

  -- Update splits correctly based on the caller's role in each split
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT s.*, t.user_id AS creditor_user_id 
    INTO v_split 
    FROM transaction_splits s
    JOIN transactions t ON s.transaction_id = t.id
    WHERE s.id = v_split_id;

    IF v_split.user_id = p_user_id THEN
      UPDATE transaction_splits 
      SET settled_by_debtor = true, debtor_settlement_tx_id = v_tx_id 
      WHERE id = v_split_id;
    END IF;

    IF v_split.creditor_user_id = p_user_id THEN
      UPDATE transaction_splits 
      SET settled_by_creditor = true, creditor_settlement_tx_id = v_tx_id 
      WHERE id = v_split_id;
    END IF;

    UPDATE transaction_splits 
    SET 
      is_settled = (settled_by_debtor = true AND settled_by_creditor = true),
      settled_at = CASE WHEN (settled_by_debtor = true AND settled_by_creditor = true) THEN NOW() ELSE settled_at END
    WHERE id = v_split_id;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'processed_count', v_processed_count,
    'total_amount', v_total_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMIT;
