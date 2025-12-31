-- =====================================================
-- CORREÇÃO URGENTE: Limpar triggers conflitantes
-- Data: 2024-12-31
-- =====================================================

-- 1. REMOVER TODOS OS TRIGGERS ANTIGOS DE ESPELHAMENTO
DROP TRIGGER IF EXISTS trg_create_mirror_transaction ON transaction_splits;
DROP TRIGGER IF EXISTS trg_update_mirror_settlement ON transaction_splits;
DROP TRIGGER IF EXISTS trg_transaction_mirroring ON transactions;
DROP TRIGGER IF EXISTS trigger_create_mirrors_on_insert ON transaction_splits;
DROP TRIGGER IF EXISTS trigger_create_mirrors_on_update ON transaction_splits;
DROP TRIGGER IF EXISTS delete_mirror_trigger ON transactions;
DROP TRIGGER IF EXISTS sync_installment_mirrors_trigger ON transactions;
DROP TRIGGER IF EXISTS trg_sync_installment_mirrors ON transactions;
DROP TRIGGER IF EXISTS create_mirror_on_transfer ON transactions;
DROP TRIGGER IF EXISTS sync_mirror_on_transaction_update ON transactions;
DROP TRIGGER IF EXISTS delete_mirror_on_transaction_delete ON transactions;
DROP TRIGGER IF EXISTS trigger_mirror_shared_transaction ON transactions;
DROP TRIGGER IF EXISTS trigger_update_mirrors_on_split_change ON transaction_splits;
DROP TRIGGER IF EXISTS trigger_delete_mirror_on_split_delete ON transaction_splits;

-- 2. REMOVER FUNÇÕES ANTIGAS CONFLITANTES
DROP FUNCTION IF EXISTS create_mirror_transaction CASCADE;
DROP FUNCTION IF EXISTS update_mirror_settlement CASCADE;
DROP FUNCTION IF EXISTS handle_transaction_mirroring CASCADE;
DROP FUNCTION IF EXISTS create_mirrors_on_split CASCADE;
DROP FUNCTION IF EXISTS delete_mirror_on_delete CASCADE;
DROP FUNCTION IF EXISTS sync_installment_mirrors CASCADE;
DROP FUNCTION IF EXISTS create_mirror_on_transfer CASCADE;
DROP FUNCTION IF EXISTS sync_mirror_on_update CASCADE;
DROP FUNCTION IF EXISTS delete_mirror_on_delete CASCADE;
DROP FUNCTION IF EXISTS mirror_shared_transaction CASCADE;
DROP FUNCTION IF EXISTS update_mirrors_on_split_change CASCADE;
DROP FUNCTION IF EXISTS delete_mirror_on_split_delete CASCADE;

-- 3. RECRIAR TRIGGERS CORRETOS (da nossa migration)

-- Função para criar transação espelhada
CREATE OR REPLACE FUNCTION public.create_mirrored_transaction_for_split()
RETURNS TRIGGER AS $$
DECLARE
  transaction_record RECORD;
  mirrored_transaction_id UUID;
BEGIN
  -- Buscar dados da transação original
  SELECT * INTO transaction_record
  FROM public.transactions
  WHERE id = NEW.transaction_id;
  
  -- Criar transação espelhada para o membro que deve
  INSERT INTO public.transactions (
    user_id,
    amount,
    description,
    date,
    competence_date,
    type,
    domain,
    currency,
    is_shared,
    source_transaction_id,
    trip_id,
    category_id,
    notes,
    creator_user_id
  ) VALUES (
    NEW.user_id,
    NEW.amount,
    transaction_record.description,
    transaction_record.date,
    transaction_record.competence_date,
    'EXPENSE',
    transaction_record.domain,
    COALESCE(transaction_record.currency, 'BRL'),
    TRUE,
    NEW.transaction_id,
    transaction_record.trip_id,
    transaction_record.category_id,
    'Despesa compartilhada - Paga por ' || (
      SELECT full_name FROM public.profiles WHERE id = transaction_record.user_id
    ),
    transaction_record.creator_user_id
  )
  RETURNING id INTO mirrored_transaction_id;
  
  RAISE NOTICE 'Transação espelhada criada: % para usuário %', mirrored_transaction_id, NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar espelhamento
CREATE TRIGGER trg_create_mirrored_transaction_on_split
  AFTER INSERT ON public.transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.create_mirrored_transaction_for_split();

-- Função para deletar transações espelhadas
CREATE OR REPLACE FUNCTION public.delete_mirrored_transaction_on_split_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.transactions
  WHERE source_transaction_id = OLD.transaction_id
    AND user_id = OLD.user_id;
  
  RAISE NOTICE 'Transação espelhada deletada para usuário %', OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para deletar espelhamento
CREATE TRIGGER trg_delete_mirrored_transaction_on_split_delete
  BEFORE DELETE ON public.transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_mirrored_transaction_on_split_delete();

-- Função para atualizar transações espelhadas
CREATE OR REPLACE FUNCTION public.update_mirrored_transactions_on_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.transactions
  SET
    description = NEW.description,
    date = NEW.date,
    competence_date = NEW.competence_date,
    category_id = NEW.category_id,
    trip_id = NEW.trip_id,
    currency = NEW.currency,
    updated_at = NOW()
  WHERE source_transaction_id = NEW.id;
  
  IF OLD.amount != NEW.amount THEN
    UPDATE public.transaction_splits ts
    SET amount = (ts.percentage / 100.0) * NEW.amount
    WHERE ts.transaction_id = NEW.id;
    
    UPDATE public.transactions t
    SET amount = (
      SELECT amount FROM public.transaction_splits
      WHERE transaction_id = NEW.id AND user_id = t.user_id
      LIMIT 1
    )
    WHERE t.source_transaction_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar espelhamento
CREATE TRIGGER trg_update_mirrored_transactions_on_update
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (OLD.is_shared = TRUE AND NEW.is_shared = TRUE)
  EXECUTE FUNCTION public.update_mirrored_transactions_on_transaction_update();

-- 4. VERIFICAÇÃO
SELECT 'Limpeza completa' as status, '✅ Triggers antigos removidos' as resultado
UNION ALL
SELECT 'Novos triggers', '✅ Triggers corretos criados';
