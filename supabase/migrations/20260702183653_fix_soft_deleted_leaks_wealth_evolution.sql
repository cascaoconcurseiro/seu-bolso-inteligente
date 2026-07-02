-- FIX: get_wealth_evolution incluía transações soft-deletadas nos cálculos
-- regressivos de saldo histórico (SECURITY DEFINER bypassa RLS).
CREATE OR REPLACE FUNCTION public.get_wealth_evolution(p_user_id uuid, p_months integer DEFAULT 6, p_currency character varying DEFAULT 'BRL'::character varying)
 RETURNS TABLE(month_label text, balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_balance NUMERIC := 0;
  v_month_start DATE;
  v_month_end DATE;
  v_today DATE := CURRENT_DATE;
  v_i INT;
  v_temp_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(a.balance), 0) INTO v_current_balance
  FROM public.accounts a
  WHERE a.user_id = p_user_id
    AND a.is_active = true
    AND a.deleted_at IS NULL
    AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
    AND (
      (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
      OR
      (p_currency != 'BRL' AND a.currency = p_currency)
    );

  FOR v_i IN REVERSE (p_months - 1)..0 LOOP
    v_month_end := (date_trunc('month', v_today - (v_i || ' month')::interval) + interval '1 month - 1 day')::date;
    v_month_start := date_trunc('month', v_month_end)::date;

    v_temp_balance := v_current_balance;

    IF v_month_end < v_today THEN
      v_temp_balance := v_temp_balance - COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a ON a.id = t.account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'INCOME'
           AND t.deleted_at IS NULL
           AND COALESCE(t.competence_date, t.date) > v_month_end
           AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
           AND (
             (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
             OR
             (p_currency != 'BRL' AND a.currency = p_currency)
           )
        ), 0
      );

      v_temp_balance := v_temp_balance + COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a ON a.id = t.account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'EXPENSE'
           AND t.deleted_at IS NULL
           AND COALESCE(t.competence_date, t.date) > v_month_end
           AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
           AND (
             (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
             OR
             (p_currency != 'BRL' AND a.currency = p_currency)
           )
        ), 0
      );

      v_temp_balance := v_temp_balance + COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a_src ON a_src.id = t.account_id
         INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'TRANSFER'
           AND t.deleted_at IS NULL
           AND COALESCE(t.competence_date, t.date) > v_month_end
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
           )
        ), 0
      );

      v_temp_balance := v_temp_balance - COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a_src ON a_src.id = t.account_id
         INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'TRANSFER'
           AND t.deleted_at IS NULL
           AND COALESCE(t.competence_date, t.date) > v_month_end
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
           )
        ), 0
      );
    END IF;

    month_label := CASE to_char(v_month_end, 'MM')
      WHEN '01' THEN 'Jan'
      WHEN '02' THEN 'Fev'
      WHEN '03' THEN 'Mar'
      WHEN '04' THEN 'Abr'
      WHEN '05' THEN 'Mai'
      WHEN '06' THEN 'Jun'
      WHEN '07' THEN 'Jul'
      WHEN '08' THEN 'Ago'
      WHEN '09' THEN 'Set'
      WHEN '10' THEN 'Out'
      WHEN '11' THEN 'Nov'
      WHEN '12' THEN 'Dez'
    END || '/' || to_char(v_month_end, 'YY');

    balance := v_temp_balance;
    RETURN NEXT;
  END LOOP;
END;
$function$;
