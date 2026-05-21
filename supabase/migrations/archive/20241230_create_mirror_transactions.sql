-- =====================================================
-- CORREÇÃO CRÍTICA: ESPELHAMENTO DE TRANSAÇÕES COMPARTILHADAS
-- =====================================================
-- Data: 30/12/2024
-- Objetivo: Criar transações espelhadas automaticamente quando splits são criados
-- Isso permite que membros vejam as despesas que devem

-- Função para criar transações espelhadas
CREATE OR REPLACE FUNCTION create_mirror_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  original_tx RECORD;
  mirror_exists BOOLEAN;
BEGIN
  -- Buscar dados da transação original
  SELECT * INTO original_tx
  FROM transactions
  WHERE id = NEW.transaction_id;
  
  -- Verificar se já existe transação espelhada para este split
  SELECT EXISTS (
    SELECT 1 FROM transactions
    WHERE source_transaction_id = NEW.transaction_id
      AND user_id = NEW.user_id
  ) INTO mirror_exists;
  
  -- Se já existe, não criar duplicata
  IF mirror_exists THEN
    RAISE NOTICE 'Transação espelhada já existe para split %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Criar transação espelhada (débito para quem deve)
  INSERT INTO transactions (
    user_id,              -- Quem DEVE (membro do split)
    amount,               -- Valor que deve
    description,          -- Mesma descrição
    date,                 -- Mesma data
    competence_date,      -- Mesma competência
    type,                 -- Sempre EXPENSE (débito)
    domain,               -- Mesmo domínio (SHARED ou TRAVEL)
    is_shared,            -- TRUE
    source_transaction_id,-- ID da transação original
    trip_id,              -- Mesma viagem (se houver)
    currency,             -- Mesma moeda
    is_settled,           -- Mesmo status de acerto
    creator_user_id,      -- Quem criou a original
    payer_id,             -- Quem pagou (member_id do criador)
    account_id            -- NULL (não tem conta, é débito)
  ) VALUES (
    NEW.user_id,
    NEW.amount,
    original_tx.description,
    original_tx.date,
    original_tx.competence_date,
    'EXPENSE',
    original_tx.domain,
    true,
    original_tx.id,
    original_tx.trip_id,
    original_tx.currency,
    NEW.is_settled,
    original_tx.creator_user_id,
    original_tx.payer_id,
    NULL
  );
  
  RAISE NOTICE 'Transação espelhada criada para split % (user: %)', NEW.id, NEW.user_id;
  
  RETURN NEW;
END;
$;

-- Criar trigger que executa APÓS inserir split
DROP TRIGGER IF EXISTS trg_create_mirror_transaction ON transaction_splits;
CREATE TRIGGER trg_create_mirror_transaction
  AFTER INSERT ON transaction_splits
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL) -- Só criar se user_id estiver preenchido
  EXECUTE FUNCTION create_mirror_transaction();

-- Função para atualizar transação espelhada quando split é acertado
CREATE OR REPLACE FUNCTION update_mirror_transaction_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  -- Se split foi marcado como acertado, atualizar transação espelhada
  IF NEW.is_settled = true AND OLD.is_settled = false THEN
    UPDATE transactions
    SET is_settled = true,
        settled_at = NEW.settled_at
    WHERE source_transaction_id = NEW.transaction_id
      AND user_id = NEW.user_id;
    
    RAISE NOTICE 'Transação espelhada marcada como acertada para split %', NEW.id;
  END IF;
  
  -- Se split foi desmarcado, atualizar transação espelhada
  IF NEW.is_settled = false AND OLD.is_settled = true THEN
    UPDATE transactions
    SET is_settled = false,
        settled_at = NULL
    WHERE source_transaction_id = NEW.transaction_id
      AND user_id = NEW.user_id;
    
    RAISE NOTICE 'Transação espelhada desmarcada para split %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$;

-- Criar trigger para atualizar espelhamento quando split é acertado
DROP TRIGGER IF EXISTS trg_update_mirror_settlement ON transaction_splits;
CREATE TRIGGER trg_update_mirror_settlement
  AFTER UPDATE ON transaction_splits
  FOR EACH ROW
  WHEN (NEW.is_settled IS DISTINCT FROM OLD.is_settled)
  EXECUTE FUNCTION update_mirror_transaction_settlement();

-- Criar transações espelhadas para splits existentes que não têm
DO $
DECLARE
  split_record RECORD;
  original_tx RECORD;
  mirror_exists BOOLEAN;
BEGIN
  FOR split_record IN 
    SELECT * FROM transaction_splits 
    WHERE user_id IS NOT NULL
  LOOP
    -- Verificar se já existe espelhamento
    SELECT EXISTS (
      SELECT 1 FROM transactions
      WHERE source_transaction_id = split_record.transaction_id
        AND user_id = split_record.user_id
    ) INTO mirror_exists;
    
    IF NOT mirror_exists THEN
      -- Buscar transação original
      SELECT * INTO original_tx
      FROM transactions
      WHERE id = split_record.transaction_id;
      
      IF FOUND THEN
        -- Criar transação espelhada
        INSERT INTO transactions (
          user_id,
          amount,
          description,
          date,
          competence_date,
          type,
          domain,
          is_shared,
          source_transaction_id,
          trip_id,
          currency,
          is_settled,
          creator_user_id,
          payer_id,
          account_id
        ) VALUES (
          split_record.user_id,
          split_record.amount,
          original_tx.description,
          original_tx.date,
          original_tx.competence_date,
          'EXPENSE',
          original_tx.domain,
          true,
          original_tx.id,
          original_tx.trip_id,
          original_tx.currency,
          split_record.is_settled,
          original_tx.creator_user_id,
          original_tx.payer_id,
          NULL
        );
        
        RAISE NOTICE 'Transação espelhada criada retroativamente para split %', split_record.id;
      END IF;
    END IF;
  END LOOP;
END $;

-- Validação
DO $
DECLARE
  v_splits_count INTEGER;
  v_mirrors_count INTEGER;
BEGIN
  -- Contar splits com user_id
  SELECT COUNT(*) INTO v_splits_count
  FROM transaction_splits
  WHERE user_id IS NOT NULL;
  
  -- Contar transações espelhadas
  SELECT COUNT(*) INTO v_mirrors_count
  FROM transactions
  WHERE source_transaction_id IS NOT NULL;
  
  RAISE NOTICE '=== VALIDAÇÃO ===';
  RAISE NOTICE 'Splits com user_id: %', v_splits_count;
  RAISE NOTICE 'Transações espelhadas: %', v_mirrors_count;
  
  IF v_mirrors_count >= v_splits_count THEN
    RAISE NOTICE '✅ ESPELHAMENTO IMPLEMENTADO COM SUCESSO!';
  ELSE
    RAISE WARNING '⚠️  Algumas transações espelhadas podem estar faltando';
  END IF;
END $;
