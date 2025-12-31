-- =====================================================
-- MIGRATION: Sistema de Espelhamento de Transações
-- Data: 2024-12-31
-- Descrição: Cria transações espelhadas para membros que devem
-- =====================================================

-- 1. FUNÇÃO PARA CRIAR TRANSAÇÃO ESPELHADA
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
    user_id,              -- Quem DEVE (não quem pagou)
    amount,               -- Valor que essa pessoa deve
    description,          -- Mesma descrição
    date,                 -- Mesma data
    competence_date,      -- Mesma competência
    type,                 -- Sempre EXPENSE
    domain,               -- SHARED ou TRAVEL
    currency,             -- Mesma moeda
    is_shared,            -- TRUE
    source_transaction_id,-- Link para transação original
    trip_id,              -- Mesma viagem (se houver)
    category_id,          -- Mesma categoria
    notes,                -- Nota indicando que é espelhada
    creator_user_id       -- Quem criou a original
  ) VALUES (
    NEW.user_id,          -- Usuário que deve
    NEW.amount,           -- Valor do split
    transaction_record.description,
    transaction_record.date,
    transaction_record.competence_date,
    'EXPENSE',
    transaction_record.domain,
    COALESCE(transaction_record.currency, 'BRL'),
    TRUE,
    NEW.transaction_id,   -- Referência à original
    transaction_record.trip_id,
    transaction_record.category_id,
    'Despesa compartilhada - Paga por ' || (
      SELECT full_name FROM public.profiles WHERE id = transaction_record.user_id
    ),
    transaction_record.creator_user_id
  )
  RETURNING id INTO mirrored_transaction_id;
  
  -- Log para debug
  RAISE NOTICE 'Transação espelhada criada: % para usuário %', mirrored_transaction_id, NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. TRIGGER PARA CRIAR ESPELHAMENTO AO CRIAR SPLIT
CREATE TRIGGER trg_create_mirrored_transaction_on_split
  AFTER INSERT ON public.transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.create_mirrored_transaction_for_split();

-- 3. FUNÇÃO PARA DELETAR TRANSAÇÕES ESPELHADAS AO DELETAR SPLIT
CREATE OR REPLACE FUNCTION public.delete_mirrored_transaction_on_split_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Deletar transação espelhada associada
  DELETE FROM public.transactions
  WHERE source_transaction_id = OLD.transaction_id
    AND user_id = OLD.user_id;
  
  RAISE NOTICE 'Transação espelhada deletada para usuário %', OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. TRIGGER PARA DELETAR ESPELHAMENTO AO DELETAR SPLIT
CREATE TRIGGER trg_delete_mirrored_transaction_on_split_delete
  BEFORE DELETE ON public.transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_mirrored_transaction_on_split_delete();

-- 5. FUNÇÃO PARA ATUALIZAR TRANSAÇÕES ESPELHADAS AO ATUALIZAR ORIGINAL
CREATE OR REPLACE FUNCTION public.update_mirrored_transactions_on_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar transações espelhadas quando a original mudar
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
  
  -- Atualizar valores dos splits se o valor total mudou
  IF OLD.amount != NEW.amount THEN
    -- Recalcular proporcionalmente
    UPDATE public.transaction_splits ts
    SET amount = (ts.percentage / 100.0) * NEW.amount
    WHERE ts.transaction_id = NEW.id;
    
    -- Atualizar valores das transações espelhadas
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

-- 6. TRIGGER PARA ATUALIZAR ESPELHAMENTO AO ATUALIZAR TRANSAÇÃO
CREATE TRIGGER trg_update_mirrored_transactions_on_update
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (OLD.is_shared = TRUE AND NEW.is_shared = TRUE)
  EXECUTE FUNCTION public.update_mirrored_transactions_on_transaction_update();

-- 7. VIEW PARA FACILITAR CONSULTA DE TRANSAÇÕES COMPARTILHADAS
CREATE OR REPLACE VIEW public.shared_transactions_view AS
SELECT 
  t.id,
  t.user_id,
  t.amount,
  t.description,
  t.date,
  t.type,
  t.domain,
  t.is_shared,
  t.source_transaction_id,
  t.trip_id,
  t.category_id,
  t.currency,
  t.created_at,
  -- Informações do pagador (se for espelhada)
  CASE 
    WHEN t.source_transaction_id IS NOT NULL THEN (
      SELECT user_id FROM public.transactions WHERE id = t.source_transaction_id
    )
    ELSE t.user_id
  END AS payer_user_id,
  -- Informações dos splits
  (
    SELECT json_agg(json_build_object(
      'member_id', ts.member_id,
      'user_id', ts.user_id,
      'name', ts.name,
      'amount', ts.amount,
      'percentage', ts.percentage,
      'is_settled', ts.is_settled
    ))
    FROM public.transaction_splits ts
    WHERE ts.transaction_id = COALESCE(t.source_transaction_id, t.id)
  ) AS splits,
  -- Flag indicando se é espelhada
  t.source_transaction_id IS NOT NULL AS is_mirrored
FROM public.transactions t
WHERE t.is_shared = TRUE;

-- 8. GRANT PERMISSIONS NA VIEW
GRANT SELECT ON public.shared_transactions_view TO authenticated;

-- 9. RLS POLICY PARA A VIEW
ALTER VIEW public.shared_transactions_view SET (security_invoker = true);

-- 10. COMENTÁRIOS
COMMENT ON FUNCTION public.create_mirrored_transaction_for_split IS 
  'Cria transação espelhada para membro que deve quando split é criado';
COMMENT ON FUNCTION public.delete_mirrored_transaction_on_split_delete IS 
  'Remove transação espelhada quando split é deletado';
COMMENT ON FUNCTION public.update_mirrored_transactions_on_transaction_update IS 
  'Atualiza transações espelhadas quando transação original é modificada';
COMMENT ON VIEW public.shared_transactions_view IS 
  'View consolidada de transações compartilhadas com informações de splits';

