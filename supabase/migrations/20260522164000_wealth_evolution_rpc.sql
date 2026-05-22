-- Migração: RPC para cálculo da Evolução Patrimonial histórica dos últimos N meses
-- Criado em: 2026-05-22

DROP FUNCTION IF EXISTS public.get_wealth_evolution(UUID, INT, VARCHAR);

CREATE OR REPLACE FUNCTION public.get_wealth_evolution(
  p_user_id UUID,
  p_months INT DEFAULT 6,
  p_currency VARCHAR DEFAULT 'BRL'
)
RETURNS TABLE (
  month_label TEXT,
  balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC := 0;
  v_month_start DATE;
  v_month_end DATE;
  v_today DATE := CURRENT_DATE;
  v_i INT;
  v_temp_balance NUMERIC;
BEGIN
  -- 1. Obter o saldo atual de patrimônio consolidado do usuário para a moeda correspondente (excluindo cartões de crédito e fundo de emergência)
  SELECT COALESCE(SUM(a.balance), 0) INTO v_current_balance
  FROM public.accounts a
  WHERE a.user_id = p_user_id
    AND a.is_active = true
    AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
    AND (
      (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
      OR
      (p_currency != 'BRL' AND a.currency = p_currency)
    );

  -- 2. Loop regressivo de trás para a frente para os últimos N meses
  FOR v_i IN REVERSE (p_months - 1)..0 LOOP
    -- Limites do mês correspondente no loop
    v_month_end := (date_trunc('month', v_today - (v_i || ' month')::interval) + interval '1 month - 1 day')::date;
    v_month_start := date_trunc('month', v_month_end)::date;

    v_temp_balance := v_current_balance;

    -- Se o fim do mês do loop for anterior ao dia de hoje, regredir todas as transações posteriores para recalcular o saldo histórico
    IF v_month_end < v_today THEN
      -- Subtrair receitas lançadas após v_month_end que inflaram o saldo
      v_temp_balance := v_temp_balance - COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a ON a.id = t.account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'INCOME'
           AND COALESCE(t.competence_date, t.date) > v_month_end
           AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
           AND (
             (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
             OR
             (p_currency != 'BRL' AND a.currency = p_currency)
           )
        ), 0
      );

      -- Somar despesas lançadas após v_month_end que reduziram o saldo
      v_temp_balance := v_temp_balance + COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a ON a.id = t.account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'EXPENSE'
           AND COALESCE(t.competence_date, t.date) > v_month_end
           AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
           AND (
             (p_currency = 'BRL' AND (a.currency = 'BRL' OR a.currency IS NULL))
             OR
             (p_currency != 'BRL' AND a.currency = p_currency)
           )
        ), 0
      );

      -- Tratar transferências para fora das contas consideradas (origem considerada, destino não considerada) -> Somar de volta
      v_temp_balance := v_temp_balance + COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a_src ON a_src.id = t.account_id
         INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'TRANSFER'
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

      -- Tratar transferências para dentro das contas consideradas (origem não considerada, destino considerada) -> Subtrair
      v_temp_balance := v_temp_balance - COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         INNER JOIN public.accounts a_src ON a_src.id = t.account_id
         INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
         WHERE t.user_id = p_user_id
           AND t.type = 'TRANSFER'
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

    -- Label amigável do mês traduzido para o Português
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
$$;

COMMENT ON FUNCTION public.get_wealth_evolution IS 
  'Calcula regressivamente a série temporal de evolução patrimonial do usuário nos últimos N meses para uma moeda específica';

GRANT EXECUTE ON FUNCTION public.get_wealth_evolution TO authenticated;
