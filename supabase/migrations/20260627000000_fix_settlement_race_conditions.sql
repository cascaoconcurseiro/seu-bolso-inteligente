-- ============================================================================
-- Migration: Fix race conditions in settlement RPCs (FOR UPDATE locks)
-- Date: 2026-06-27
-- Purpose: Add row-level locking to prevent concurrent settlement conflicts
-- ============================================================================

BEGIN;

-- Fix request_settlement: add FOR UPDATE to prevent race condition
-- where two users simultaneously settle the same splits
CREATE OR REPLACE FUNCTION request_settlement(
  p_split_ids UUID[],
  p_account_id UUID,
  p_user_id UUID,
  p_is_payment BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_total_amount NUMERIC := 0;
  v_tx_id UUID;
  v_processed_count INTEGER := 0;
BEGIN
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  END IF;

  -- Lock and verify all splits atomically
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT * INTO v_split FROM transaction_splits WHERE id = v_split_id FOR UPDATE;
    IF v_split IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
    END IF;
    IF v_split.is_settled THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi liquidado.');
    END IF;

    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

  -- Create transaction for the initiator
  INSERT INTO transactions (
    user_id, account_id, amount, type, description, date, domain, is_shared, created_at, updated_at
  ) VALUES (
    p_user_id, p_account_id, v_total_amount,
    CASE WHEN p_is_payment THEN 'EXPENSE'::transaction_type ELSE 'INCOME'::transaction_type END,
    CASE WHEN p_is_payment THEN 'Pagamento de despesa compartilhada' ELSE 'Recebimento de despesa compartilhada' END,
    CURRENT_DATE, 'PERSONAL'::transaction_domain, false, NOW(), NOW()
  )
  RETURNING id INTO v_tx_id;

  -- Update splits and add Audit Logs
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    IF p_is_payment THEN
      UPDATE transaction_splits SET settled_by_debtor = true, debtor_settlement_tx_id = v_tx_id WHERE id = v_split_id;
    ELSE
      UPDATE transaction_splits SET settled_by_creditor = true, creditor_settlement_tx_id = v_tx_id WHERE id = v_split_id;
    END IF;

    INSERT INTO audit_logs (table_name, record_id, operation, new_data, user_id)
    VALUES (
      'transaction_splits', v_split_id, 'SETTLEMENT_REQUESTED',
      jsonb_build_object('amount', v_split.amount, 'currency', 'BRL', 'is_payment', p_is_payment, 'transaction_id', v_tx_id),
      p_user_id
    );
    v_processed_count := v_processed_count + 1;
  END LOOP;

  -- Update account balance
  IF p_is_payment THEN
    UPDATE accounts SET balance = balance - v_total_amount WHERE id = p_account_id;
  ELSE
    UPDATE accounts SET balance = balance + v_total_amount WHERE id = p_account_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'processed_count', v_processed_count,
    'total_amount', v_total_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Fix confirm_settlement: add FOR UPDATE to prevent race condition
CREATE OR REPLACE FUNCTION confirm_settlement(
  p_split_ids UUID[],
  p_account_id UUID,
  p_user_id UUID,
  p_is_receiving BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_total_amount NUMERIC := 0;
  v_tx_id UUID;
  v_confirmed_count INTEGER := 0;
BEGIN
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Nenhum split fornecido.');
  END IF;

  -- Lock and verify all splits atomically
  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT * INTO v_split FROM transaction_splits WHERE id = v_split_id FOR UPDATE;
    IF v_split IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
    END IF;
    IF v_split.is_settled THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi totalmente liquidado.');
    END IF;

    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

  INSERT INTO transactions (
    user_id, account_id, amount, type, description, date, domain, is_shared, created_at, updated_at
  ) VALUES (
    p_user_id, p_account_id, v_total_amount,
    CASE WHEN p_is_receiving THEN 'INCOME'::transaction_type ELSE 'EXPENSE'::transaction_type END,
    CASE WHEN p_is_receiving THEN 'Recebimento confirmado (Acerto)' ELSE 'Pagamento confirmado (Acerto)' END,
    CURRENT_DATE, 'PERSONAL'::transaction_domain, false, NOW(), NOW()
  )
  RETURNING id INTO v_tx_id;

  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    IF p_is_receiving THEN
      UPDATE transaction_splits SET
        settled_by_creditor = true,
        creditor_settlement_tx_id = v_tx_id,
        is_settled = true,
        settled_at = NOW()
      WHERE id = v_split_id;
    ELSE
      UPDATE transaction_splits SET
        settled_by_debtor = true,
        debtor_settlement_tx_id = v_tx_id,
        is_settled = true,
        settled_at = NOW()
      WHERE id = v_split_id;
    END IF;

    INSERT INTO audit_logs (table_name, record_id, operation, new_data, user_id)
    VALUES (
      'transaction_splits', v_split_id, 'SETTLEMENT_CONFIRMED',
      jsonb_build_object('amount', v_split.amount, 'currency', 'BRL', 'is_receiving', p_is_receiving, 'transaction_id', v_tx_id),
      p_user_id
    );
    v_confirmed_count := v_confirmed_count + 1;
  END LOOP;

  IF p_is_receiving THEN
    UPDATE accounts SET balance = balance + v_total_amount WHERE id = p_account_id;
  ELSE
    UPDATE accounts SET balance = balance - v_total_amount WHERE id = p_account_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'confirmed_count', v_confirmed_count,
    'total_amount', v_total_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION request_settlement(UUID[], UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_settlement(UUID[], UUID, UUID, BOOLEAN) TO authenticated;

-- Fix B27: reject_settlement_request RPC estava referenciada mas nunca criada
DROP FUNCTION IF EXISTS reject_settlement_request(UUID, TEXT);
CREATE OR REPLACE FUNCTION reject_settlement_request(
  p_split_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split RECORD;
BEGIN
  SELECT * INTO v_split FROM transaction_splits WHERE id = p_split_id FOR UPDATE;

  IF v_split IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Split não encontrado.');
  END IF;

  IF v_split.is_settled THEN
    RETURN json_build_object('success', false, 'error', 'Split já foi liquidado.');
  END IF;

  -- Reset both settlement flags
  UPDATE transaction_splits SET
    settled_by_debtor = false,
    settled_by_creditor = false,
    debtor_settlement_tx_id = NULL,
    creditor_settlement_tx_id = NULL,
    is_settled = false,
    settled_at = NULL
  WHERE id = p_split_id;

  -- Delete associated settlement transactions if they exist
  IF v_split.debtor_settlement_tx_id IS NOT NULL THEN
    DELETE FROM transactions WHERE id = v_split.debtor_settlement_tx_id;
  END IF;
  IF v_split.creditor_settlement_tx_id IS NOT NULL THEN
    DELETE FROM transactions WHERE id = v_split.creditor_settlement_tx_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (table_name, record_id, operation, new_data)
  VALUES (
    'transaction_splits', p_split_id, 'SETTLEMENT_REJECTED',
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Overload com user_id (para compatibilidade com referência antiga)
DROP FUNCTION IF EXISTS reject_settlement_request(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION reject_settlement_request(
  p_split_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ignora p_user_id, apenas delega para a função principal
  RETURN reject_settlement_request(p_split_id, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION reject_settlement_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_settlement_request(UUID, UUID, TEXT) TO authenticated;

-- Fix B23: get_trip_participant_balances RPC referenciada mas nunca criada
DROP FUNCTION IF EXISTS get_trip_participant_balances(UUID);
CREATE OR REPLACE FUNCTION get_trip_participant_balances(p_trip_id UUID)
RETURNS TABLE(
  participant_id UUID,
  user_id UUID,
  name TEXT,
  paid NUMERIC,
  owes NUMERIC,
  balance NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH trip_tx AS (
    SELECT t.id, t.amount, t.currency, t.user_id AS payer_id, t.domain
    FROM transactions t
    WHERE t.trip_id = p_trip_id
      AND t.deleted_at IS NULL
  ),
  splits_data AS (
    SELECT
      ts.member_id,
      ts.user_id,
      ts.amount AS split_amount,
      tt.amount AS tx_amount,
      tt.currency,
      tt.payer_id,
      tt.id AS tx_id
    FROM transaction_splits ts
    JOIN trip_tx tt ON ts.transaction_id = tt.id
  ),
  participant_paid AS (
    SELECT
      tt.payer_id AS user_id,
      tt.currency,
      COALESCE(SUM(tt.amount), 0) AS paid
    FROM trip_tx tt
    GROUP BY tt.payer_id, tt.currency
  ),
  participant_owes AS (
    SELECT
      sd.user_id,
      sd.currency,
      COALESCE(SUM(sd.split_amount), 0) AS owes
    FROM splits_data sd
    GROUP BY sd.user_id, sd.currency
  ),
  all_participants AS (
    SELECT DISTINCT user_id FROM participant_paid
    UNION
    SELECT DISTINCT user_id FROM participant_owes
  )
  SELECT
    tm.id AS participant_id,
    ap.user_id,
    COALESCE(p.full_name, tm.guest_name, 'Participante') AS name,
    COALESCE(pp.paid, 0) AS paid,
    COALESCE(po.owes, 0) AS owes,
    COALESCE(pp.paid, 0) - COALESCE(po.owes, 0) AS balance,
    COALESCE(pp.currency, po.currency, 'BRL') AS currency
  FROM all_participants ap
  LEFT JOIN trip_members tm ON tm.user_id = ap.user_id AND tm.trip_id = p_trip_id
  LEFT JOIN profiles p ON p.id = ap.user_id
  LEFT JOIN participant_paid pp ON pp.user_id = ap.user_id
  LEFT JOIN participant_owes po ON po.user_id = ap.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trip_participant_balances(UUID) TO authenticated;

-- ============================================================================
-- Integrity fixes: drop redundant trigger, add UNIQUE constraints, fix FKs
-- ============================================================================

-- C1: Drop redundant trigger (trg_sync_is_settled from 20260101000005 handles everything)
DROP TRIGGER IF EXISTS transaction_splits_settlement_trigger ON public.transaction_splits;
DROP FUNCTION IF EXISTS public.trg_transaction_splits_settlement();

-- H2: Prevent duplicate trip members
ALTER TABLE public.trip_members
  DROP CONSTRAINT IF EXISTS unique_trip_member;
ALTER TABLE public.trip_members
  ADD CONSTRAINT unique_trip_member UNIQUE (trip_id, user_id);

-- H3: Prevent duplicate family members
ALTER TABLE public.family_members
  DROP CONSTRAINT IF EXISTS unique_family_member;
ALTER TABLE public.family_members
  ADD CONSTRAINT unique_family_member UNIQUE (family_id, linked_user_id);

-- H4: Prevent duplicate pending trip invitations
DROP INDEX IF EXISTS idx_unique_pending_trip_invitation;
CREATE UNIQUE INDEX idx_unique_pending_trip_invitation
  ON public.trip_invitations(trip_id, invitee_id) WHERE status = 'pending';

-- H6: Add CHECK constraints on status columns
ALTER TABLE public.trip_invitations
  DROP CONSTRAINT IF EXISTS trip_invitations_status_check;
ALTER TABLE public.trip_invitations
  ADD CONSTRAINT trip_invitations_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));

ALTER TABLE public.family_invitations
  DROP CONSTRAINT IF EXISTS family_invitations_status_check;
ALTER TABLE public.family_invitations
  ADD CONSTRAINT family_invitations_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));

ALTER TABLE public.trip_members
  DROP CONSTRAINT IF EXISTS trip_members_status_check;
ALTER TABLE public.trip_members
  ADD CONSTRAINT trip_members_status_check
  CHECK (status IN ('active', 'inactive', 'pending'));

ALTER TABLE public.trip_members
  DROP CONSTRAINT IF EXISTS trip_members_role_check;
ALTER TABLE public.trip_members
  ADD CONSTRAINT trip_members_role_check
  CHECK (role IN ('owner', 'member', 'viewer'));

-- H1/H8: Fix FK cascade hazard on accounts → transactions
-- Replace ON DELETE CASCADE with ON DELETE RESTRICT (trigger already blocks deletes)
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;

-- C2: Fix FK cascade on assets → transactions (SET NULL instead of CASCADE)
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_asset_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;

-- C3: Fix FK cascade on transaction_splits.member_id (SET NULL instead of CASCADE)
ALTER TABLE public.transaction_splits
  DROP CONSTRAINT IF EXISTS transaction_splits_member_id_fkey;
ALTER TABLE public.transaction_splits
  ADD CONSTRAINT transaction_splits_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.family_members(id) ON DELETE SET NULL;

COMMIT;
