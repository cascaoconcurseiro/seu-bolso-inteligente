-- C-4: Settlement timeout — devedor paga mas credor nunca confirma
-- Adiciona coluna de expiração + função de cancelamento + RPC para verificar expirados

-- 1. Coluna de expiração do pedido de acerto do devedor
ALTER TABLE transaction_splits
  ADD COLUMN IF NOT EXISTS debtor_settlement_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Atualiza request_settlement para setar expiração de 72h
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

    -- A-8: Resolve family_members.id do usuário para validação de devedor
    SELECT id INTO v_user_member_id
    FROM family_members
    WHERE linked_user_id = p_user_id
      AND removed_at IS NULL
    LIMIT 1;

    -- Expiração em 72 horas
    v_expires_at := NOW() + INTERVAL '72 hours';

    -- Lock e valida todos os splits atomicamente
    FOREACH v_split_id IN ARRAY p_split_ids LOOP
        SELECT ts.* INTO v_split
        FROM transaction_splits ts
        WHERE ts.id = v_split_id
        FOR UPDATE;

        IF v_split IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não encontrado.');
        END IF;

        IF v_split.is_settled THEN
            RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' já foi liquidado.');
        END IF;

        -- Se já tem pedido pendente e não expirou, bloqueia re-envio
        IF v_split.settled_by_debtor = true
           AND v_split.debtor_settlement_expires_at IS NOT NULL
           AND v_split.debtor_settlement_expires_at > NOW() THEN
            RETURN json_build_object('success', false, 'error', 'Já existe um pedido de acerto pendente para o split ' || v_split_id::text || '. Aguarde confirmação do credor.');
        END IF;

        -- A-8: Se é pagamento, garante que o split pertence ao usuário
        IF p_is_payment AND v_user_member_id IS NOT NULL AND v_split.member_id != v_user_member_id THEN
            RETURN json_build_object('success', false, 'error', 'Split ' || v_split_id::text || ' não pertence ao usuário informado.');
        END IF;

        v_total_amount := v_total_amount + v_split.amount;
    END LOOP;

    -- Cria transação (trigger sync_account_balance atualiza saldo)
    INSERT INTO transactions (
        user_id, account_id, amount, type, description, date, domain, is_shared, created_at, updated_at
    ) VALUES (
        p_user_id, p_account_id, v_total_amount,
        CASE WHEN p_is_payment THEN 'EXPENSE'::transaction_type ELSE 'INCOME'::transaction_type END,
        CASE WHEN p_is_payment THEN 'Pagamento de despesa compartilhada' ELSE 'Recebimento de despesa compartilhada' END,
        CURRENT_DATE, 'PERSONAL'::transaction_domain, false, NOW(), NOW()
    )
    RETURNING id INTO v_tx_id;

    FOREACH v_split_id IN ARRAY p_split_ids LOOP
        SELECT ts.* INTO v_split FROM transaction_splits ts WHERE ts.id = v_split_id;

        IF p_is_payment THEN
            UPDATE transaction_splits
            SET settled_by_debtor = true,
                debtor_settlement_tx_id = v_tx_id,
                debtor_settlement_expires_at = v_expires_at
            WHERE id = v_split_id;
        ELSE
            UPDATE transaction_splits
            SET settled_by_creditor = true,
                creditor_settlement_tx_id = v_tx_id
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

-- 3. Função para cancelar pedidos expirados (roda via cron ou chamada manual)
CREATE OR REPLACE FUNCTION expire_pending_settlements()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_count INTEGER := 0;
    v_split         RECORD;
BEGIN
    FOR v_split IN
        SELECT ts.id, ts.debtor_settlement_tx_id
        FROM transaction_splits ts
        WHERE ts.settled_by_debtor = true
          AND ts.is_settled = false
          AND ts.debtor_settlement_expires_at IS NOT NULL
          AND ts.debtor_settlement_expires_at < NOW()
    LOOP
        -- Reverte o split para pendente
        UPDATE transaction_splits
        SET settled_by_debtor = false,
            debtor_settlement_tx_id = NULL,
            debtor_settlement_expires_at = NULL
        WHERE id = v_split.id;

        -- Marca a transação de débito como deletada (soft delete)
        IF v_split.debtor_settlement_tx_id IS NOT NULL THEN
            UPDATE transactions
            SET deleted_at = NOW()
            WHERE id = v_split.debtor_settlement_tx_id
              AND deleted_at IS NULL;
        END IF;

        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'expired_count', v_expired_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION request_settlement(UUID[], UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_pending_settlements() TO authenticated;
