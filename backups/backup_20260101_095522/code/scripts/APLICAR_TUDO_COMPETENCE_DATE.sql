-- =====================================================
-- APLICAÇÃO COMPLETA: FIX COMPETENCE DATE
-- =====================================================
-- 
-- Execute este script no Supabase SQL Editor
-- Todas as mensagens aparecerão na aba "Messages"
-- 
-- =====================================================

-- =====================================================
-- PARTE 1: ADICIONAR CAMPO DE COMPETÊNCIA
-- =====================================================

-- 1. Adicionar coluna
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'competence_date'
  ) THEN
    ALTER TABLE public.transactions 
    ADD COLUMN competence_date DATE;
    RAISE NOTICE '✅ Campo competence_date adicionado';
  ELSE
    RAISE NOTICE '⚠️  Campo competence_date já existe';
  END IF;
END $$;

-- 2. Popular campo para transações existentes
DO $$
BEGIN
  UPDATE public.transactions
  SET competence_date = DATE_TRUNC('month', date)::DATE
  WHERE competence_date IS NULL;
  
  RAISE NOTICE '✅ Dados existentes populados';
END $$;

-- 3. Tornar campo obrigatório
DO $$
BEGIN
  ALTER TABLE public.transactions 
  ALTER COLUMN competence_date SET NOT NULL;
  
  RAISE NOTICE '✅ Campo definido como NOT NULL';
END $$;

-- 4. Criar índice para performance
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_transactions_competence_date 
  ON public.transactions(user_id, competence_date);
  
  RAISE NOTICE '✅ Índice criado';
END $$;

-- 5. Adicionar constraint de unicidade para parcelas
DO $$
BEGIN
  DROP INDEX IF EXISTS idx_unique_installment_per_series;
  CREATE UNIQUE INDEX idx_unique_installment_per_series
  ON public.transactions(series_id, current_installment)
  WHERE series_id IS NOT NULL AND is_installment = TRUE;
  
  RAISE NOTICE '✅ Constraint de unicidade criada';
END $$;

-- 6. Adicionar comentários
DO $$
BEGIN
  COMMENT ON COLUMN public.transactions.competence_date IS 
  'Data de competência (sempre 1º dia do mês). Usado para filtrar transações por mês, especialmente parcelas.';

  COMMENT ON INDEX idx_unique_installment_per_series IS
  'Garante que não existam parcelas duplicadas na mesma série (idempotência).';
  
  RAISE NOTICE '✅ Comentários adicionados';
END $$;

-- =====================================================
-- PARTE 2: CRIAR FUNÇÃO DE VALIDAÇÃO
-- =====================================================

DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.validate_competence_date()
  RETURNS TRIGGER AS $func$
  BEGIN
    -- Garantir que competence_date seja sempre o primeiro dia do mês
    IF NEW.competence_date IS NOT NULL THEN
      NEW.competence_date := DATE_TRUNC('month', NEW.competence_date)::DATE;
    ELSE
      -- Se não fornecido, usar o mês da data da transação
      NEW.competence_date := DATE_TRUNC('month', NEW.date)::DATE;
    END IF;
    
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
  
  RAISE NOTICE '✅ Função de validação criada';
END $$;

-- =====================================================
-- PARTE 3: CRIAR TRIGGER
-- =====================================================

DO $$
BEGIN
  DROP TRIGGER IF EXISTS ensure_competence_date ON public.transactions;
  CREATE TRIGGER ensure_competence_date
    BEFORE INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_competence_date();
  
  RAISE NOTICE '✅ Trigger criado';
END $$;

-- =====================================================
-- PARTE 4: ATUALIZAR FUNÇÃO DE ESPELHAMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION handle_transaction_mirroring()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_split RECORD;
  v_mirror_id UUID;
  v_payer_name TEXT;
  v_target_user_id UUID;
