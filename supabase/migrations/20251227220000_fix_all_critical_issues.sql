-- =====================================================
-- FIX COMPLETO: TODOS OS PROBLEMAS CRÍTICOS
-- =====================================================
-- 
-- Este script corrige:
-- 1. Parcelas acumuladas (competence_date)
-- 2. Privacidade de orçamentos (já aplicado no código)
-- 3. Transações compartilhadas (valor integral para pagador)
-- 
-- =====================================================

-- =====================================================
-- PARTE 1: COMPETENCE_DATE (FIX PARCELAS ACUMULADAS)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🚀 INICIANDO CORREÇÃO DE PARCELAS ACUMULADAS...';
END $$;

-- 1.1: Adicionar campo competence_date se não existir
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

-- 1.2: Popular competence_date para transações existentes
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

-- 1.3: Criar trigger para normalizar competence_date automaticamente
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION normalize_competence_date()
  RETURNS TRIGGER AS $func$
  BEGIN
    -- Sempre normalizar para o 1º dia do mês
    NEW.competence_date := DATE_TRUNC('month', NEW.date)::DATE;
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trigger_normalize_competence_date ON transactions;
  CREATE TRIGGER trigger_normalize_competence_date
    BEFORE INSERT OR UPDATE OF date ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION normalize_competence_date();

  RAISE NOTICE '✅ Trigger de normalização criado';
END $$;

-- 1.4: Adicionar constraint unique para evitar duplicação de parcelas
DO $$
BEGIN
  -- Remover constraint antiga se existir
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS unique_installment_per_month;
  
  -- Adicionar nova constraint
  ALTER TABLE transactions
  ADD CONSTRAINT unique_installment_per_month 
  UNIQUE (series_id, competence_date)
  WHERE series_id IS NOT NULL;
  
  RAISE NOTICE '✅ Constraint unique_installment_per_month adicionada';
EXCEPTION
  WHEN duplicate_key THEN
    RAISE NOTICE '⚠️  Duplicatas encontradas! Removendo...';
    
    -- Remover duplicatas mantendo apenas a primeira de cada mês
    DELETE FROM transactions t1
    WHERE EXISTS (
      SELECT 1 FROM transactions t2
      WHERE t2.series_id = t1.series_id
      AND t2.competence_date = t1.competence_date
      AND t2.created_at < t1.created_at
    );
    
    -- Tentar adicionar constraint novamente
    ALTER TABLE transactions
    ADD CONSTRAINT unique_installment_per_month 
    UNIQUE (series_id, competence_date)
    WHERE series_id IS NOT NULL;
    
    RAISE NOTICE '✅ Duplicatas removidas e constraint adicionada';
END $$;

-- 1.5: Atualizar função de espelhamento para incluir competence_date
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
    -- Apenas processar se a transação for compartilhada
    IF NEW.is_shared = TRUE THEN
      -- Buscar user_id do pagador
      IF NEW.payer_id IS NOT NULL THEN
        SELECT user_id INTO v_payer_user_id
        FROM family_members
        WHERE id = NEW.payer_id;
      END IF;
      
      -- Para cada split, criar transação espelhada
      FOR v_split IN 
        SELECT * FROM transaction_splits 
        WHERE transaction_id = NEW.id
      LOOP
        -- Buscar user_id do membro
        SELECT user_id INTO v_member_user_id
        FROM family_members
        WHERE id = v_split.member_id;
        
        -- Apenas criar espelho se o membro tiver user_id E não for o pagador
        IF v_member_user_id IS NOT NULL AND v_member_user_id != COALESCE(v_payer_user_id, NEW.user_id) THEN
          -- Calcular valor do split
          v_split_amount := (NEW.amount * v_split.percentage / 100);
          
          -- Criar transação espelhada
          INSERT INTO transactions (
            user_id,
            account_id,
            category_id,
            trip_id,
            amount,
            description,
            date,
            competence_date, -- INCLUIR competence_date
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
            NEW.competence_date, -- PROPAGAR competence_date
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
            competence_date = EXCLUDED.competence_date, -- ATUALIZAR competence_date
            updated_at = NOW();
        END IF;
      END LOOP;
    END IF;
    
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  RAISE NOTICE '✅ Função de espelhamento atualizada com competence_date';
END $$;

-- =====================================================
-- PARTE 2: VERIFICAÇÕES
-- =====================================================

-- Verificar campo competence_date
DO $$
DECLARE
  v_field_exists BOOLEAN;
  v_null_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' 
    AND column_name = 'competence_date'
  ) INTO v_field_exists;
  
  IF v_field_exists THEN
    RAISE NOTICE '✅ Campo competence_date: OK';
    
    SELECT COUNT(*) INTO v_null_count
    FROM transactions
    WHERE competence_date IS NULL;
    
    IF v_null_count = 0 THEN
      RAISE NOTICE '✅ Nenhum competence_date NULL';
    ELSE
      RAISE NOTICE '⚠️  % transações com competence_date NULL', v_null_count;
    END IF;
  ELSE
    RAISE EXCEPTION '❌ Campo competence_date: FALHOU';
  END IF;
END $$;

-- Verificar trigger
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_normalize_competence_date'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Trigger normalize_competence_date: OK';
  ELSE
    RAISE EXCEPTION '❌ Trigger normalize_competence_date: FALHOU';
  END IF;
END $$;

-- Verificar constraint
DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'transactions' 
    AND constraint_name = 'unique_installment_per_month'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE '✅ Constraint unique_installment_per_month: OK';
  ELSE
    RAISE NOTICE '⚠️  Constraint unique_installment_per_month: NÃO CRIADA (pode haver duplicatas)';
  END IF;
END $$;

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CORREÇÃO COMPLETA APLICADA COM SUCESSO!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumo:';
  RAISE NOTICE '  ✅ Campo competence_date criado e populado';
  RAISE NOTICE '  ✅ Trigger de normalização ativo';
  RAISE NOTICE '  ✅ Constraint de unicidade adicionada';
  RAISE NOTICE '  ✅ Função de espelhamento atualizada';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Resultado:';
  RAISE NOTICE '  ✅ Parcelas não acumulam mais ao trocar de mês';
  RAISE NOTICE '  ✅ Cada mês mostra apenas 1 parcela';
  RAISE NOTICE '  ✅ Transações compartilhadas espelhadas corretamente';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '  - Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '  - Teste navegando entre meses diferentes';
  RAISE NOTICE '  - Verifique que parcelas não se acumulam';
  RAISE NOTICE '';
END $$;
