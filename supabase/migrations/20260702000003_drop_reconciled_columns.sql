-- ============================================================================
-- MIGRATION: Drop reconciled_* columns (final step)
-- ============================================================================
-- Now that we have the exact view definition via run_get_schema(),
-- we can safely drop the view, drop the columns, and recreate the view.
-- ============================================================================

BEGIN;

-- Step 1: Drop dependent view
DROP VIEW IF EXISTS public.transactions_ssot;

-- Step 2: Drop deprecated columns + FK + index
DROP INDEX IF EXISTS public.idx_transactions_reconciled_by;

ALTER TABLE public.transactions
  DROP COLUMN IF EXISTS reconciled,
  DROP COLUMN IF EXISTS reconciled_at,
  DROP COLUMN IF EXISTS reconciled_by;

-- Step 3: Recreate transactions_ssot without reconciled_* columns
CREATE OR REPLACE VIEW public.transactions_ssot AS
 SELECT id,
    user_id,
    account_id,
    destination_account_id,
    category_id,
    trip_id,
    amount,
    description,
    date,
    type,
    domain,
    is_shared,
    payer_id,
    is_installment,
    current_installment,
    total_installments,
    series_id,
    is_recurring,
    recurrence_pattern,
    source_transaction_id,
    sync_status,
    is_settled,
    settled_at,
    related_member_id,
    notes,
    created_at,
    updated_at,
    creator_user_id,
    frequency,
    recurrence_day,
    enable_notification,
    notification_date,
    reminder_option,
    exchange_rate,
    destination_amount,
    destination_currency,
    is_refund,
    refund_of_transaction_id,
    last_generated,
    competence_date,
    currency,
    last_generated_date,
    import_hash,
    advanced_at,
    ( SELECT row_to_json(cat.*) AS row_to_json
           FROM ( SELECT categories.id,
                    categories.name,
                    categories.icon,
                    categories.color
                   FROM categories
                  WHERE (categories.id = t.category_id)) cat) AS category,
    ( SELECT row_to_json(acc.*) AS row_to_json
           FROM ( SELECT accounts.id,
                    accounts.name,
                    accounts.currency
                   FROM accounts
                  WHERE (accounts.id = t.account_id)) acc) AS account,
    COALESCE(( SELECT jsonb_agg(ts.*) AS jsonb_agg
           FROM ( SELECT transaction_splits.id,
                    transaction_splits.member_id,
                    transaction_splits.user_id,
                    transaction_splits.percentage,
                    transaction_splits.amount,
                    transaction_splits.is_settled,
                    transaction_splits.settled_at,
                    transaction_splits.settled_transaction_id,
                    transaction_splits.name
                   FROM transaction_splits
                  WHERE (transaction_splits.transaction_id = t.id)) ts), '[]'::jsonb) AS transaction_splits,
    COALESCE(( SELECT array_agg(transaction_splits.user_id) AS array_agg
           FROM transaction_splits
          WHERE (transaction_splits.transaction_id = t.id)), '{}'::uuid[]) AS split_user_ids
   FROM transactions t;

-- Step 4: ANALYZE
ANALYZE public.transactions;

COMMIT;
