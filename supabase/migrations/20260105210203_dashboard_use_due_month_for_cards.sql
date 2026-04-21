-- Fix: Dashboard deve considerar despesas de cartão no mês de VENCIMENTO
-- Problema: Despesas de Janeiro (competence_date = 01/2026) aparecem em Janeiro,
--           mas deveriam aparecer em Fevereiro (mês de vencimento)
-- 
-- IMPORTANTE: Isso afeta APENAS o Dashboard. Outras páginas não são afetadas:
-- - Página Transações: usa `date` (data real)
-- - Página Cartões: usa `competence_date` (mês de fechamento)
-- - Página Compartilhados: calcula vencimento no frontend

DROP FUNCTION IF EXISTS public.get_monthly_financial_summary(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_balance NUMERIC,
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_savings NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Saldo total (excluindo cartões de crédito e reserva de emergência)
    COALESCE((
      SELECT SUM(balance)
      FROM public.accounts
      WHERE user_id = p_user_id
        AND is_active = true
        AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        AND (is_international = false OR is_international IS NULL)
    ), 0) AS total_balance,
    
    -- Total de receitas no período (APENAS até hoje)
    -- Receitas NÃO são de cartão, então usa competence_date normalmente
    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE user_id = p_user_id
        AND type = 'INCOME'
        AND competence_date >= p_start_date
        AND competence_date <= p_end_date
        AND date <= CURRENT_DATE
        AND (currency = 'BRL' OR currency IS NULL)
        AND source_transaction_id IS NULL
    ), 0) AS total_income,
    
    -- Total de despesas no período (APENAS até hoje)
    -- Para CARTÕES: calcular mês de VENCIMENTO a partir do competence_date
    -- Para OUTROS: usar competence_date normalmente
    COALESCE((
      SELECT SUM(t.amount)
      FROM public.transactions t
      LEFT JOIN public.accounts a ON t.account_id = a.id
      WHERE t.user_id = p_user_id
        AND t.type = 'EXPENSE'
        AND t.date <= CURRENT_DATE
        AND (t.currency = 'BRL' OR t.currency IS NULL)
        AND t.source_transaction_id IS NULL
        -- Filtro por mês: depende se é cartão ou não
        AND (
          -- Se NÃO é cartão: usar competence_date normalmente
          (a.type IS NULL OR a.type != 'CREDIT_CARD') 
          AND t.competence_date >= p_start_date
          AND t.competence_date <= p_end_date
          
          OR
          
          -- Se É cartão: calcular mês de VENCIMENTO
          (a.type = 'CREDIT_CARD')
          AND (
            -- Se due_day <= closing_day: vencimento = competence_date + 1 mês
            CASE 
              WHEN COALESCE(a.due_day, 10) <= COALESCE(a.closing_day, 1) THEN
                (DATE_TRUNC('month', t.competence_date) + INTERVAL '1 month')::date
              -- Se due_day > closing_day: vencimento = competence_date (mesmo mês)
              ELSE
                t.competence_date
            END
          ) >= p_start_date
          AND (
            CASE 
              WHEN COALESCE(a.due_day, 10) <= COALESCE(a.closing_day, 1) THEN
                (DATE_TRUNC('month', t.competence_date) + INTERVAL '1 month')::date
              ELSE
                t.competence_date
            END
          ) <= p_end_date
        )
    ), 0) AS total_expenses,
    
    -- Economia líquida (receitas - despesas)
    -- Mesma lógica: receitas usam competence_date, despesas de cartão usam mês de vencimento
    COALESCE((
      SELECT SUM(
        CASE 
          WHEN t.type = 'INCOME' THEN t.amount
          ELSE -t.amount
        END
      )
      FROM public.transactions t
      LEFT JOIN public.accounts a ON t.account_id = a.id
      WHERE t.user_id = p_user_id
        AND t.type IN ('INCOME', 'EXPENSE')
        AND t.date <= CURRENT_DATE
        AND (t.currency = 'BRL' OR t.currency IS NULL)
        AND t.source_transaction_id IS NULL
        AND (
          -- INCOME: sempre usa competence_date
          (t.type = 'INCOME' 
           AND t.competence_date >= p_start_date
           AND t.competence_date <= p_end_date)
          
          OR
          
          -- EXPENSE não-cartão: usa competence_date
          (t.type = 'EXPENSE' 
           AND (a.type IS NULL OR a.type != 'CREDIT_CARD')
           AND t.competence_date >= p_start_date
           AND t.competence_date <= p_end_date)
          
          OR
          
          -- EXPENSE cartão: usa mês de vencimento
          (t.type = 'EXPENSE'
           AND a.type = 'CREDIT_CARD'
           AND (
             CASE 
               WHEN COALESCE(a.due_day, 10) <= COALESCE(a.closing_day, 1) THEN
                 (DATE_TRUNC('month', t.competence_date) + INTERVAL '1 month')::date
               ELSE
                 t.competence_date
             END
           ) >= p_start_date
           AND (
             CASE 
               WHEN COALESCE(a.due_day, 10) <= COALESCE(a.closing_day, 1) THEN
                 (DATE_TRUNC('month', t.competence_date) + INTERVAL '1 month')::date
               ELSE
                 t.competence_date
             END
           ) <= p_end_date)
        )
    ), 0) AS net_savings;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary TO authenticated;

COMMENT ON FUNCTION public.get_monthly_financial_summary IS 
'Calcula resumo financeiro mensal. Para cartões de crédito, considera despesas no mês de VENCIMENTO (não de fechamento).';;
