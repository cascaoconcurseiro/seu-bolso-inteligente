-- =========================================================================
-- MIGRATION: Fix unsettle RPCs + settlement_reversals FK (B-03, B-06, B-13, B-24)
-- Data: 2026-06-28
-- Branch: fix/29-bugs-report
--
-- B-03/B-24: FK ON DELETE CASCADE → RESTRICT em settlement_reversals
-- B-06: DELETE físico → soft delete (deleted_at, is_active)
-- B-13: unsettle_multiple: valida que todos payment_txs são da mesma conta
-- =========================================================================

-- ─── B-03/B-24: Garantir que settlement_reversals existe com FKs RESTRICT ──

CREATE TABLE IF NOT EXISTS settlement_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL,
  original_transaction_id UUID NOT NULL,
  payment_transaction_id UUID NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  reversal_reason TEXT NOT NULL,
  reversed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reversed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices (idempotentes)
CREATE INDEX IF NOT EXISTS idx_settlement_reversals_split_id ON settlement_reversals(split_id);
CREATE INDEX IF NOT EXISTS idx_settlement_reversals_reversed_by ON settlement_reversals(reversed_by);
CREATE INDEX IF NOT EXISTS idx_settlement_reversals_reversed_at ON settlement_reversals(reversed_at);
CREATE INDEX IF NOT EXISTS idx_settlement_reversals_original_tx ON settlement_reversals(original_transaction_id);

-- RLS (idempotente)
ALTER TABLE settlement_reversals ENABLE ROW LEVEL SECURITY;

