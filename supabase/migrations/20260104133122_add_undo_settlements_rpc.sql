-- Function to safely undo multiple shared expense settlements
-- This ensures atomicity: either all updates happen, or none do.

CREATE OR REPLACE FUNCTION undo_shared_settlements(p_split_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_split_id uuid;
    v_payment_tx_id uuid;
    v_payment_tx RECORD;
    v_account_balance numeric;
    v_processed_count integer := 0;
    v_processed_tx_ids uuid[] := '{}';
BEGIN
    -- 1. Iterate through distinct settled transactions to revert balances and delete them
    FOR v_payment_tx IN 
        SELECT DISTINCT t.id, t.amount, t.account_id
        FROM transaction_splits s
        JOIN transactions t ON s.settled_transaction_id = t.id
        WHERE s.id = ANY(p_split_ids)
    LOOP
        -- Avoid processing the same transaction multiple times (in case multiple splits point to same tx)
        IF NOT (v_payment_tx.id = ANY(v_processed_tx_ids)) THEN
            
            -- Revert account balance if account exists
            IF v_payment_tx.account_id IS NOT NULL THEN
                UPDATE accounts
                SET balance = balance - v_payment_tx.amount
                WHERE id = v_payment_tx.account_id;
            END IF;

            -- Delete the payment transaction
            DELETE FROM transactions WHERE id = v_payment_tx.id;

            v_processed_tx_ids := array_append(v_processed_tx_ids, v_payment_tx.id);
        END IF;
    END LOOP;

    -- 2. Update splits to mark as unsettled
    UPDATE transaction_splits
    SET 
        is_settled = false,
        settled_at = NULL,
        settled_transaction_id = NULL
    WHERE id = ANY(p_split_ids);

    GET DIAGNOSTICS v_processed_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'updated_splits_count', v_processed_count,
        'reverted_transactions_count', array_length(v_processed_tx_ids, 1)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;;
