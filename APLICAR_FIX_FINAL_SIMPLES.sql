-- =====================================================
-- FIX FINAL SIMPLES - COPIE E COLE NO SUPABASE
-- =====================================================

-- 1. Adicionar campo competence_date
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS competence_date DATE;

-- 2. Popular competence_date
UPDATE transactions
SET competence_date = DATE_TRUNC('month', date)::DATE
WHERE competence_date IS NULL;

-- 3. Criar função de normalização
CREATE OR REPLACE FUNCTION normalize_competence_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.competence_date := DATE_TRUNC('month', NEW.date)::DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger
DROP TRIGGER IF EXISTS trigger_normalize_competence_date ON transactions;
CREATE TRIGGER trigger_normalize_competence_date
  BEFORE INSERT OR UPDATE OF date ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION normalize_competence_date();

-- 5. Remover duplicatas de parcelas
DELETE FROM transactions t1
WHERE t1.series_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM transactions t2
  WHERE t2.series_id = t1.series_id
  AND t2.competence_date = t1.competence_date
  AND t2.created_at < t1.created_at
);

-- 6. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_transactions_competence_date 
ON transactions(competence_date);

CREATE INDEX IF NOT EXISTS idx_transactions_series_competence 
ON transactions(series_id, competence_date) 
WHERE series_id IS NOT NULL;

-- 7. Atualizar função de espelhamento
CREATE OR REPLACE FUNCTION mirror_shared_transaction()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 8. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRAÇÃO APLICADA COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE 'Resultado:';
  RAISE NOTICE '  ✅ Campo competence_date criado';
  RAISE NOTICE '  ✅ Trigger de normalização ativo';
  RAISE NOTICE '  ✅ Duplicatas removidas';
  RAISE NOTICE '  ✅ Índices criados';
  RAISE NOTICE '  ✅ Função de espelhamento atualizada';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '  1. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Teste navegando entre meses';
  RAISE NOTICE '  3. Verifique que parcelas não acumulam';
END $$;
