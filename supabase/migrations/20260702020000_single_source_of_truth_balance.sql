-- ============================================================================
-- MIGRATION: Single Source of Truth — Balance Engine
-- ============================================================================
-- 1. Create get_account_balance_at_date() — read-only balance at any point in time
-- 2. Unify INSERT/DELETE triggers to call recalculate_account_balance()
--    instead of doing incremental math (eliminates drift risk)
-- 3. The ONLY function that modifies accounts.balance is recalculate_account_balance()
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Read-only balance function (same logic as recalculate, no UPDATE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_account_balance_at_date(
  p_account_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(initial_balance, 0) INTO v_initial_balance
  FROM public.accounts WHERE id = p_account_id;

  SELECT v_initial_balance + COALESCE(SUM(
    CASE
      WHEN type = 'INCOME' THEN amount
      WHEN type = 'EXPENSE' THEN -amount
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN amount
      ELSE 0
    END
  ), 0) INTO v_balance
  FROM public.transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND (
      payer_id IS NULL
      OR payer_id = ANY(
        ARRAY(SELECT id FROM public.family_members WHERE user_id = public.transactions.user_id)
      )
    )
    AND date <= p_date
    AND deleted_at IS NULL;

  RETURN v_balance;
END;
$$;

-- ============================================================================
-- PHASE 2: Unify INSERT trigger → call recalculate instead of manual math
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_account_balance_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Recalculate source account balance
  IF NEW.account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(NEW.account_id);
  END IF;

  -- Recalculate destination account balance (for transfers)
  IF NEW.destination_account_id IS NOT NULL AND NEW.destination_account_id != NEW.account_id THEN
    PERFORM public.recalculate_account_balance(NEW.destination_account_id);
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- PHASE 3: Unify DELETE trigger → call recalculate instead of manual math
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_account_balance_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Recalculate source account balance
  IF OLD.account_id IS NOT NULL THEN
    PERFORM public.recalculate_account_balance(OLD.account_id);
  END IF;

  -- Recalculate destination account balance (for transfers)
  IF OLD.destination_account_id IS NOT NULL AND OLD.destination_account_id != OLD.account_id THEN
    PERFORM public.recalculate_account_balance(OLD.destination_account_id);
  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================================
-- PHASE 4: Recalculate all balances one final time with unified logic
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.accounts LOOP
    PERFORM public.recalculate_account_balance(r.id);
  END LOOP;
END;
$$;

COMMIT;
