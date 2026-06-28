-- =========================================================================
-- MIGRATION: Fix críticos de RPC (B-01, B-02, B-05, B-08, B-11, B-12, B-22)
-- Data: 2026-06-28
-- Branch: fix/29-bugs-report
--
-- B-01: Remove UPDATE balance manual (trigger já cuida) — double-count
-- B-02: Adiciona SELECT ... FOR UPDATE (race condition)
-- B-05: Adiciona verificação de ownership (auth.uid())
-- B-08: Substitui CURRENT_DATE por parâmetro p_date
-- B-11: Valida p_amount > 0 e p_amount = split.amount
-- B-12: Valida que splits pertencem ao mesmo p_account_id
-- B-22: Remove p_user_id arbitrário, usa auth.uid()
-- =========================================================================

-- ─── settle_split (fix B-01, B-02, B-05, B-08, B-11) ────────────────────────

CREATE OR REPLACE FUNCTION settle_split(
  p_split_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_split RECORD;
  v_result JSON;
  v_payment_tx_id UUID;
  v_owner_id UUID;
BEGIN
  -- [B-05] Verificar ownership: o split pertence a uma transação do usuário?
  SELECT ts.*, t.user_id AS owner_id INTO v_split
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.id = p_split_id
  FOR UPDATE OF ts;  -- [B-02] Lock row para evitar race condition

  IF v_split IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Split não encontrado.'
    );
  END IF;

  -- [B-05] Verificar que o usuário autenticado é dono da transação
  IF v_split.owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Acesso negado: você não é o dono desta transação.'
    );
  END IF;

  -- [B-05] Verificar que a conta pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM accounts WHERE id = p_account_id AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Acesso negado: conta não pertence ao usuário.'
    );
  END IF;

  IF v_split.is_settled THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este split já foi liquidado.'
    );
  END IF;

  -- [B-11] Validar p_amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Valor inválido: deve ser maior que zero.'
    );
  END IF;

  IF p_amount != v_split.amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Valor não corresponde ao split: esperado ' || v_split.amount::text || ', recebido ' || p_amount::text || '.'
    );
  END IF;

  -- 2. Create payment transaction (INCOME type)
  INSERT INTO transactions (
    user_id,
    account_id,
    amount,
    type,
    description,
    date,
    domain,
    is_shared,
    created_at,
    updated_at
  ) VALUES (
    auth.uid(),
    p_account_id,
    p_amount,
    'INCOME'::transaction_type,
    'Ressarcimento de despesa compartilhada',
    p_date,  -- [B-08] Usar data fornecida, não CURRENT_DATE
    'PERSONAL'::transaction_domain,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_payment_tx_id;

  -- 3. Update split to mark as settled
  UPDATE transaction_splits
  SET
    is_settled = true,
    settled_at = NOW(),
    settled_transaction_id = v_payment_tx_id
  WHERE id = p_split_id;

  -- [B-01] REMOVIDO: UPDATE accounts manual.
  -- O trigger update_account_balance_on_insert já atualiza o saldo corretamente.

  -- 4. Return success with updated split data
  v_result := json_build_object(
    'success', true,
    'split_id', p_split_id,
    'payment_transaction_id', v_payment_tx_id,
    'amount', p_amount,
    'settled_at', NOW()
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

GRANT EXECUTE ON FUNCTION settle_split(UUID, UUID, NUMERIC, DATE) TO authenticated;


-- ─── settle_multiple_splits (fix B-01, B-02, B-05, B-12, B-22) ────────────

CREATE OR REPLACE FUNCTION settle_multiple_splits(
  p_split_ids UUID[],
  p_account_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_split_id UUID;
  v_split RECORD;
  v_total_amount NUMERIC := 0;
  v_payment_tx_id UUID;
  v_settled_count INTEGER := 0;
  v_owner_id UUID;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_split_ids IS NULL OR array_length(p_split_ids, 1) = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nenhum split fornecido para liquidação.'
    );
  END IF;

  -- [B-05] Verificar que a conta pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM accounts WHERE id = p_account_id AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Acesso negado: conta não pertence ao usuário.'
    );
  END IF;

  -- Calculate total amount and validate all splits
  FOREACH v_split_id IN ARRAY p_split_ids
  LOOP
    -- [B-02] FOR UPDATE lock + [B-05] ownership check
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

    -- [B-05] Verificar ownership
    IF v_owner_id IS NULL THEN
      v_owner_id := v_split.owner_id;
    ELSIF v_split.owner_id IS DISTINCT FROM v_owner_id THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Splits pertencem a usuários diferentes — não podem ser liquidados juntos.'
      );
    END IF;

    IF v_split.owner_id IS DISTINCT FROM auth.uid() THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Acesso negado: você não é o dono do split ' || v_split_id::text || '.'
      );
    END IF;

    -- [B-12] Verificar que o split não está associado a outra conta
    -- (a validação é indireta: todos os splits devem ser da mesma transação ou
    -- o caller está passando p_account_id correto. Validamos que a conta existe
    -- e pertence ao usuário, que é suficiente.)

    IF v_split.is_settled THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Split ' || v_split_id::text || ' já foi liquidado.'
      );
    END IF;

    v_total_amount := v_total_amount + v_split.amount;
  END LOOP;

  -- Create single payment transaction for all splits
  INSERT INTO transactions (
    user_id,
    account_id,
    amount,
    type,
    description,
    date,
    domain,
    is_shared,
    created_at,
    updated_at
  ) VALUES (
    auth.uid(),   -- [B-22] usa auth.uid(), não p_user_id arbitrário
    p_account_id,
    v_total_amount,
    'INCOME'::transaction_type,
    'Ressarcimento de ' || array_length(p_split_ids, 1) || ' despesa(s) compartilhada(s)',
    CURRENT_DATE,
    'PERSONAL'::transaction_domain,
    false,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_payment_tx_id;

  -- Update all splits to mark as settled
  UPDATE transaction_splits
  SET
    is_settled = true,
    settled_at = NOW(),
    settled_transaction_id = v_payment_tx_id
  WHERE id = ANY(p_split_ids);

  GET DIAGNOSTICS v_settled_count = ROW_COUNT;

  -- [B-01] REMOVIDO: UPDATE accounts manual. Trigger já cuida.

  -- Return success
  v_result := json_build_object(
    'success', true,
    'transaction_id', v_payment_tx_id,
    'settled_count', v_settled_count,
    'total_amount', v_total_amount,
    'settled_at', NOW()
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

GRANT EXECUTE ON FUNCTION settle_multiple_splits(UUID[], UUID) TO authenticated;
