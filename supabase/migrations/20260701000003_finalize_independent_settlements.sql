-- =========================================================================
-- MIGRATION: Finalize Independent Settlements & Fix Soft Delete Balances
-- =========================================================================

-- 1. Refactor undo_settlement to ONLY undo the calling user's transaction
CREATE OR REPLACE FUNCTION public.undo_settlement(p_split_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_split RECORD;
    v_is_debtor BOOLEAN;
    v_is_creditor BOOLEAN;
BEGIN
    SELECT * INTO v_split 
    FROM public.transaction_splits 
    WHERE id = p_split_id;

    IF v_split IS NULL THEN
        RAISE EXCEPTION 'Split não encontrado.';
    END IF;

    -- Determinar de qual lado o usuário está
    v_is_debtor := (v_split.user_id = p_user_id);
    v_is_creditor := (v_split.creditor_user_id = p_user_id);

    IF NOT v_is_debtor AND NOT v_is_creditor THEN
        RAISE EXCEPTION 'Usuário não tem permissão para desfazer este acerto.';
    END IF;

    -- ===== ESTORNO DO LADO DO DEVEDOR =====
    IF v_is_debtor THEN
        IF v_split.debtor_settlement_tx_id IS NOT NULL THEN
            IF v_split.debtor_account_id IS NOT NULL AND v_split.debtor_amount IS NOT NULL THEN
                UPDATE public.accounts 
                SET balance = balance + v_split.debtor_amount 
                WHERE id = v_split.debtor_account_id;
            END IF;
            -- Deletar a transação (isso apagará de fato ou fará soft delete se houver instead_of trigger, 
            -- mas o código original usava DELETE, o que fisicamente apaga do banco de dados neste caso. 
            -- Vamos manter DELETE para não deixar sujeira, mas os saldos já foram ajustados via código acima).
            DELETE FROM public.transactions WHERE id = v_split.debtor_settlement_tx_id;
        END IF;

        UPDATE public.transaction_splits 
        SET 
            debtor_settlement_tx_id = null,
            settled_by_debtor = false,
            is_settled = false,
            settled_at = CASE WHEN settled_by_creditor = true THEN settled_at ELSE null END
        WHERE id = p_split_id;
    END IF;

    -- ===== ESTORNO DO LADO DO CREDOR =====
    IF v_is_creditor THEN
        IF v_split.creditor_settlement_tx_id IS NOT NULL THEN
            IF v_split.creditor_account_id IS NOT NULL AND v_split.creditor_amount IS NOT NULL THEN
                UPDATE public.accounts 
                SET balance = balance - v_split.creditor_amount 
                WHERE id = v_split.creditor_account_id;
            END IF;
            DELETE FROM public.transactions WHERE id = v_split.creditor_settlement_tx_id;
        END IF;

        UPDATE public.transaction_splits 
        SET 
            creditor_settlement_tx_id = null,
            settled_by_creditor = false,
            is_settled = false,
            settled_at = CASE WHEN settled_by_debtor = true THEN settled_at ELSE null END
        WHERE id = p_split_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 2. Fix recalculate_account_balance to ignore soft-deleted transactions
CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_initial_balance NUMERIC;
  v_calculated_balance NUMERIC;
BEGIN
  -- Buscar saldo inicial
  SELECT COALESCE(initial_balance, 0) INTO v_initial_balance
  FROM accounts WHERE id = p_account_id;

  -- Calcular saldo baseado APENAS em transações até HOJE
  -- Ignorar transações deletadas (deleted_at IS NULL)
  SELECT v_initial_balance + COALESCE(SUM(
    CASE
      WHEN type = 'INCOME' THEN amount
      WHEN type = 'EXPENSE' THEN -amount
      WHEN type = 'TRANSFER' AND account_id = p_account_id THEN -amount
      WHEN type = 'TRANSFER' AND destination_account_id = p_account_id THEN amount
      ELSE 0
    END
  ), 0) INTO v_calculated_balance
  FROM transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND (
      payer_id IS NULL
      OR payer_id = ANY(
        ARRAY(SELECT id FROM family_members WHERE user_id = transactions.user_id)
      )
    )
    AND date <= CURRENT_DATE
    AND deleted_at IS NULL; -- BUGFIX: ignora soft-deletes no recálculo

  -- Atualizar saldo da conta
  UPDATE accounts SET balance = v_calculated_balance, updated_at = NOW()
  WHERE id = p_account_id;

  RETURN v_calculated_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Fix update_account_balance_on_update to trigger on soft delete
CREATE OR REPLACE FUNCTION public.update_account_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou conta, valor, tipo, data, conta destino, ou DELETED_AT (soft delete/restore)
  IF OLD.account_id IS DISTINCT FROM NEW.account_id OR
     OLD.amount IS DISTINCT FROM NEW.amount OR
     OLD.type IS DISTINCT FROM NEW.type OR
     OLD.date IS DISTINCT FROM NEW.date OR
     OLD.destination_account_id IS DISTINCT FROM NEW.destination_account_id OR
     OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
     
     -- Recalcular conta antiga (se existia)
     IF OLD.account_id IS NOT NULL THEN
       PERFORM recalculate_account_balance(OLD.account_id);
     END IF;
     
     -- Recalcular nova conta (se diferente da antiga e não nula)
     IF NEW.account_id IS NOT NULL AND NEW.account_id IS DISTINCT FROM OLD.account_id THEN
       PERFORM recalculate_account_balance(NEW.account_id);
     END IF;
     
     -- Se contas são iguais, o primeiro recalculo já resolveu, mas se mudou apenas valor/data na mesma conta:
     IF NEW.account_id IS NOT NULL AND NEW.account_id = OLD.account_id THEN
       PERFORM recalculate_account_balance(NEW.account_id);
     END IF;
     
     -- Lidar com conta destino em transferências
     IF OLD.destination_account_id IS DISTINCT FROM NEW.destination_account_id THEN
        IF OLD.destination_account_id IS NOT NULL THEN
          PERFORM recalculate_account_balance(OLD.destination_account_id);
        END IF;
        IF NEW.destination_account_id IS NOT NULL THEN
          PERFORM recalculate_account_balance(NEW.destination_account_id);
        END IF;
     END IF;
     
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Create trigger to cascade soft delete from transactions to transaction_splits
CREATE OR REPLACE FUNCTION public.cascade_soft_delete_settlement_transactions()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a transação for deletada logicamente
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Limpar do lado do devedor caso pertença ao devedor
    UPDATE transaction_splits 
    SET debtor_settlement_tx_id = null, settled_by_debtor = false, is_settled = false
    WHERE debtor_settlement_tx_id = NEW.id;

    -- Limpar do lado do credor caso pertença ao credor
    UPDATE transaction_splits 
    SET creditor_settlement_tx_id = null, settled_by_creditor = false, is_settled = false
    WHERE creditor_settlement_tx_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cascade_soft_delete_settlement_transactions ON transactions;
CREATE TRIGGER trigger_cascade_soft_delete_settlement_transactions
  AFTER UPDATE OF deleted_at ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION cascade_soft_delete_settlement_transactions();

-- 5. Force recalculation of ALL accounts now to fix any existing drift caused by soft-deletes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM accounts LOOP
    PERFORM recalculate_account_balance(r.id);
  END LOOP;
END;
$$;
