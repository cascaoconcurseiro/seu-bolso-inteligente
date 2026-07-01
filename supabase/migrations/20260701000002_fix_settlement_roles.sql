-- ============================================================================
-- Migration: Fix mixed settlement updates for splits
-- Date: 2026-07-01
-- Purpose: Correctly update settled_by_debtor or settled_by_creditor based
--          on the user's role in each specific split, not just the net operation.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION request_settlement(
    p_split_ids  UUID[],
    p_account_id UUID,
    p_user_id    UUID,
    p_is_payment BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_split_id        UUID;
    v_split           RECORD;
    v_total_amount    NUMERIC := 0;
    v_tx_id           UUID;
    v_processed_count INTEGER := 0;
    v_user_member_id  UUID;
    v_expires_at      TIMESTAMPTZ;
BEGIN
    IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Nenhum split fornecido.');
    END IF;

    -- Resolve family_members.id do usuário para validação de devedor
    SELECT id INTO v_user_member_id
    FROM family_members
    WHERE linked_user_id = p_user_id
      AND removed_at IS NULL
    LIMIT 1;

    -- Expiração em 72 horas
    v_expires_at := NOW() + INTERVAL '72 hours';

    -- Lock e valida todos os splits atomicamente
    FOREACH v_split_id IN ARRAY p_split_ids LOOP
        SELECT ts.*, t.user_id AS orig_tx_user_id 
        INTO v_split
        FROM transaction_splits ts
        JOIN transactions t ON t.id = ts.transaction_id
        WHERE ts.id = v_split_id
        FOR UPDATE;

        IF v_split IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
        END IF;

        IF v_split.is_settled THEN
            RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi liquidado.');
        END IF;

        -- Se já tem pedido pendente e não expirou, bloqueia re-envio (somente se o usuário não for o credor tentando aprovar/solicitar de novo)
        IF v_split.settled_by_debtor = true
           AND v_split.debtor_settlement_expires_at IS NOT NULL
           AND v_split.debtor_settlement_expires_at > NOW() 
           AND v_split.orig_tx_user_id != p_user_id THEN
            RETURN json_build_object('success', false, 'error', 'Já existe um pedido de acerto pendente para o split ' || v_split_id::text || '. Aguarde confirmação do credor.');
        END IF;

        -- Se é pagamento, garante que o split pertence ao usuário
        IF p_is_payment AND v_user_member_id IS NOT NULL AND v_split.member_id != v_user_member_id THEN
            -- Ignorar a verificação se o usuário for o credor do item original
            IF v_split.orig_tx_user_id != p_user_id THEN
                RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não pertence ao usuário informado.');
            END IF;
        END IF;

        -- Lógica de saldo líquido: 
        -- Se o usuário pagou a transação original, ele é o credor deste item (subtrai do total devedor ou adiciona ao total credor).
        -- Se o usuário não pagou, ele é o devedor deste item (adiciona ao total devedor).
        IF v_split.orig_tx_user_id = p_user_id THEN
            -- Crédito para o usuário
            v_total_amount := v_total_amount - v_split.amount;
        ELSE
            -- Débito para o usuário
            v_total_amount := v_total_amount + v_split.amount;
        END IF;
    END LOOP;

    -- O valor total da transação deve ser o absoluto do saldo líquido calculado
    v_total_amount := ABS(v_total_amount);

    -- Cria transação com domain = 'SHARED' e descrição contendo '(Acerto)'
    INSERT INTO transactions (
        user_id, account_id, amount, type, description, date, domain, is_shared, created_at, updated_at
    ) VALUES (
        p_user_id, p_account_id, v_total_amount,
        CASE WHEN p_is_payment THEN 'EXPENSE'::transaction_type ELSE 'INCOME'::transaction_type END,
        CASE WHEN p_is_payment THEN 'Pagamento de despesa compartilhada (Acerto)' ELSE 'Recebimento de despesa compartilhada (Acerto)' END,
        CURRENT_DATE, 'SHARED'::transaction_domain, false, NOW(), NOW()
    )
    RETURNING id INTO v_tx_id;

    FOREACH v_split_id IN ARRAY p_split_ids LOOP
        SELECT ts.*, t.user_id AS orig_tx_user_id INTO v_split 
        FROM transaction_splits ts
        JOIN transactions t ON t.id = ts.transaction_id
        WHERE ts.id = v_split_id;

        -- Aqui está o segredo: O campo atualizado depende se o chamador é o credor ou o devedor DO SPLIT!
        IF v_split.orig_tx_user_id = p_user_id THEN
            -- O usuário é o credor deste item específico
            UPDATE transaction_splits
            SET settled_by_creditor = true,
                creditor_settlement_tx_id = v_tx_id
            WHERE id = v_split_id;
        ELSE
            -- O usuário é o devedor deste item específico
            UPDATE transaction_splits
            SET settled_by_debtor = true,
                debtor_settlement_tx_id = v_tx_id,
                debtor_settlement_expires_at = v_expires_at
            WHERE id = v_split_id;
        END IF;

        INSERT INTO audit_logs (table_name, record_id, operation, new_data, user_id)
        VALUES (
            'transaction_splits', v_split_id, 'SETTLEMENT_REQUESTED',
            jsonb_build_object('amount', v_split.amount, 'currency', 'BRL', 'is_payment', p_is_payment, 'transaction_id', v_tx_id, 'expires_at', v_expires_at),
            p_user_id
        );
        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'processed_count', v_processed_count,
        'total_amount', v_total_amount,
        'expires_at', v_expires_at
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


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
    SELECT ts.*, t.user_id AS orig_tx_user_id 
    INTO v_split 
    FROM transaction_splits ts
    JOIN transactions t ON t.id = ts.transaction_id
    WHERE ts.id = v_split_id FOR UPDATE;
    
    IF v_split IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
    END IF;
    IF v_split.is_settled THEN
      RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi totalmente liquidado.');
    END IF;

    -- Lógica de saldo líquido: 
    IF v_split.orig_tx_user_id = p_user_id THEN
        v_total_amount := v_total_amount - v_split.amount;
    ELSE
        v_total_amount := v_total_amount + v_split.amount;
    END IF;
  END LOOP;

  -- O valor total da transação deve ser o absoluto do saldo líquido calculado
  v_total_amount := ABS(v_total_amount);

  -- Cria transação com domain = 'SHARED'
  INSERT INTO transactions (
    user_id, account_id, amount, type, description, date, domain, is_shared, created_at, updated_at
  ) VALUES (
    p_user_id, p_account_id, v_total_amount,
    CASE WHEN p_is_receiving THEN 'INCOME'::transaction_type ELSE 'EXPENSE'::transaction_type END,
    CASE WHEN p_is_receiving THEN 'Recebimento confirmado (Acerto)' ELSE 'Pagamento confirmado (Acerto)' END,
    CURRENT_DATE, 'SHARED'::transaction_domain, false, NOW(), NOW()
  )
  RETURNING id INTO v_tx_id;

  FOREACH v_split_id IN ARRAY p_split_ids LOOP
    SELECT ts.*, t.user_id AS orig_tx_user_id INTO v_split 
    FROM transaction_splits ts
    JOIN transactions t ON t.id = ts.transaction_id
    WHERE ts.id = v_split_id;

    -- Confirma tudo para o item
    UPDATE transaction_splits SET
      settled_by_creditor = true,
      creditor_settlement_tx_id = COALESCE(creditor_settlement_tx_id, v_tx_id),
      settled_by_debtor = true,
      debtor_settlement_tx_id = COALESCE(debtor_settlement_tx_id, v_tx_id),
      is_settled = true,
      settled_at = NOW()
    WHERE id = v_split_id;

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

COMMIT;
