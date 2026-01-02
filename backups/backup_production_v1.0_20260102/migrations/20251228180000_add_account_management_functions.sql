-- Função para recalcular saldos de TODAS as contas do usuário
CREATE OR REPLACE FUNCTION recalculate_all_balances(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_account RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_account IN 
    SELECT id FROM accounts WHERE user_id = p_user_id AND is_active = true
  LOOP
    PERFORM recalculate_account_balance(v_account.id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atribuir conta padrão a transações órfãs
CREATE OR REPLACE FUNCTION assign_default_account_to_orphans(
  p_user_id UUID,
  p_default_account_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_my_member_id UUID;
BEGIN
  -- Buscar o member_id do próprio usuário
  SELECT id INTO v_my_member_id 
  FROM family_members 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  -- Atualizar transações órfãs (sem account_id)
  -- Excluir transferências e transações pagas por outros
  UPDATE transactions
  SET account_id = p_default_account_id,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND account_id IS NULL
    AND type != 'TRANSFERÊNCIA'
    AND (payer_id IS NULL OR payer_id = v_my_member_id OR payer_id = 'me')
    AND deleted = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Recalcular saldo da conta que recebeu as transações
  PERFORM recalculate_account_balance(p_default_account_id);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para migrar transações de uma conta para outra
CREATE OR REPLACE FUNCTION migrate_transactions_to_account(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Migrar transações onde account_id é a conta origem
  UPDATE transactions
  SET account_id = p_to_account_id,
      updated_at = NOW()
  WHERE account_id = p_from_account_id
    AND user_id = p_user_id
    AND deleted = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Migrar transações onde destination_account_id é a conta origem (transferências)
  UPDATE transactions
  SET destination_account_id = p_to_account_id,
      updated_at = NOW()
  WHERE destination_account_id = p_from_account_id
    AND user_id = p_user_id
    AND deleted = false;
  
  -- Recalcular saldos de ambas as contas
  PERFORM recalculate_account_balance(p_from_account_id);
  PERFORM recalculate_account_balance(p_to_account_id);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se conta pode ser excluída
CREATE OR REPLACE FUNCTION check_account_can_be_deleted(p_account_id UUID)
RETURNS TABLE(can_delete BOOLEAN, reason TEXT, transaction_count INTEGER, balance NUMERIC) AS $$
DECLARE
  v_balance NUMERIC;
  v_tx_count INTEGER;
BEGIN
  -- Buscar saldo atual
  SELECT accounts.balance INTO v_balance
  FROM accounts WHERE id = p_account_id;
  
  -- Contar transações vinculadas
  SELECT COUNT(*) INTO v_tx_count
  FROM transactions
  WHERE (account_id = p_account_id OR destination_account_id = p_account_id)
    AND deleted = false;
  
  -- Verificar se pode excluir
  IF v_balance != 0 THEN
    RETURN QUERY SELECT false, 'Conta possui saldo diferente de zero'::TEXT, v_tx_count, v_balance;
  ELSIF v_tx_count > 0 THEN
    RETURN QUERY SELECT false, 'Conta possui transações vinculadas'::TEXT, v_tx_count, v_balance;
  ELSE
    RETURN QUERY SELECT true, 'Conta pode ser excluída'::TEXT, v_tx_count, v_balance;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
