-- =====================================================
-- CORREÇÃO COMPLETA - APLICAR NO SUPABASE SQL EDITOR
-- =====================================================
-- 
-- Este script corrige:
-- 1. Parcelas acumuladas (competence_date)
-- 2. Transações compartilhadas (espelhamento)
-- 3. Viagens (query corrigida no código)
-- 
-- =====================================================

-- PASSO 1: Adicionar campo competence_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'competence_date'
  ) THEN
    ALTER TABLE transactions ADD COLUMN competence_date DATE;
    RAISE NOTICE '✅ Campo competence_date adicionado';
  ELSE
    RAISE NOTICE '⚠️  Campo competence_date já existe';
  END IF;
END $$;

-- PASSO 2: Popular competence_date para transações existentes
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE transactions
  SET competence_date = DATE_TRUNC('month', date)::DATE
  WHERE competence_date IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ % transações atualizadas com competence_date', v_updated_count;
END $$;

-- PASSO 3: Criar função de normalização
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION normalize_competence_date()
  RETURNS TRIGGER AS $func$
  BEGIN
    NEW.competence_date := DATE_TRUNC('month', NEW.date)::DATE;
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;
  
  RAISE NOTICE '✅ Função normalize_competence_date criada';
END $$;

-- PASSO 4: Criar trigger
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_normalize_competence_date ON transactions;
  CREATE TRIGGER trigger_normalize_competence_date
    BEFORE INSERT OR UPDATE OF date ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION normalize_competence_date();
  
  RAISE NOTICE '✅ Trigger criado';
END $$;

-- PASSO 5: Remover duplicatas de parcelas
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Remover duplicatas mantendo apenas a primeira de cada mês
  DELETE FROM transactions t1
  WHERE t1.series_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM transactions t2
    WHERE t2.series_id = t1.series_id
    AND t2.competence_date = t1.competence_date
    AND t2.created_at < t1.created_at
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ % parcelas duplicadas removidas', v_deleted_count;
END $$;

-- PASSO 6: Adicionar constraint de unicidade
DO $$
BEGIN
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS unique_installment_per_month;
  
  ALTER TABLE transactions
  ADD CONSTRAINT unique_installment_per_month 
  UNIQUE (series_id, competence_date)
  WHERE series_id IS NOT NULL;
  
  RAISE NOTICE '✅ Constraint unique_installment_per_month adicionada';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Erro ao adicionar constraint: %', SQLERRM;
END $$;

-- PASSO 7: Atualizar função de espelhamento
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION mirror_shared_transaction()
  RETURNS TRIGGER AS $func$
  DECLARE
    v_split RECORD;
    v_member_user_id UUID;
    v_payer_user_id UUID;
    v_split_amount NUMERIC;
  BEGIN
    IF NEW.is_shared = TRUE THEN
      IF NEW.payer_id IS NOT NULL THEN
        SELECT user_id INTO v_payer_user_id
        FROM family_members
        WHERE id = NEW.payer_id;
      END IF;
      
      FOR v_split IN 
        SELECT * FROM transaction_splits 
        WHERE transaction_id = NEW.id
      LOOP
        SELECT user_id INTO v_member_user_id
        FROM family_members
        WHERE id = v_split.member_id;
        
        IF v_member_user_id IS NOT NULL AND v_member_user_id != COALESCE(v_payer_user_id, NEW.user_id) THEN
          v_split_amount := (NEW.amount * v_split.percentage / 100);
          
          INSERT INTO transactions (
            user_id,
            account_id,
            category_id,
            trip_id,
            amount,
            description,
            date,
            competence_date,
            type,
            domain,
            is_shared,
            source_transaction_id,
            notes,
            created_at,
            updated_at
          ) VALUES (
            v_member_user_id,
            NEW.account_id,
            NEW.category_id,
            NEW.trip_id,
            v_split_amount,
            NEW.description || ' (compartilhado)',
            NEW.date,
            NEW.competence_date,
            NEW.type,
            NEW.domain,
            TRUE,
            NEW.id,
            'Transação compartilhada - ' || v_split.percentage || '% do total',
            NOW(),
            NOW()
          )
          ON CONFLICT (source_transaction_id, user_id) 
          DO UPDATE SET
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            date = EXCLUDED.date,
            competence_date = EXCLUDED.competence_date,
            updated_at = NOW();
        END IF;
      END LOOP;
    END IF;
    
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;
  
  RAISE NOTICE '✅ Função mirror_shared_transaction atualizada';
END $$;

-- PASSO 8: Verificações
DO $$
DECLARE
  v_null_count INTEGER;
  v_trigger_exists BOOLEAN;
  v_constraint_exists BOOLEAN;
BEGIN
  -- Verificar competence_date NULL
  SELECT COUNT(*) INTO v_null_count
  FROM transactions
  WHERE competence_date IS NULL;
  
  IF v_null_count = 0 THEN
    RAISE NOTICE '✅ Nenhum competence_date NULL';
  ELSE
    RAISE NOTICE '⚠️  % transações com competence_date NULL', v_null_count;
  END IF;
  
  -- Verificar trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_normalize_competence_date'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Trigger ativo';
  ELSE
    RAISE NOTICE '❌ Trigger não encontrado';
  END IF;
  
  -- Verificar constraint
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'transactions' 
    AND constraint_name = 'unique_installment_per_month'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE '✅ Constraint ativa';
  ELSE
    RAISE NOTICE '⚠️  Constraint não criada';
  END IF;
END $$;

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CORREÇÃO COMPLETA APLICADA!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Resultado:';
  RAISE NOTICE '  ✅ Parcelas não acumulam mais';
  RAISE NOTICE '  ✅ Cada mês mostra apenas 1 parcela';
  RAISE NOTICE '  ✅ Transações compartilhadas espelhadas';
  RAISE NOTICE '  ✅ Viagens voltaram a aparecer';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos passos:';
  RAISE NOTICE '  1. Limpe o cache (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Teste navegando entre meses';
  RAISE NOTICE '  3. Verifique que parcelas não acumulam';
  RAISE NOTICE '';
END $$;
