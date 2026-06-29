-- Smart closing day modes + per-invoice override for credit cards
BEGIN;

-- 1. Add closing_day_mode to accounts (only for credit cards)
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS closing_day_mode TEXT DEFAULT 'FIXED_DAY';

ALTER TABLE public.accounts
ADD CONSTRAINT valid_closing_day_mode
CHECK (closing_day_mode IN ('FIXED_DAY', 'LAST_DAY', 'LAST_BUSINESS_DAY'));

-- 2. Table for per-invoice closing date overrides
CREATE TABLE IF NOT EXISTS public.credit_card_closing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  reference_date DATE NOT NULL,
  closing_date DATE NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, reference_date)
);

CREATE INDEX IF NOT EXISTS idx_closing_overrides_account
ON public.credit_card_closing_overrides(account_id, reference_date);

-- 3. Function to calculate actual closing date based on mode
CREATE OR REPLACE FUNCTION public.get_actual_closing_date(
  p_year_month DATE,
  p_closing_day INTEGER,
  p_mode TEXT
) RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_last_day DATE;
  v_result DATE;
BEGIN
  p_mode := COALESCE(p_mode, 'FIXED_DAY');
  p_closing_day := COALESCE(p_closing_day, 1);

  CASE p_mode
    WHEN 'LAST_DAY' THEN
      v_result := (DATE_TRUNC('month', p_year_month) + INTERVAL '1 month' - INTERVAL '1 day')::date;

    WHEN 'LAST_BUSINESS_DAY' THEN
      v_last_day := (DATE_TRUNC('month', p_year_month) + INTERVAL '1 month' - INTERVAL '1 day')::date;
      WHILE EXTRACT(DOW FROM v_last_day) IN (0, 6) LOOP
        v_last_day := v_last_day - INTERVAL '1 day';
      END LOOP;
      v_result := v_last_day;

    ELSE -- FIXED_DAY
      v_result := (DATE_TRUNC('month', p_year_month) +
        make_interval(days => LEAST(p_closing_day,
          EXTRACT(DAY FROM (DATE_TRUNC('month', p_year_month) + INTERVAL '1 month' - INTERVAL '1 day'))::int) - 1))::date;
  END CASE;

  RETURN v_result;
END;
$$;

-- 4. Update competence_date trigger to use mode + override table
CREATE OR REPLACE FUNCTION public.set_credit_card_competence_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_type TEXT;
  v_closing_day INTEGER;
  v_closing_mode TEXT;
  v_transaction_date DATE;
  v_transaction_day INTEGER;
  v_competence_date DATE;
  v_actual_closing_date DATE;
  v_month_start DATE;
BEGIN
  IF NEW.is_installment = true AND NEW.competence_date IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.type, a.closing_day, COALESCE(a.closing_day_mode, 'FIXED_DAY')
  INTO v_account_type, v_closing_day, v_closing_mode
  FROM accounts a
  WHERE a.id = NEW.account_id;

  IF v_account_type = 'CREDIT_CARD' THEN
    v_transaction_date := NEW.date::date;
    v_closing_day := COALESCE(v_closing_day, 1);

    -- Check for per-invoice override for this transaction's reference month
    v_month_start := DATE_TRUNC('month', v_transaction_date)::date;

    SELECT o.closing_date INTO v_actual_closing_date
    FROM credit_card_closing_overrides o
    WHERE o.account_id = NEW.account_id
      AND o.reference_date = v_month_start;

    -- No override → calculate using mode
    IF v_actual_closing_date IS NULL THEN
      v_actual_closing_date := public.get_actual_closing_date(v_month_start, v_closing_day, v_closing_mode);
    END IF;

    v_transaction_day := EXTRACT(DAY FROM v_transaction_date);

    IF v_transaction_day > EXTRACT(DAY FROM v_actual_closing_date) THEN
      v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
    ELSE
      v_competence_date := DATE_TRUNC('month', v_transaction_date)::date;
    END IF;

    NEW.competence_date := v_competence_date;
    RETURN NEW;
  END IF;

  -- Non credit-card: default month-based
  IF TG_OP = 'UPDATE' AND OLD.date IS DISTINCT FROM NEW.date THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
  ELSIF TG_OP = 'INSERT' AND NEW.competence_date IS NULL THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.date::date)::date;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Update post-split trigger
CREATE OR REPLACE FUNCTION public.update_shared_competence_after_split()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  SELECT t.*, a.type as account_type INTO v_transaction
  FROM transactions t
  LEFT JOIN accounts a ON a.id = t.account_id
  WHERE t.id = NEW.transaction_id;

  RETURN NEW;
END;
$$;

COMMIT;
