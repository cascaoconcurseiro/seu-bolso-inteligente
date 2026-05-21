-- =====================================================
-- MIGRATION: Fix mirror transaction display date
-- Data: 2026-01-04
-- Descrição: Garantir que transações espelho apareçam no mesmo mês que a original
-- =====================================================

-- O problema: Quando uma transação compartilhada é criada com cartão de crédito,
-- o competence_date é calculado baseado no cartão do CRIADOR.
-- Mas quando o sistema tenta exibir para outros membros, ele tenta recalcular
-- usando as contas do membro logado, que não tem acesso ao cartão do criador.

-- Solução: Garantir que transações espelho sempre copiem o competence_date correto
-- da transação original, e nunca tentem recalcular.

-- Atualizar a função de criar transação espelhada para garantir que
-- o competence_date seja sempre copiado corretamente
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
    date,                 -- Mesma data REAL
    competence_date,      -- CRÍTICO: Mesma competência (mês de exibição)
    type,                 -- Sempre EXPENSE
    domain,               -- SHARED ou TRAVEL
    currency,             -- Mesma moeda
    is_shared,            -- TRUE
    source_transaction_id,-- Link para transação original
    trip_id,              -- Mesma viagem (se houver)
    category_id,          -- Mesma categoria
    notes,                -- Nota indicando que é espelhada
    creator_user_id,      -- Quem criou a original
    account_id            -- NULL - transação espelho não tem conta associada
  ) VALUES (
    NEW.user_id,          -- Usuário que deve
    NEW.amount,           -- Valor do split
    transaction_record.description,
    transaction_record.date,
    transaction_record.competence_date, -- COPIAR o competence_date da original
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
    transaction_record.creator_user_id,
    NULL                  -- Transação espelho não tem conta
  )
  RETURNING id INTO mirrored_transaction_id;
  
  -- Log para debug
  RAISE NOTICE 'Transação espelhada criada: % para usuário % com competence_date: %', 
    mirrored_transaction_id, NEW.user_id, transaction_record.competence_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atualizar a função de atualização para garantir que competence_date seja sincronizado
CREATE OR REPLACE FUNCTION public.update_mirrored_transactions_on_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar transações espelhadas quando a original mudar
  UPDATE public.transactions
  SET
    description = NEW.description,
    date = NEW.date,
    competence_date = NEW.competence_date, -- SINCRONIZAR competence_date
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

-- Corrigir transações espelho existentes que possam estar com competence_date incorreto
-- Copiar o competence_date da transação original para todas as transações espelho
UPDATE public.transactions mirror
SET competence_date = original.competence_date
FROM public.transactions original
WHERE mirror.source_transaction_id = original.id
  AND mirror.source_transaction_id IS NOT NULL
  AND (mirror.competence_date IS NULL OR mirror.competence_date != original.competence_date);

COMMENT ON FUNCTION public.create_mirrored_transaction_for_split IS 
  'Cria transação espelhada copiando o competence_date da original para garantir exibição no mesmo mês';
COMMENT ON FUNCTION public.update_mirrored_transactions_on_transaction_update IS 
  'Sincroniza competence_date das transações espelhadas quando a original é atualizada';