-- Substituir FKs existentes por RESTRICT (usa DROP+ADD com DO block seguro)
DO $$
BEGIN
  -- split_id FK
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'settlement_reversals_split_id_fkey') THEN
    ALTER TABLE settlement_reversals DROP CONSTRAINT settlement_reversals_split_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'settlement_reversals_split_id_fkey') THEN
    ALTER TABLE settlement_reversals
      ADD CONSTRAINT settlement_reversals_split_id_fkey
      FOREIGN KEY (split_id) REFERENCES transaction_splits(id) ON DELETE RESTRICT;
  END IF;

  -- original_transaction_id FK
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'settlement_reversals_original_transaction_id_fkey') THEN
    ALTER TABLE settlement_reversals DROP CONSTRAINT settlement_reversals_original_transaction_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'settlement_reversals_original_transaction_id_fkey') THEN
    ALTER TABLE settlement_reversals
      ADD CONSTRAINT settlement_reversals_original_transaction_id_fkey
      FOREIGN KEY (original_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;
  END IF;

  -- payment_transaction_id FK
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'settlement_reversals_payment_transaction_id_fkey') THEN
    ALTER TABLE settlement_reversals DROP CONSTRAINT settlement_reversals_payment_transaction_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'settlement_reversals_payment_transaction_id_fkey') THEN
    ALTER TABLE settlement_reversals
      ADD CONSTRAINT settlement_reversals_payment_transaction_id_fkey
      FOREIGN KEY (payment_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT;
  END IF;
END;
$$;


-- ─── unsettle_split (fix B-06: soft delete; B-01: remove manual balance) ────

DROP FUNCTION IF EXISTS unsettle_split(UUID) CASCADE;

CREATE OR REPLACE FUNCTION unsettle_split(
  p_split_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_split RECORD;
  v_payment_tx_id UUID;
  v_amount NUMERIC;
  v_account_id UUID;
  v_owner_id UUID;
  v_result JSON;
BEGIN
  -- Get split details with ownership check
  SELECT ts.*, t.user_id AS owner_id INTO v_split
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.id = p_split_id
  FOR UPDATE OF ts;

  IF v_split IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Split não encontrado.'
    );
  END IF;

  -- Verificar ownership
  IF v_split.owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Acesso negado: você não é o dono desta transação.'
    );
  END IF;

  IF NOT v_split.is_settled THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este split não foi liquidado.'
    );
  END IF;

  -- Store values for later use
  v_payment_tx_id := v_split.settled_transaction_id;
  v_amount := v_split.amount;

  -- Get account_id from the payment transaction
  SELECT account_id INTO v_account_id
  FROM transactions
  WHERE id = v_payment_tx_id;

  -- Mark split as not settled
  UPDATE transaction_splits
  SET
    is_settled = false,
    settled_at = NULL,
    settled_transaction_id = NULL
  WHERE id = p_split_id;

  -- [B-06] Soft delete da transação de pagamento (não DELETE físico)
  UPDATE transactions
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_payment_tx_id;

  -- [B-01] REMOVIDO: UPDATE accounts manual.
  -- O trigger update_account_balance_on_delete já reverte o saldo
  -- quando a transação é soft-deletada (is_active = false).

  -- Return success
  v_result := json_build_object(
    'success', true,
    'split_id', p_split_id,
    'reverted_amount', v_amount,
    'reverted_at', NOW()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION unsettle_split(UUID) TO authenticated;


-- ─── unsettle_multiple_splits (fix B-06, B-01, B-13) ────────────────────────

DROP FUNCTION IF EXISTS unsettle_multiple_splits(UUID[]) CASCADE;

CREATE OR REPLACE FUNCTION unsettle_multiple_splits(
  p_split_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_reverted_count INTEGER := 0;
  v_total_amount NUMERIC := 0;
  v_payment_tx_ids UUID[] := ARRAY[]::UUID[];
  v_account_id UUID;
  v_first_account_id UUID;
  v_owner_id UUID;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nenhum split fornecido para reversão.'
    );
  END IF;

  -- Collect payment transaction IDs and validate all splits
  FOREACH v_split_id IN ARRAY p_split_ids
  LOOP
    SELECT ts.*, t.user_id AS owner_id INTO v_split
    FROM transaction_splits ts
    JOIN transactions t ON t.id = ts.transaction_id
    WHERE ts.id = v_split_id
    FOR UPDATE OF ts;

    IF v_split IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' não encontrado.'
      );
    END IF;

    -- Verificar ownership
    IF v_owner_id IS NULL THEN
      v_owner_id := v_split.owner_id;
    ELSIF v_split.owner_id IS DISTINCT FROM v_owner_id THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Splits pertencem a usuários diferentes.'
      );
    END IF;

    IF v_split.owner_id IS DISTINCT FROM auth.uid() THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Acesso negado: você não é o dono do split ' || v_split_id::text || '.'
      );
    END IF;

    IF NOT v_split.is_settled THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' não foi liquidado.'
      );
    END IF;

    -- [B-13] Verificar que todos os payment_txs são da mesma conta
    SELECT account_id INTO v_account_id
    FROM transactions
    WHERE id = v_split.settled_transaction_id;

    IF v_first_account_id IS NULL THEN
      v_first_account_id := v_account_id;
    ELSIF v_account_id IS DISTINCT FROM v_first_account_id THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Splits foram liquidados em contas diferentes — reverta individualmente.'
      );
    END IF;

    v_payment_tx_ids := array_append(v_payment_tx_ids, v_split.settled_transaction_id);
    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

  -- Mark all splits as not settled
  UPDATE transaction_splits
  SET
    is_settled = false,
    settled_at = NULL,
    settled_transaction_id = NULL
  WHERE id = ANY(p_split_ids);

  GET DIAGNOSTICS v_reverted_count = ROW_COUNT;

  -- [B-06] Soft delete dos payment transactions
  UPDATE transactions
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(v_payment_tx_ids);

  -- [B-01] REMOVIDO: UPDATE accounts manual.

  -- Return success
  v_result := json_build_object(
    'success', true,
    'reverted_count', v_reverted_count,
    'total_amount', v_total_amount,
    'reverted_at', NOW()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION unsettle_multiple_splits(UUID[]) TO authenticated;
