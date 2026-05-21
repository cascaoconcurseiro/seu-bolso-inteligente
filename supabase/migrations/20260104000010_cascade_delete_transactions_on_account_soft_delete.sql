-- =====================================================
-- MIGRATION: Cascade delete transactions on account soft delete
-- Data: 2026-01-04
-- Descrição: Deletar transações quando conta é marcada como deletada
-- =====================================================

-- Criar função para deletar transações quando conta é soft deleted
CREATE OR REPLACE FUNCTION public.cascade_delete_transactions_on_account_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a conta foi marcada como deletada, deletar todas as transações associadas
  IF NEW.deleted = TRUE AND (OLD.deleted IS NULL OR OLD.deleted = FALSE) THEN
    DELETE FROM public.transactions
    WHERE account_id = NEW.id;
    
    RAISE NOTICE 'Transações deletadas para conta: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_cascade_delete_transactions_on_account_soft_delete ON public.accounts;
CREATE TRIGGER trg_cascade_delete_transactions_on_account_soft_delete
  AFTER UPDATE ON public.accounts
  FOR EACH ROW
  WHEN (NEW.deleted = TRUE AND (OLD.deleted IS NULL OR OLD.deleted = FALSE))
  EXECUTE FUNCTION public.cascade_delete_transactions_on_account_soft_delete();

-- Limpar transações órfãs existentes (contas já deletadas)
DELETE FROM public.transactions
WHERE account_id IN (
  SELECT id FROM public.accounts WHERE deleted = TRUE
);

COMMENT ON FUNCTION public.cascade_delete_transactions_on_account_soft_delete IS 
  'Deleta automaticamente todas as transações quando uma conta é marcada como deletada (soft delete)';
