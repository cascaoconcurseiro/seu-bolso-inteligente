-- Fix check_account_dependencies RPC to use group_id instead of installment_id
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
  -- Verificar transações
  SELECT COUNT(*) INTO v_transaction_count 
  FROM public.transactions 
  WHERE account_id = p_account_id AND (deleted = FALSE OR deleted IS NULL);
  
  -- Verificar outras pendências (usando series_id em vez do antigo installment_id)
  SELECT COUNT(*) INTO v_future_installments 
  FROM public.transactions 
  WHERE account_id = p_account_id 
    AND date > CURRENT_DATE 
    AND (deleted = FALSE OR deleted IS NULL)
    AND (series_id IS NOT NULL OR is_recurring = TRUE);
  
  SELECT COUNT(*) INTO v_linked_goals 
  FROM public.goals 
  WHERE account_id = p_account_id;
  
  -- O bloqueio principal é o transaction_count. Se tem >0, já não pode excluir.
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
