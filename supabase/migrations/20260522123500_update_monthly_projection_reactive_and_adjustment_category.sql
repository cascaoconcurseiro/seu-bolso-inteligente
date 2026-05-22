-- Migração: Tornar a projeção mensal 100% reativa e injetar a subcategoria "Ajuste de Saldo"
-- Criado em: 2026-05-22

DROP FUNCTION IF EXISTS public.get_monthly_projection(UUID, DATE);

CREATE OR REPLACE FUNCTION public.get_monthly_projection(
  p_user_id UUID,
  p_end_date DATE
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
  -- Definir os limites do mês selecionado
  v_start_of_month := date_trunc('month', p_end_date)::date;
  v_end_of_month := (date_trunc('month', p_end_date) + interval '1 month - 1 day')::date;

  -- =====================================================
  -- 1. SALDO ATUAL (BRL Apenas, excluindo cartões e fundo de emergência)
  -- =====================================================
  SELECT COALESCE(SUM(balance), 0) INTO v_current_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
    AND (is_international = false OR is_international IS NULL)
    AND (currency = 'BRL' OR currency IS NULL);

  -- Se o mês selecionado for passado (ou seja, o fim do mês selecionado é menor que o início do mês atual)
  -- Reconstituir o saldo histórico regredindo as transações ocorridas após p_end_date
  IF p_end_date < date_trunc('month', v_today)::date THEN
    -- Subtrair receitas lançadas após p_end_date que alteraram o saldo
    SELECT v_current_balance - COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.type = 'INCOME'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (a.is_international = false OR a.is_international IS NULL)
      AND (a.currency = 'BRL' OR a.currency IS NULL);

    -- Somar despesas lançadas após p_end_date que alteraram o saldo
    SELECT v_current_balance + COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a ON a.id = t.account_id
    WHERE t.user_id = p_user_id
      AND t.type = 'EXPENSE'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (a.is_international = false OR a.is_international IS NULL)
      AND (a.currency = 'BRL' OR a.currency IS NULL);

    -- Tratar transferências para fora das contas consideradas (origem considerada, destino não considerada) -> Somar de volta
    SELECT v_current_balance + COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a_src ON a_src.id = t.account_id
    INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
    WHERE t.user_id = p_user_id
      AND t.type = 'TRANSFER'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a_src.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (a_src.is_international = false OR a_src.is_international IS NULL)
      AND (a_src.currency = 'BRL' OR a_src.currency IS NULL)
      AND (
        a_dst.type IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        OR a_dst.is_international = true
        OR a_dst.currency != 'BRL'
      );

    -- Tratar transferências para dentro das contas consideradas (origem não considerada, destino considerada) -> Subtrair
    SELECT v_current_balance - COALESCE(SUM(t.amount), 0) INTO v_current_balance
    FROM public.transactions t
    INNER JOIN public.accounts a_src ON a_src.id = t.account_id
    INNER JOIN public.accounts a_dst ON a_dst.id = t.destination_account_id
    WHERE t.user_id = p_user_id
      AND t.type = 'TRANSFER'
      AND COALESCE(t.competence_date, t.date) > p_end_date
      AND a_dst.type NOT IN ('CREDIT_CARD', 'EMERGENCY_FUND')
      AND (a_dst.is_international = false OR a_dst.is_international IS NULL)
      AND (a_dst.currency = 'BRL' OR a_dst.currency IS NULL)
      AND (
        a_src.type IN ('CREDIT_CARD', 'EMERGENCY_FUND')
        OR a_src.is_international = true
        OR a_src.currency != 'BRL'
      );
  END IF;

  -- =====================================================
  -- 2. RECEITAS FUTURAS DO MÊS
  -- =====================================================
  SELECT COALESCE(SUM(t.amount), 0) INTO v_future_income
  FROM public.transactions t
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id
    AND t.type = 'INCOME'
    AND (t.currency = 'BRL' OR t.currency IS NULL)
    AND t.source_transaction_id IS NULL
    AND (a.type IS NULL OR a.type != 'CREDIT_CARD')
    AND (
      -- Se for mês atual: apenas o que está após hoje
      (v_start_of_month <= v_today AND v_end_of_month >= v_today AND t.competence_date > v_today AND t.competence_date <= p_end_date)
      OR
      -- Se for mês futuro: tudo do mês
      (v_start_of_month > v_today AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month)
    );

  -- =====================================================
  -- 3. DESPESAS FUTURAS DO MÊS
  -- =====================================================
  SELECT COALESCE(SUM(t.amount), 0) INTO v_future_expenses
  FROM public.transactions t
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE t.user_id = p_user_id
    AND t.type = 'EXPENSE'
    AND (t.currency = 'BRL' OR t.currency IS NULL)
    AND t.source_transaction_id IS NULL
    AND (a.type IS NULL OR a.type != 'CREDIT_CARD')
    AND (
      -- Se for mês atual: apenas o que está após hoje
      (v_start_of_month <= v_today AND v_end_of_month >= v_today AND t.competence_date > v_today AND t.competence_date <= p_end_date)
      OR
      -- Se for mês futuro: tudo do mês
      (v_start_of_month > v_today AND t.competence_date >= v_start_of_month AND t.competence_date <= v_end_of_month)
    );

  -- =====================================================
  -- 4. FATURAS DE CARTÃO PENDENTES (BRL Apenas)
  -- =====================================================
  -- Somar todas as transações lançadas naquele cartão de crédito (compras - pagamentos - estornos) do mês
  -- Se o saldo for devedor (> 0), computa-se. Se for credor/zerado, assume-se 0.
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
    AND (a.is_international = false OR a.is_international IS NULL)
    AND (a.currency = 'BRL' OR a.currency IS NULL);

  -- =====================================================
  -- 5. COMPARTILHADOS (Apenas BRL)
  -- =====================================================
  -- Compartilhados a RECEBER (créditos)
  SELECT COALESCE(SUM(ts.amount), 0) INTO v_shared_credits
  FROM public.transaction_splits ts
  INNER JOIN public.transactions t ON t.id = ts.transaction_id
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE t.creator_user_id = p_user_id
    AND ts.user_id != p_user_id
    AND ts.settled_by_creditor = false
    AND ts.is_settled = false
    AND (t.currency = 'BRL' OR t.currency IS NULL)
    AND t.trip_id IS NULL
    AND (
      (a.type = 'CREDIT_CARD' AND 
       (t.competence_date + interval '1 month')::date >= v_start_of_month AND
       (t.competence_date + interval '1 month')::date <= v_end_of_month)
      OR
      ((a.type != 'CREDIT_CARD' OR a.type IS NULL) AND
       t.competence_date >= v_start_of_month AND
       t.competence_date <= v_end_of_month)
    );

  -- Compartilhados a PAGAR (débitos)
  SELECT COALESCE(SUM(ts.amount), 0) INTO v_shared_debts
  FROM public.transaction_splits ts
  INNER JOIN public.transactions t ON t.id = ts.transaction_id
  LEFT JOIN public.accounts a ON a.id = t.account_id
  WHERE ts.user_id = p_user_id
    AND t.creator_user_id != p_user_id
    AND ts.settled_by_debtor = false
    AND ts.is_settled = false
    AND (t.currency = 'BRL' OR t.currency IS NULL)
    AND t.trip_id IS NULL
    AND (
      (a.type = 'CREDIT_CARD' AND 
       (t.competence_date + interval '1 month')::date >= v_start_of_month AND
       (t.competence_date + interval '1 month')::date <= v_end_of_month)
      OR
      ((a.type != 'CREDIT_CARD' OR a.type IS NULL) AND
       t.competence_date >= v_start_of_month AND
       t.competence_date <= v_end_of_month)
    );

  -- Saldo líquido de compartilhados
  v_shared_net := v_shared_debts - v_shared_credits;

  -- =====================================================
  -- CÁLCULO FINAL DA PROJEÇÃO
  -- =====================================================
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

COMMENT ON FUNCTION public.get_monthly_projection IS 
  'Calcula a projeção financeira em BRL reativa baseada no mês selecionado por p_end_date';

GRANT EXECUTE ON FUNCTION public.get_monthly_projection TO authenticated;

-- =====================================================
-- INJEÇÃO DA CATEGORIA DE AJUSTE DE SALDO
-- =====================================================
DO $$
DECLARE
  v_user RECORD;
  v_parent_financeiro_id UUID;
  v_parent_sistema_id UUID;
  v_cat_expense_id UUID;
  v_cat_income_id UUID;
BEGIN
  -- Iterar por todos os usuários do sistema
  FOR v_user IN SELECT DISTINCT id FROM public.profiles LOOP
    
    -- 1. Inserir categoria de ajuste em Despesas (Financeiro)
    SELECT id INTO v_parent_financeiro_id
    FROM public.categories
    WHERE user_id = v_user.id
      AND name = 'Financeiro'
      AND type = 'expense'
      AND parent_category_id IS NULL
    LIMIT 1;

    IF v_parent_financeiro_id IS NOT NULL THEN
      -- Verificar se já existe a subcategoria Ajuste de Saldo
      SELECT id INTO v_cat_expense_id
      FROM public.categories
      WHERE user_id = v_user.id
        AND name = 'Ajuste de Saldo'
        AND type = 'expense'
        AND parent_category_id = v_parent_financeiro_id
      LIMIT 1;

      IF v_cat_expense_id IS NULL THEN
        INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
        VALUES (v_user.id, 'Ajuste de Saldo', '⚖️', 'expense', v_parent_financeiro_id)
        RETURNING id INTO v_cat_expense_id;
      END IF;
    END IF;

    -- 2. Inserir categoria de ajuste em Receitas (Sistema)
    SELECT id INTO v_parent_sistema_id
    FROM public.categories
    WHERE user_id = v_user.id
      AND name = 'Sistema'
      AND type = 'income'
      AND parent_category_id IS NULL
    LIMIT 1;

    IF v_parent_sistema_id IS NOT NULL THEN
      -- Verificar se já existe a subcategoria Ajuste de Saldo
      SELECT id INTO v_cat_income_id
      FROM public.categories
      WHERE user_id = v_user.id
        AND name = 'Ajuste de Saldo'
        AND type = 'income'
        AND parent_category_id = v_parent_sistema_id
      LIMIT 1;

      IF v_cat_income_id IS NULL THEN
        INSERT INTO public.categories (user_id, name, icon, type, parent_category_id)
        VALUES (v_user.id, 'Ajuste de Saldo', '⚖️', 'income', v_parent_sistema_id)
        RETURNING id INTO v_cat_income_id;
      END IF;
    END IF;

    -- 3. Atualizar transações de ajuste antigas do usuário
    -- Despesas de ajuste
    IF v_cat_expense_id IS NOT NULL THEN
      UPDATE public.transactions
      SET category_id = v_cat_expense_id
      WHERE user_id = v_user.id
        AND type = 'EXPENSE'
        AND description LIKE 'Ajuste de saldo - %'
        AND category_id IS NULL;
    END IF;

    -- Receitas de ajuste
    IF v_cat_income_id IS NOT NULL THEN
      UPDATE public.transactions
      SET category_id = v_cat_income_id
      WHERE user_id = v_user.id
        AND type = 'INCOME'
        AND description LIKE 'Ajuste de saldo - %'
        AND category_id IS NULL;
    END IF;

  END LOOP;
END;
$$;
