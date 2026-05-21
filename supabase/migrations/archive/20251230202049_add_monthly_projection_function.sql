-- =====================================================
-- FUNÇÃO: Projeção Completa do Fim do Mês
-- =====================================================
-- Calcula a projeção real do saldo no fim do mês considerando:
-- 1. Saldo atual das contas
-- 2. Receitas futuras do mês (competence_date futura)
-- 3. Despesas futuras do mês (competence_date futura)
-- 4. Faturas de cartão de crédito pendentes
-- 5. Dívidas com compartilhados (saldo negativo com membros)
-- =====================================================

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
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_current_balance NUMERIC := 0;
  v_future_income NUMERIC := 0;
  v_future_expenses NUMERIC := 0;
  v_credit_invoices NUMERIC := 0;
  v_shared_debts NUMERIC := 0;
  v_projected NUMERIC := 0;
BEGIN
  -- =====================================================
  -- 1. SALDO ATUAL
  -- =====================================================
  -- Soma de todas as contas ativas (exceto cartões e internacionais)
  SELECT COALESCE(SUM(balance), 0) INTO v_current_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type != 'CREDIT_CARD'
    AND (is_international = false OR is_international IS NULL);

  -- =====================================================
  -- 2. RECEITAS FUTURAS DO MÊS
  -- =====================================================
  -- Transações de INCOME com competence_date futura no mês
  SELECT COALESCE(SUM(amount), 0) INTO v_future_income
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'INCOME'
    AND competence_date > CURRENT_DATE
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- =====================================================
  -- 3. DESPESAS FUTURAS DO MÊS
  -- =====================================================
  -- Transações de EXPENSE com competence_date futura no mês
  SELECT COALESCE(SUM(amount), 0) INTO v_future_expenses
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'EXPENSE'
    AND competence_date > CURRENT_DATE
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- =====================================================
  -- 4. FATURAS DE CARTÃO PENDENTES
  -- =====================================================
  -- Saldo negativo dos cartões = fatura a pagar
  SELECT COALESCE(SUM(ABS(balance)), 0) INTO v_credit_invoices
  FROM public.accounts
  WHERE user_id = p_user_id
    AND type = 'CREDIT_CARD'
    AND is_active = true
    AND balance < 0;

  -- =====================================================
  -- 5. COMPARTILHADOS A PAGAR
  -- =====================================================
  -- Saldo negativo com membros da família = você deve para eles
  SELECT COALESCE(SUM(ABS(net_balance)), 0) INTO v_shared_debts
  FROM (
    SELECT (public.calculate_member_balance(p_user_id, fm.id)).net_balance
    FROM public.family_members fm
    JOIN public.families f ON f.id = fm.family_id
    WHERE (f.owner_id = p_user_id OR fm.user_id = p_user_id OR fm.linked_user_id = p_user_id)
  ) AS balances
  WHERE net_balance < 0;

  -- =====================================================
  -- CÁLCULO FINAL DA PROJEÇÃO
  -- =====================================================
  v_projected := v_current_balance 
               + v_future_income 
               - v_future_expenses 
               - v_credit_invoices 
               - v_shared_debts;

  RETURN QUERY SELECT 
    v_current_balance,
    v_future_income,
    v_future_expenses,
    v_credit_invoices,
    v_shared_debts,
    v_projected;
END;
$$;

-- =====================================================
-- COMENTÁRIO E PERMISSÕES
-- =====================================================
COMMENT ON FUNCTION public.get_monthly_projection IS 
'Calcula projeção completa do saldo no fim do mês considerando: saldo atual, receitas/despesas futuras, faturas de cartão e compartilhados a pagar';

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_monthly_projection TO authenticated;;
