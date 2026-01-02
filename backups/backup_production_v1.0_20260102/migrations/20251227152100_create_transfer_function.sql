-- Create RPC function for transfers between accounts
-- Data: 2024-12-27
-- Objetivo: Permitir transferências seguras entre contas do usuário

-- ============================================================================
-- 1. FUNÇÃO: transfer_between_accounts
-- ============================================================================

CREATE OR REPLACE FUNCTION transfer_between_accounts(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount DECIMAL(10,2),
  p_description TEXT DEFAULT 'Transferência',
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance DECIMAL(10,2);
  v_from_name TEXT;
  v_to_name TEXT;
  v_debit_id UUID;
  v_credit_id UUID;
  v_user_id UUID;
BEGIN
  -- Obter user_id
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Validar que não é a mesma conta
  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Não é possível transferir para a mesma conta';
  END IF;
  
  -- Validar valor
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;
  
  -- Validar que conta de origem pertence ao usuário e obter saldo
  SELECT balance, name INTO v_from_balance, v_from_name
  FROM accounts 
  WHERE id = p_from_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de origem não encontrada';
  END IF;
  
  -- Validar que conta de destino pertence ao usuário
  SELECT name INTO v_to_name
  FROM accounts 
  WHERE id = p_to_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta de destino não encontrada';
  END IF;
  
  -- Validar saldo suficiente
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;
  
  -- Criar transação de débito (saída da conta origem)
  INSERT INTO transactions (
    user_id, 
    account_id, 
    type, 
    amount, 
    description, 
    date, 
    category
  ) VALUES (
    v_user_id, 
    p_from_account_id, 
    'TRANSFER', 
    -p_amount, 
    p_description || ' → ' || v_to_name,
    p_date, 
    'Transferência'
  ) RETURNING id INTO v_debit_id;
  
  -- Criar transação de crédito (entrada na conta destino)
  INSERT INTO transactions (
    user_id, 
    account_id, 
    type, 
    amount, 
    description, 
    date, 
    category, 
    linked_transaction_id
  ) VALUES (
    v_user_id, 
    p_to_account_id, 
    'TRANSFER', 
    p_amount,
    p_description || ' ← ' || v_from_name,
    p_date, 
    'Transferência', 
    v_debit_id
  ) RETURNING id INTO v_credit_id;
  
  -- Vincular transação de débito à de crédito
  UPDATE transactions 
  SET linked_transaction_id = v_credit_id 
  WHERE id = v_debit_id;
  
  -- Atualizar saldos
  UPDATE accounts 
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = p_from_account_id;
  
  UPDATE accounts 
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = p_to_account_id;
  
  -- Retornar sucesso com IDs das transações
  RETURN json_build_object(
    'success', true,
    'debit_id', v_debit_id,
    'credit_id', v_credit_id,
    'amount', p_amount,
    'from_account', v_from_name,
    'to_account', v_to_name
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, retornar mensagem
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION transfer_between_accounts IS 
  'Transfere valor entre duas contas do usuário. Cria duas transações vinculadas (débito e crédito) e atualiza saldos atomicamente.';

-- ============================================================================
-- 2. PERMISSÕES
-- ============================================================================

-- Permitir que usuários autenticados executem a função
GRANT EXECUTE ON FUNCTION transfer_between_accounts TO authenticated;

-- ============================================================================
-- 3. VALIDAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'transfer_between_accounts'
  ) INTO v_function_exists;
  
  RAISE NOTICE '=== VALIDAÇÃO DA FUNÇÃO ===';
  RAISE NOTICE 'Função transfer_between_accounts: %', CASE WHEN v_function_exists THEN '✓' ELSE '✗' END;
  
  IF v_function_exists THEN
    RAISE NOTICE '✓ Função criada com sucesso!';
    RAISE NOTICE 'Uso: SELECT transfer_between_accounts(from_id, to_id, amount, description, date)';
  ELSE
    RAISE WARNING 'Função não foi criada corretamente';
  END IF;
END $$;
