-- =====================================================
-- MIGRATION: Implementar Acerto Parcial
-- Data: 2026-01-01
-- Descrição: Permite pagamentos parciais de dívidas
-- =====================================================

-- 1. FUNÇÃO: ACERTO PARCIAL
-- =====================================================

CREATE OR REPLACE FUNCTION public.settle_partial_balance(
  p_user1_id UUID,
  p_user2_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'BRL',
  p_settlement_transaction_id UUID DEFAULT NULL
)
RETURNS TABLE (
  splits_settled INTEGER,
  amount_settled NUMERIC,
  remaining_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_splits_settled INTEGER := 0;
  v_amount_settled NUMERIC := 0;
  v_remaining_amount NUMERIC := p_amount;
  v_split RECORD;
  v_amount_to_settle NUMERIC;
BEGIN
  -- Buscar splits não acertados, ordenados por data (mais antigos primeiro)
  FOR v_split IN
    SELECT 
      ts.id,
      ts.amount,
      t.currency,
      t.date
    FROM transaction_splits ts
    JOIN transactions t ON t.id = ts.transaction_id
    WHERE ts.user_id = p_user1_id
      AND t.user_id = p_user2_id
      AND ts.is_settled = FALSE
      AND t.currency = p_currency
      AND t.deleted_at IS NULL
    ORDER BY t.date ASC
  LOOP
    -- Se ainda há valor para acertar
    IF v_remaining_amount > 0 THEN
      -- Determinar quanto acertar deste split
      v_amount_to_settle := LEAST(v_split.amount, v_remaining_amount);
      
      -- Se acerta o split completo
      IF v_amount_to_settle >= v_split.amount THEN
        UPDATE transaction_splits
        SET 
          is_settled = TRUE,
          settled_by_debtor = TRUE,
          settled_by_creditor = TRUE,
          settled_at = NOW(),
          settled_transaction_id = p_settlement_transaction_id,
          debtor_settlement_tx_id = p_settlement_transaction_id,
          creditor_settlement_tx_id = p_settlement_transaction_id
        WHERE id = v_split.id;
        
        v_splits_settled := v_splits_settled + 1;
        v_amount_settled := v_amount_settled + v_split.amount;
        v_remaining_amount := v_remaining_amount - v_split.amount;
      ELSE
        -- Acerto parcial: criar novo split com valor restante
        -- e marcar split original como acertado com valor parcial
        
        -- Atualizar split original com valor acertado
        UPDATE transaction_splits
        SET amount = v_amount_to_settle
        WHERE id = v_split.id;
        
        -- Marcar como acertado
        UPDATE transaction_splits
        SET 
          is_settled = TRUE,
          settled_by_debtor = TRUE,
          settled_by_creditor = TRUE,
          settled_at = NOW(),
          settled_transaction_id = p_settlement_transaction_id
        WHERE id = v_split.id;
        
        -- Criar novo split com valor restante
        INSERT INTO transaction_splits (
          transaction_id,
          user_id,
          member_id,
          name,
          amount,
          percentage,
          is_settled
        )
        SELECT 
          transaction_id,
          user_id,
          member_id,
          name,
          v_split.amount - v_amount_to_settle,
          percentage,
          FALSE
        FROM transaction_splits
        WHERE id = v_split.id;
        
        v_splits_settled := v_splits_settled + 1;
        v_amount_settled := v_amount_settled + v_amount_to_settle;
        v_remaining_amount := 0;
      END IF;
    END IF;
  END LOOP;
  
  -- Calcular saldo restante
  SELECT 
    COALESCE(SUM(ts.amount), 0)
  INTO remaining_balance
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.user_id = p_user1_id
    AND t.user_id = p_user2_id
    AND ts.is_settled = FALSE
    AND t.currency = p_currency
    AND t.deleted_at IS NULL;
  
  splits_settled := v_splits_settled;
  amount_settled := v_amount_settled;
  
  RETURN NEXT;
END;
$;

-- 2. FUNÇÃO: OBTER SPLITS PENDENTES
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_pending_splits_for_settlement(
  p_debtor_user_id UUID,
  p_creditor_user_id UUID,
  p_currency TEXT DEFAULT 'BRL'
)
RETURNS TABLE (
  split_id UUID,
  transaction_id UUID,
  description TEXT,
  date DATE,
  amount NUMERIC,
  currency TEXT,
  days_overdue INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  RETURN QUERY
  SELECT 
    ts.id AS split_id,
    t.id AS transaction_id,
    t.description,
    t.date,
    ts.amount,
    t.currency,
    EXTRACT(DAY FROM NOW() - t.date)::INTEGER AS days_overdue
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.user_id = p_debtor_user_id
    AND t.user_id = p_creditor_user_id
    AND ts.is_settled = FALSE
    AND t.currency = p_currency
    AND t.deleted_at IS NULL
  ORDER BY t.date ASC;
END;
$;

-- 3. FUNÇÃO: SUGERIR PLANO DE PAGAMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION public.suggest_payment_plan(
  p_debtor_user_id UUID,
  p_creditor_user_id UUID,
  p_monthly_payment NUMERIC,
  p_currency TEXT DEFAULT 'BRL'
)
RETURNS TABLE (
  month INTEGER,
  payment_amount NUMERIC,
  splits_to_settle INTEGER,
  remaining_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_total_debt NUMERIC;
  v_remaining NUMERIC;
  v_month INTEGER := 1;
  v_payment NUMERIC;
  v_splits INTEGER;
BEGIN
  -- Calcular dívida total
  SELECT COALESCE(SUM(ts.amount), 0)
  INTO v_total_debt
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.user_id = p_debtor_user_id
    AND t.user_id = p_creditor_user_id
    AND ts.is_settled = FALSE
    AND t.currency = p_currency
    AND t.deleted_at IS NULL;
  
  v_remaining := v_total_debt;
  
  -- Gerar plano de pagamento
  WHILE v_remaining > 0 LOOP
    v_payment := LEAST(p_monthly_payment, v_remaining);
    
    -- Contar quantos splits seriam acertados
    SELECT COUNT(*)
    INTO v_splits
    FROM (
      SELECT 
        ts.amount,
        SUM(ts.amount) OVER (ORDER BY t.date) AS cumulative
      FROM transaction_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      WHERE ts.user_id = p_debtor_user_id
        AND t.user_id = p_creditor_user_id
        AND ts.is_settled = FALSE
        AND t.currency = p_currency
        AND t.deleted_at IS NULL
    ) sub
    WHERE cumulative <= (v_total_debt - v_remaining + v_payment);
    
    month := v_month;
    payment_amount := v_payment;
    splits_to_settle := v_splits;
    remaining_balance := v_remaining - v_payment;
    
    RETURN NEXT;
    
    v_remaining := v_remaining - v_payment;
    v_month := v_month + 1;
    
    -- Limite de segurança
    IF v_month > 120 THEN
      EXIT;
    END IF;
  END LOOP;
END;
$;

-- 4. COMENTÁRIOS
-- =====================================================

COMMENT ON FUNCTION settle_partial_balance IS 
  'Acerta parcialmente dívidas entre dois usuários. Acerta splits mais antigos primeiro.';

COMMENT ON FUNCTION get_pending_splits_for_settlement IS 
  'Retorna lista de splits pendentes ordenados por data para facilitar acerto.';

COMMENT ON FUNCTION suggest_payment_plan IS 
  'Sugere plano de pagamento mensal baseado em valor fixo.';

