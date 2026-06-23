-- Emergency fix: Remove reference to non-existent 'deleted' column in check_account_dependencies
-- This migration ensures the function works correctly in production
CREATE OR REPLACE FUNCTION public.check_account_dependencies(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_count INTEGER;
  v_future_installments INTEGER;
  v_linked_goals INTEGER;
  v_can_delete BOOLEAN;
BEGIN
  -- Verificar transações ativas (is_active = true significa não deletado)
  SELECT COUNT(*) INTO v_transaction_count 
  FROM public.transactions 
  WHERE account_id = p_account_id
    AND is_active = true;
  
  -- Verificar parcelas futuras ou recorrentes
  SELECT COUNT(*) INTO v_future_installments 
  FROM public.transactions 
  WHERE account_id = p_account_id 
    AND is_active = true
    AND date > CURRENT_DATE 
    AND (series_id IS NOT NULL OR is_recurring = TRUE);
  
  -- Verificar metas vinculadas
  SELECT COUNT(*) INTO v_linked_goals 
  FROM public.goals 
  WHERE account_id = p_account_id;
  
  -- Determinar se pode deletar
  v_can_delete := (v_transaction_count = 0 AND v_linked_goals = 0);
  
  RETURN json_build_object(
    'can_delete', v_can_delete,
    'total_transactions', v_transaction_count,
    'future_installments', v_future_installments,
    'open_shared_expenses', 0,
    'linked_goals', v_linked_goals
  );
END;
$$;

COMMENT ON FUNCTION public.check_account_dependencies IS 'Verifica dependências de uma conta antes de deletar. Usa is_active ao invés de coluna deleted que não existe.';