BEGIN
  -- Anti-loop
  IF TG_OP <> 'DELETE' AND NEW.source_transaction_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- DELETE: Apagar espelhos
  IF TG_OP = 'DELETE' THEN
    DELETE FROM transactions WHERE source_transaction_id = OLD.id;
    DELETE FROM shared_transaction_mirrors WHERE original_transaction_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Verificar se é compartilhada
  IF NEW.is_shared IS DISTINCT FROM TRUE THEN
    RETURN NEW;
  END IF;

  -- UPDATE: Sincronizar espelhos existentes
  IF TG_OP = 'UPDATE' THEN
    UPDATE transactions
    SET
      description = NEW.description,
      date = NEW.date,
      competence_date = NEW.competence_date,
      type = NEW.type,
      trip_id = NEW.trip_id,
      updated_at = NOW()
    WHERE source_transaction_id = NEW.id;
  END IF;

  -- Buscar nome do pagador
  SELECT COALESCE(full_name, email, 'Outro') INTO v_payer_name
  FROM profiles WHERE id = NEW.user_id;

  -- Para cada split
  FOR v_split IN
    SELECT 
      ts.*,
      fm.user_id as member_user_id,
      fm.linked_user_id as member_linked_user_id,
      fm.name as member_name
    FROM transaction_splits ts
    INNER JOIN family_members fm ON fm.id = ts.member_id
    WHERE ts.transaction_id = NEW.id
  LOOP
    -- Escolher o user_id que NÃO é o criador
    IF NEW.user_id = v_split.member_user_id THEN
      v_target_user_id := v_split.member_linked_user_id;
    ELSIF NEW.user_id = v_split.member_linked_user_id THEN
      v_target_user_id := v_split.member_user_id;
    ELSE
      v_target_user_id := COALESCE(v_split.member_user_id, v_split.member_linked_user_id);
    END IF;
    
    -- Só criar espelho se temos um target válido e diferente do criador
    IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
      
      -- Verificar se já existe espelho
      SELECT id INTO v_mirror_id
      FROM transactions
      WHERE source_transaction_id = NEW.id AND user_id = v_target_user_id;
      
      IF v_mirror_id IS NULL THEN
        v_mirror_id := gen_random_uuid();
        
        INSERT INTO transactions (
          id, user_id, amount, description, date, competence_date, type,
          account_id, category_id, trip_id, is_shared, payer_id,
          source_transaction_id, domain, sync_status, created_at, updated_at
        ) VALUES (
          v_mirror_id, v_target_user_id, v_split.amount,
          NEW.description || ' (Compartilhado por ' || v_payer_name || ')',
          NEW.date, NEW.competence_date, NEW.type, NULL, NULL, NEW.trip_id,
          TRUE, NULL, NEW.id, COALESCE(NEW.domain, 'SHARED'), 'SYNCED', NOW(), NOW()
        );
        
        INSERT INTO shared_transaction_mirrors (
          original_transaction_id, mirror_transaction_id, mirror_user_id,
          sync_status, last_sync_at
        ) VALUES (
          NEW.id, v_mirror_id, v_target_user_id, 'SYNCED', NOW()
        )
        ON CONFLICT (original_transaction_id, mirror_user_id) 
        DO UPDATE SET
          mirror_transaction_id = EXCLUDED.mirror_transaction_id,
          sync_status = 'SYNCED',
          last_sync_at = NOW(),
          updated_at = NOW();
      ELSE
        -- Atualizar espelho existente
        UPDATE transactions
        SET
          amount = v_split.amount,
          description = NEW.description || ' (Compartilhado por ' || v_payer_name || ')',
          date = NEW.date,
          competence_date = NEW.competence_date,
          type = NEW.type,
          trip_id = NEW.trip_id,
          updated_at = NOW()
        WHERE id = v_mirror_id;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$func$;

DO $$
BEGIN
  RAISE NOTICE '✅ Função de espelhamento atualizada';
END $$;

-- =====================================================
-- PARTE 5: VERIFICAÇÃO
-- =====================================================

-- Verificar campo
DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'competence_date'
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    RAISE NOTICE '✅ Campo competence_date: OK';
  ELSE
    RAISE EXCEPTION '❌ Campo competence_date: FALHOU';
  END IF;
END $$;

-- Verificar índice
DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'transactions' AND indexname = 'idx_transactions_competence_date'
  ) INTO v_index_exists;
  
  IF v_index_exists THEN
    RAISE NOTICE '✅ Índice idx_transactions_competence_date: OK';
  ELSE
    RAISE EXCEPTION '❌ Índice idx_transactions_competence_date: FALHOU';
  END IF;
END $$;

-- Verificar constraint
DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'transactions' AND indexname = 'idx_unique_installment_per_series'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE '✅ Constraint idx_unique_installment_per_series: OK';
  ELSE
    RAISE EXCEPTION '❌ Constraint idx_unique_installment_per_series: FALHOU';
  END IF;
END $$;

-- Verificar trigger
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'transactions' AND trigger_name = 'ensure_competence_date'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Trigger ensure_competence_date: OK';
  ELSE
    RAISE EXCEPTION '❌ Trigger ensure_competence_date: FALHOU';
  END IF;
END $$;

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ APLICAÇÃO COMPLETA COM SUCESSO!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumo:';
  RAISE NOTICE '  ✅ Campo competence_date criado e populado';
  RAISE NOTICE '  ✅ Índice de performance criado';
  RAISE NOTICE '  ✅ Constraint de unicidade ativa';
  RAISE NOTICE '  ✅ Trigger de validação funcionando';
  RAISE NOTICE '  ✅ Função de espelhamento atualizada';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '  1. Reiniciar o frontend (npm run dev)';
  RAISE NOTICE '  2. Testar criação de parcelas';
  RAISE NOTICE '  3. Verificar navegação entre meses';
  RAISE NOTICE '';
END $$;
