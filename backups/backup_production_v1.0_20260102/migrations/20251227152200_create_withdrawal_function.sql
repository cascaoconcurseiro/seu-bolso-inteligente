-- Create RPC function for withdrawals from accounts
-- Data: 2024-12-27
-- Objetivo: Permitir saques seguros de contas

-- ============================================================================
-- 1. FUNÇÃO: withdraw_from_account
-- ============================================================================

CREATE OR REPLACE FUNCTION withdraw_from_account(
  p_account_id UUID,
  p_amount DECIMAL(10,2),
  p_description TEXT DEFAULT 'Saque em dinheiro',
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL(10,2);
  v_account_name TEXT;
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  -- Obter user_id
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Validar valor
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;
  
  -- Validar que conta pertence ao usuário e obter saldo
  SELECT balance, name INTO v_balance, v_account_name
  FROM accounts 
  WHERE id = p_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta não encontrada';
  END IF;
  
  -- Validar saldo suficiente
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente para saque';
  END IF;
  
  -- Criar transação de saque
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
    p_account_id, 
    'WITHDRAWAL', 
    -p_amount, 
    p_description,
    p_date, 
    'Saque'
  ) RETURNING id INTO v_transaction_id;
  
  -- Atualizar saldo
  UPDATE accounts 
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = p_account_id;
  
  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount', p_amount,
    'account', v_account_name,
    'new_balance', v_balance - p_amount
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

COMMENT ON FUNCTION withdraw_from_account IS 
  'Realiza saque de uma conta. Cria transação de saque e atualiza saldo atomicamente.';

-- ============================================================================
-- 2. PERMISSÕES
-- ============================================================================

-- Permitir que usuários autenticados executem a função
GRANT EXECUTE ON FUNCTION withdraw_from_account TO authenticated;

-- ============================================================================
-- 3. VALIDAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'withdraw_from_account'
  ) INTO v_function_exists;
  
  RAISE NOTICE '=== VALIDAÇÃO DA FUNÇÃO ===';
  RAISE NOTICE 'Função withdraw_from_account: %', CASE WHEN v_function_exists THEN '✓' ELSE '✗' END;
  
  IF v_function_exists THEN
    RAISE NOTICE '✓ Função criada com sucesso!';
    RAISE NOTICE 'Uso: SELECT withdraw_from_account(account_id, amount, description, date)';
  ELSE
    RAISE WARNING 'Função não foi criada corretamente';
  END IF;
END $$;
