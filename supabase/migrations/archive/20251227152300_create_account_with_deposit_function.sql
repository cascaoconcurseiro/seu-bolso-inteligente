-- Create RPC function for account creation with initial deposit
-- Data: 2024-12-27
-- Objetivo: Criar conta e registrar depósito inicial automaticamente

-- ============================================================================
-- 1. FUNÇÃO: create_account_with_initial_deposit
-- ============================================================================

CREATE OR REPLACE FUNCTION create_account_with_initial_deposit(
  p_name TEXT,
  p_type TEXT,
  p_bank TEXT,
  p_initial_balance DECIMAL(10,2) DEFAULT 0,
  p_currency TEXT DEFAULT 'BRL'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_transaction_id UUID;
  v_user_id UUID;
BEGIN
  -- Obter user_id
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Validar saldo inicial não negativo
  IF p_initial_balance < 0 THEN
    RAISE EXCEPTION 'Saldo inicial não pode ser negativo';
  END IF;
  
  -- Criar conta
  INSERT INTO accounts (
    user_id, 
    name, 
    type, 
    bank, 
    balance, 
    currency
  ) VALUES (
    v_user_id, 
    p_name, 
    p_type, 
    p_bank, 
    p_initial_balance, 
    p_currency
  ) RETURNING id INTO v_account_id;
  
  -- Se saldo inicial > 0, criar transação de depósito inicial
  IF p_initial_balance > 0 THEN
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
      v_account_id, 
      'DEPOSIT', 
      p_initial_balance, 
      'Depósito inicial', 
      CURRENT_DATE, 
      'Depósito'
    ) RETURNING id INTO v_transaction_id;
  END IF;
  
  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'account_id', v_account_id,
    'initial_balance', p_initial_balance,
    'deposit_transaction_id', v_transaction_id,
    'has_initial_deposit', p_initial_balance > 0
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

COMMENT ON FUNCTION create_account_with_initial_deposit IS 
  'Cria uma conta com saldo inicial. Se saldo > 0, cria automaticamente transação de depósito inicial.';

-- ============================================================================
-- 2. PERMISSÕES
-- ============================================================================

-- Permitir que usuários autenticados executem a função
GRANT EXECUTE ON FUNCTION create_account_with_initial_deposit TO authenticated;

-- ============================================================================
-- 3. VALIDAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_account_with_initial_deposit'
  ) INTO v_function_exists;
  
  RAISE NOTICE '=== VALIDAÇÃO DA FUNÇÃO ===';
  RAISE NOTICE 'Função create_account_with_initial_deposit: %', CASE WHEN v_function_exists THEN '✓' ELSE '✗' END;
  
  IF v_function_exists THEN
    RAISE NOTICE '✓ Função criada com sucesso!';
    RAISE NOTICE 'Uso: SELECT create_account_with_initial_deposit(name, type, bank, initial_balance, currency)';
  ELSE
    RAISE WARNING 'Função não foi criada corretamente';
  END IF;
END $$;
