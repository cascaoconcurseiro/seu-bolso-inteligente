-- =========================================================================
-- MIGRATION: Fix recalculate_account_balance payer_id condition (B-15, B-29)
-- Data: 2026-06-28
-- Branch: fix/29-bugs-report
--
-- B-15: LIMIT 1 arbitrário em subquery de family_members
-- B-29: payer_id = NULL exclui transações de usuários sem família
-- Fix: usar = ANY(ARRAY(...)) em vez de subquery escalar com LIMIT 1
-- =========================================================================

CREATE OR REPLACE FUNCTION recalculate_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
BEGIN
  -- Buscar saldo inicial
  SELECT COALESCE(initial_balance, 0) INTO v_initial_balance
  FROM accounts WHERE id = p_account_id;

  -- Calcular saldo baseado APENAS em transações até HOJE
  -- [B-15/B-29] payer_id = ANY(...) em vez de subquery escalar com LIMIT 1
  SELECT v_initial_balance + COALESCE(SUM(
    CASE
      WHEN type = 'INCOME' THEN amount
      WHEN type = 'EXPENSE' THEN -amount
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN amount
      ELSE 0
    END
  ), 0) INTO v_calculated_balance
  FROM transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND (
      payer_id IS NULL
      OR payer_id = ANY(
        ARRAY(SELECT id FROM family_members WHERE user_id = transactions.user_id)
      )
    )
    AND date <= CURRENT_DATE;

  -- Atualizar saldo da conta
  UPDATE accounts SET balance = v_calculated_balance, updated_at = NOW()
  WHERE id = p_account_id;

  RETURN v_calculated_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
