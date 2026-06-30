-- ============================================================================
-- MIGRATION: Fix critical production issues found in full system audit
-- Date: 2026-06-30
-- Issues fixed:
--   1. Create financial_ledger table (missing, breaks shared transactions)
--   2. Fix recurring transaction trigger (stack depth guard)
--   3. Add SYSTEM type to notifications constraint
--   4. Create missing wrapper RPCs for frontend compatibility
-- ============================================================================

-- ─── 1. CREATE financial_ledger TABLE ────────────────────────────────────────
-- This table is referenced by create_ledger_entries_for_transaction trigger
-- which fires on INSERT of shared transactions (domain=SHARED, is_shared=true)

CREATE TABLE IF NOT EXISTS financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_transaction ON financial_ledger(transaction_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_user ON financial_ledger(user_id);

-- Enable RLS
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own ledger entries
CREATE POLICY ledger_select_own ON financial_ledger
  FOR SELECT USING (user_id = auth.uid());

-- RLS: Trigger bypass (SECURITY DEFINER functions insert into this)
CREATE POLICY ledger_insert_trigger ON financial_ledger
  FOR INSERT WITH CHECK (true);

-- ─── 2. FIX RECURRING TRANSACTION TRIGGER ────────────────────────────────────
-- Add stack depth guard to prevent infinite recursion when creating
-- recurring transaction copies

CREATE OR REPLACE FUNCTION fn_handle_recurring_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_date DATE;
  v_next_competence DATE;
BEGIN
  -- Guard: Only process if recurring and not already a mirror
  IF NEW.is_recurring = true AND NEW.source_transaction_id IS NULL THEN

    -- Guard against recursion: if this was just created by the trigger itself, skip
    -- The last_generated_date is set after trigger creates the copy
    IF NEW.last_generated_date IS NOT NULL AND NEW.last_generated_date >= CURRENT_DATE THEN
      RETURN NEW;
    END IF;

    -- Check if there's already a transaction for next period (avoid duplicates)
    v_next_date := NEW.date + INTERVAL '1 month';
    v_next_competence := NEW.competence_date + INTERVAL '1 month';

    IF NOT EXISTS (
      SELECT 1 FROM transactions
      WHERE user_id = NEW.user_id
        AND description = NEW.description
        AND date = v_next_date
        AND is_recurring = true
        AND source_transaction_id IS NULL
    ) THEN
      -- Create next occurrence
      INSERT INTO transactions (
        user_id, creator_user_id, amount, description, date, competence_date,
        type, account_id, category_id, domain, is_shared, is_recurring,
        recurrence_pattern, recurrence_day, is_installment, source_transaction_id
      ) VALUES (
        NEW.user_id, NEW.creator_user_id, NEW.amount, NEW.description,
        v_next_date, v_next_competence, NEW.type, NEW.account_id, NEW.category_id,
        COALESCE(NEW.domain, 'PERSONAL'), NEW.is_shared, true,
        NEW.recurrence_pattern, NEW.recurrence_day, false, NEW.id
      );
    END IF;

    -- Mark as generated
    UPDATE transactions SET last_generated_date = CURRENT_DATE WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 3. ADD SYSTEM TYPE TO NOTIFICATIONS ─────────────────────────────────────

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'WELCOME', 'INVOICE_DUE', 'INVOICE_OVERDUE', 'BUDGET_WARNING', 'BUDGET_EXCEEDED',
    'SHARED_PENDING', 'SHARED_SETTLED', 'SHARED_EXPENSE', 'RECURRING_PENDING',
    'RECURRING_GENERATED', 'SAVINGS_GOAL', 'GOAL_MILESTONE', 'LOW_BALANCE',
    'CREDIT_LIMIT_WARNING', 'SUBSCRIPTION_REMINDER', 'WEEKLY_SUMMARY',
    'TRIP_INVITE', 'FAMILY_INVITE', 'SETTLEMENT_REQUEST', 'PAYMENT_CONFIRMED',
    'SETTLEMENT_REJECTED', 'SECURITY_ALERT', 'GENERAL', 'SYSTEM'
  ]::text[]));

-- ─── 4. CREATE MISSING RPC WRAPPERS ──────────────────────────────────────────
-- These wrapper functions map frontend-expected names to actual DB function names

-- search_transactions wrapper (already exists but check signature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'search_transactions'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE FUNCTION search_transactions(
      p_user_id UUID,
      p_search_term TEXT DEFAULT '',
      p_limit INT DEFAULT 50,
      p_offset INT DEFAULT 0
    ) RETURNS TABLE (
      id UUID, user_id UUID, amount NUMERIC, description TEXT, date DATE,
      type TEXT, domain TEXT, account_id UUID, category_id UUID, created_at TIMESTAMPTZ
    ) LANGUAGE sql STABLE AS $$
      SELECT id, user_id, amount, description, date, type::TEXT, domain::TEXT,
             account_id, category_id, created_at
      FROM transactions
      WHERE user_id = p_user_id
        AND deleted_at IS NULL
        AND (p_search_term = '' OR description ILIKE '%' || p_search_term || '%')
      ORDER BY date DESC
      LIMIT p_limit OFFSET p_offset;
    $$;
    GRANT EXECUTE ON FUNCTION search_transactions TO authenticated;
  END IF;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_ledger TO service_role;
