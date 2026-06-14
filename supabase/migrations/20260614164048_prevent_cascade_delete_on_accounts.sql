-- =====================================================
-- MIGRATION: Bloquear exclusão se existirem transações
-- =====================================================

-- 1. Remover Trigger e Função de Cascade Delete
DROP TRIGGER IF EXISTS trg_cascade_delete_transactions_on_account_soft_delete ON public.accounts;
DROP FUNCTION IF EXISTS public.cascade_delete_transactions_on_account_soft_delete();

-- 2. Função de Bloqueio (Prevent Delete) para Accounts e Categories
CREATE OR REPLACE FUNCTION public.prevent_delete_if_has_transactions()
RETURNS TRIGGER AS $$
DECLARE
  tx_count INTEGER;
BEGIN
  -- Se for um soft delete (marcando deleted = TRUE) ou hard delete
  IF (TG_OP = 'UPDATE' AND NEW.deleted = TRUE AND (OLD.deleted IS NULL OR OLD.deleted = FALSE)) OR (TG_OP = 'DELETE') THEN
    
    IF TG_TABLE_NAME = 'accounts' THEN
      SELECT COUNT(*) INTO tx_count FROM public.transactions WHERE account_id = OLD.id;
      IF tx_count > 0 THEN
        RAISE EXCEPTION 'Não é possível excluir a conta. Existem % transações vinculadas. Por favor, arquive.', tx_count;
      END IF;
    ELSIF TG_TABLE_NAME = 'categories' THEN
      SELECT COUNT(*) INTO tx_count FROM public.transactions WHERE category_id = OLD.id;
      IF tx_count > 0 THEN
        RAISE EXCEPTION 'Não é possível excluir a categoria. Existem % transações vinculadas. Por favor, arquive.', tx_count;
      END IF;
    END IF;

  END IF;
  
  -- Para UPDATE retorna NEW, para DELETE retorna OLD
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Aplicar Trigger de Bloqueio nas Contas
DROP TRIGGER IF EXISTS trg_prevent_delete_account ON public.accounts;
CREATE TRIGGER trg_prevent_delete_account
  BEFORE DELETE OR UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_if_has_transactions();

-- 4. Aplicar Trigger de Bloqueio nas Categorias
DROP TRIGGER IF EXISTS trg_prevent_delete_category ON public.categories;
CREATE TRIGGER trg_prevent_delete_category
  BEFORE DELETE OR UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_if_has_transactions();

-- 5. Atualizar check_account_dependencies RPC
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
  WHERE account_id = p_account_id;
  
  -- Verificar outras pendências
  SELECT COUNT(*) INTO v_future_installments 
  FROM public.transactions 
  WHERE account_id = p_account_id AND date > CURRENT_DATE AND (installment_id IS NOT NULL OR is_recurring = TRUE);
  
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
