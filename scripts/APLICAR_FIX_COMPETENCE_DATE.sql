-- =====================================================
-- SCRIPT DE APLICAÇÃO: FIX COMPETENCE DATE
-- =====================================================
-- 
-- Este script corrige o bug de acúmulo de parcelas
-- adicionando o campo competence_date
--
-- EXECUTE NO SUPABASE SQL EDITOR
-- =====================================================

\echo '🔧 Aplicando correção de competência...'

-- 1. ADICIONAR CAMPO DE COMPETÊNCIA
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS competence_date DATE;

-- 2. POPULAR CAMPO PARA TRANSAÇÕES EXISTENTES
UPDATE public.transactions
SET competence_date = DATE_TRUNC('month', date)::DATE
WHERE competence_date IS NULL;

-- 3. TORNAR CAMPO OBRIGATÓRIO
ALTER TABLE public.transactions 
ALTER COLUMN competence_date SET NOT NULL;

-- 4. CRIAR ÍNDICE PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_transactions_competence_date 
ON public.transactions(user_id, competence_date);

-- 5. ADICIONAR CONSTRAINT DE UNICIDADE PARA PARCELAS
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_installment_per_series
ON public.transactions(series_id, current_installment)
WHERE series_id IS NOT NULL AND is_installment = TRUE;

-- 6. ADICIONAR COMENTÁRIOS
COMMENT ON COLUMN public.transactions.competence_date IS 
'Data de competência (sempre 1º dia do mês). Usado para filtrar transações por mês, especialmente parcelas.';

-- 7. CRIAR FUNÇÃO DE VALIDAÇÃO
CREATE OR REPLACE FUNCTION public.validate_competence_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.competence_date IS NOT NULL THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.competence_date)::DATE;
  ELSE
    NEW.competence_date := DATE_TRUNC('month', NEW.date)::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. CRIAR TRIGGER
DROP TRIGGER IF EXISTS ensure_competence_date ON public.transactions;
CREATE TRIGGER ensure_competence_date
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_competence_date();

\echo '✅ Correção aplicada com sucesso!'

-- =====================================================
-- ATUALIZAR FUNÇÃO DE ESPELHAMENTO
-- =====================================================

\echo ''
\echo '🔧 Atualizando função de espelhamento...'
\echo ''

CREATE OR REPLACE FUNCTION handle_transaction_mirroring()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $
DECLARE
  v_split RECORD;
  v_mirror_id UUID;
  v_payer_name TEXT;
  v_target_user_id UUID;
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.source_transaction_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM transactions WHERE source_transaction_id = OLD.id;
    DELETE FROM shared_transaction_mirrors WHERE original_transaction_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.is_shared IS DISTINCT FROM TRUE THEN
    RETURN NEW;
  END IF;

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

  SELECT COALESCE(full_name, email, 'Outro') INTO v_payer_name
  FROM profiles WHERE id = NEW.user_id;

  FOR v_split IN
    SELECT ts.*, fm.user_id as member_user_id, fm.linked_user_id as member_linked_user_id
    FROM transaction_splits ts
    INNER JOIN family_members fm ON fm.id = ts.member_id
    WHERE ts.transaction_id = NEW.id
  LOOP
    IF NEW.user_id = v_split.member_user_id THEN
      v_target_user_id := v_split.member_linked_user_id;
    ELSIF NEW.user_id = v_split.member_linked_user_id THEN
      v_target_user_id := v_split.member_user_id;
    ELSE
      v_target_user_id := COALESCE(v_split.member_user_id, v_split.member_linked_user_id);
    END IF;
    
    IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
      SELECT id INTO v_mirror_id FROM transactions
      WHERE source_transaction_id = NEW.id AND user_id = v_target_user_id;
      
      IF v_mirror_id IS NULL THEN
        v_mirror_id := gen_random_uuid();
        INSERT INTO transactions (
          id, user_id, amount, description, date, competence_date, type,
          trip_id, is_shared, source_transaction_id, domain, sync_status
        ) VALUES (
          v_mirror_id, v_target_user_id, v_split.amount,
          NEW.description || ' (Compartilhado por ' || v_payer_name || ')',
          NEW.date, NEW.competence_date, NEW.type, NEW.trip_id,
          TRUE, NEW.id, COALESCE(NEW.domain, 'SHARED'), 'SYNCED'
        );
      ELSE
        UPDATE transactions SET
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
$;

\echo '✅ Função de espelhamento atualizada!'
\echo ''

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

\echo ''
\echo '📊 Verificando parcelas existentes:'
\echo ''

SELECT 
  description,
  date,
  competence_date,
  current_installment || '/' || total_installments as parcela,
  amount,
  series_id
FROM transactions 
WHERE is_installment = TRUE
ORDER BY series_id, current_installment
LIMIT 20;

\echo ''
\echo '📊 Contagem de transações por mês de competência:'
\echo ''

SELECT 
  TO_CHAR(competence_date, 'YYYY-MM') as mes_competencia,
  COUNT(*) as total_transacoes,
  COUNT(*) FILTER (WHERE is_installment = TRUE) as parcelas,
  COUNT(*) FILTER (WHERE is_installment = FALSE) as transacoes_normais
FROM transactions
GROUP BY competence_date
ORDER BY competence_date DESC
LIMIT 12;

\echo ''
\echo '✅ Verificação concluída!'
\echo ''
\echo '⚠️  IMPORTANTE: Reinicie o frontend para aplicar as mudanças'
