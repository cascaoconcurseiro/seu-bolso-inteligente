-- Fix recurring transaction trigger to prevent infinite recursion
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
  -- Only process if:
  -- 1. Transaction is recurring
  -- 2. Not a mirror (has no source_transaction_id)
  -- 3. Not already generated (last_generated_date is NULL)
  IF NEW.is_recurring = true 
     AND NEW.source_transaction_id IS NULL 
     AND NEW.last_generated_date IS NULL 
  THEN
    v_next_date := NEW.date + INTERVAL '1 month';
    v_next_competence := NEW.competence_date + INTERVAL '1 month';

    -- Avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM transactions
      WHERE user_id = NEW.user_id
        AND description = NEW.description
        AND date = v_next_date
        AND is_recurring = true
        AND source_transaction_id IS NULL
    ) THEN
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

    -- Mark as generated to prevent re-triggering
    UPDATE transactions SET last_generated_date = CURRENT_DATE WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
