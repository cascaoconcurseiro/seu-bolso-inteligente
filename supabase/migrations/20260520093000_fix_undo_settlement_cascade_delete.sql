-- =============================================================================
-- Migration: fix_undo_settlement_cascade_delete
-- Data: 2026-05-20
-- Problema: Ao desfazer um acerto de despesa compartilhada, a transação de 
-- pagamento criada durante o acerto NÃO era excluída e o saldo da conta NÃO 
-- era revertido. A causa era que a função undo_settlement só desfazia a parte
-- do usuário que chamava a função (credor ou devedor), ignorando a outra parte.
-- Quando o credor desistia após o devedor ter pago, a EXPENSE do devedor ficava
-- órfã no banco e o saldo permanecia incorreto.
--
-- Correção: A nova versão SEMPRE desfaz AMBAS as transações (devedor e credor),
-- independentemente de quem solicitou a reversão.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.undo_settlement(p_split_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_split RECORD;
    v_target_user_id UUID;
    v_is_debtor BOOLEAN;
    v_is_creditor BOOLEAN;
BEGIN
    -- Buscar o split com detalhes das transações de acerto
    SELECT 
        ts.*, 
        t.description as original_description, 
        t.user_id as creditor_user_id,
        dtx.account_id as debtor_account_id,
        ctx.account_id as creditor_account_id,
        dtx.amount as debtor_amount,
        ctx.amount as creditor_amount
    INTO v_split
    FROM public.transaction_splits ts
    JOIN public.transactions t ON ts.transaction_id = t.id
    LEFT JOIN public.transactions dtx ON ts.debtor_settlement_tx_id = dtx.id
    LEFT JOIN public.transactions ctx ON ts.creditor_settlement_tx_id = ctx.id
    WHERE ts.id = p_split_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Acerto não encontrado.');
    END IF;

    -- Verificação de permissão
    v_is_debtor   := (v_split.user_id        = p_user_id);
    v_is_creditor := (v_split.creditor_user_id = p_user_id);

    -- Permitir qualquer usuário que seja devedor OU credor desfazer
    -- Também permitir se o usuário criou alguma das transações de acerto
    IF NOT v_is_debtor AND NOT v_is_creditor THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE id IN (v_split.debtor_settlement_tx_id, v_split.creditor_settlement_tx_id)
            AND creator_user_id = p_user_id
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para desfazer este acerto.');
        END IF;
    END IF;

    -- ===== ESTORNO DO DEVEDOR (sempre desfaz, independente de quem pede) =====
    -- Se existe transação de pagamento do devedor, reverter o saldo e excluir
    IF v_split.debtor_settlement_tx_id IS NOT NULL THEN
        IF v_split.debtor_account_id IS NOT NULL AND v_split.debtor_amount IS NOT NULL THEN
            -- O devedor pagou (EXPENSE), devolvemos o dinheiro somando de volta ao saldo
            UPDATE public.accounts 
            SET balance = balance + v_split.debtor_amount 
            WHERE id = v_split.debtor_account_id;
        END IF;
        DELETE FROM public.transactions WHERE id = v_split.debtor_settlement_tx_id;
    END IF;
    
    -- ===== ESTORNO DO CREDOR (sempre desfaz, independente de quem pede) =====
    -- Se existe transação de recebimento do credor, reverter o saldo e excluir
    IF v_split.creditor_settlement_tx_id IS NOT NULL THEN
        IF v_split.creditor_account_id IS NOT NULL AND v_split.creditor_amount IS NOT NULL THEN
            -- O credor recebeu (INCOME), devolvemos subtraindo do saldo
            UPDATE public.accounts 
            SET balance = balance - v_split.creditor_amount 
            WHERE id = v_split.creditor_account_id;
        END IF;
        DELETE FROM public.transactions WHERE id = v_split.creditor_settlement_tx_id;
    END IF;

    -- Limpar todos os campos de liquidação do split
    UPDATE public.transaction_splits
    SET 
        settled_by_debtor          = false, 
        settled_by_creditor        = false,
        debtor_settlement_tx_id    = null, 
        creditor_settlement_tx_id  = null,
        is_settled                 = false, 
        settled_at                 = null, 
        settled_transaction_id     = null
    WHERE id = p_split_id;

    -- Notificar a outra parte
    v_target_user_id := CASE WHEN v_is_debtor THEN v_split.creditor_user_id ELSE v_split.user_id END;
    IF v_target_user_id IS NOT NULL AND v_target_user_id != p_user_id THEN
        PERFORM public.fn_create_notification(
            v_target_user_id, 'Acerto Desfeito 🔄',
            format('O acerto de "%s" foi desfeito.', v_split.original_description),
            'SHARED_EXPENSE', '/compartilhados'
        );
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;
