-- ============================================================================
-- MIGRATION: Recurring Transaction Cron — keep the chain alive
-- ============================================================================
-- Problem: fn_handle_recurring_transactions() trigger generates ONE future
-- occurrence when a recurring tx is created. If nobody opens the app for
-- a month, the chain breaks — no new occurrences are generated.
--
-- Solution: generate_pending_recurring_transactions() RPC that finds all
-- recurring series where the most recent occurrence is older than expected
-- and generates the missing ones. Scheduled daily via pg_cron (free tier).
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: RPC to generate pending recurring transactions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_pending_recurring_transactions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
  v_last_date DATE;
  v_next_date DATE;
  v_next_competence DATE;
  v_interval TEXT;
BEGIN
  -- Find all original recurring transactions (not copies/generated ones)
  FOR r IN
    SELECT t.id, t.user_id, t.creator_user_id, t.amount, t.description,
           t.type, t.account_id, t.category_id, t.domain, t.is_shared,
           t.recurrence_pattern, t.recurrence_day, t.competence_date, t.currency,
           t.last_generated_date,
           COALESCE(
             (SELECT MAX(t2.date) FROM public.transactions t2
              WHERE t2.source_transaction_id = t.id
                 OR (t2.description = t.description
                     AND t2.account_id = t.account_id
                     AND t2.is_recurring = true)),
             t.date
           ) AS most_recent_date
    FROM public.transactions t
    WHERE t.is_recurring = true
      AND t.source_transaction_id IS NULL
      AND t.deleted_at IS NULL
      AND t.last_generated_date IS NOT NULL  -- already processed at least once
      AND t.last_generated_date < CURRENT_DATE - INTERVAL '1 day'
  LOOP
    -- Calculate interval based on pattern
    v_interval := UPPER(COALESCE(r.recurrence_pattern, 'MONTHLY'));
    v_next_date := r.most_recent_date;

    CASE v_interval
      WHEN 'DAILY'   THEN v_next_date := v_next_date + INTERVAL '1 day';
      WHEN 'WEEKLY'  THEN v_next_date := v_next_date + INTERVAL '7 days';
      WHEN 'MONTHLY' THEN v_next_date := v_next_date + INTERVAL '1 month';
      WHEN 'YEARLY'  THEN v_next_date := v_next_date + INTERVAL '1 year';
      ELSE v_next_date := v_next_date + INTERVAL '1 month'; -- default monthly
    END CASE;

    -- Only generate if the expected next date has already passed
    IF v_next_date <= CURRENT_DATE THEN
      v_next_competence := DATE_TRUNC('month', v_next_date)::date;

      -- Avoid duplicate
      IF NOT EXISTS (
        SELECT 1 FROM public.transactions t2
        WHERE t2.user_id = r.user_id
          AND t2.description = r.description
          AND t2.date = v_next_date
          AND t2.is_recurring = true
          AND t2.deleted_at IS NULL
      ) THEN
        INSERT INTO public.transactions (
          user_id, creator_user_id, amount, description, date, competence_date,
          type, account_id, category_id, domain, is_shared, is_recurring,
          recurrence_pattern, recurrence_day, currency
        ) VALUES (
          r.user_id, r.creator_user_id, r.amount, r.description,
          v_next_date, v_next_competence, r.type, r.account_id, r.category_id,
          COALESCE(r.domain, 'PERSONAL'), r.is_shared, true,
          r.recurrence_pattern, r.recurrence_day, r.currency
        );

        v_count := v_count + 1;
      END IF;

      -- Mark original as processed so we don't re-check immediately
      UPDATE public.transactions
      SET last_generated_date = CURRENT_DATE
      WHERE id = r.id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================================
-- PHASE 2: Schedule daily cron job (pg_cron — included in Supabase free tier)
-- ============================================================================
-- Runs at 3:00 AM UTC every day (low traffic window)
SELECT cron.schedule(
  'generate-recurring-transactions',  -- job name
  '0 3 * * *',                        -- cron: every day at 3 AM UTC
  'SELECT public.generate_pending_recurring_transactions();'
)
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-recurring-transactions'
);

COMMENT ON FUNCTION public.generate_pending_recurring_transactions() IS
  'Called daily by pg_cron. Generates missing occurrences of recurring transactions when the app has been offline.';

COMMIT;
