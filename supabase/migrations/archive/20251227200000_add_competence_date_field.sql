-- =====================================================
-- CORREÇÃO CRÍTICA: ADICIONAR CAMPO DE COMPETÊNCIA
-- =====================================================
-- 
-- PROBLEMA: Parcelas se acumulam ao navegar pelos meses
-- CAUSA: Falta campo competence_date para filtrar por mês
-- SOLUÇÃO: Adicionar competence_date e constraint de unicidade
--
-- =====================================================

-- 1. ADICIONAR CAMPO DE COMPETÊNCIA
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS competence_date DATE;

-- 2. POPULAR CAMPO PARA TRANSAÇÕES EXISTENTES
-- Para transações normais: competence_date = date
-- Para parcelas: competence_date = primeiro dia do mês da parcela
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
-- Previne duplicação: mesma série + mesmo número de parcela = erro
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_installment_per_series
ON public.transactions(series_id, current_installment)
WHERE series_id IS NOT NULL AND is_installment = TRUE;

-- 6. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN public.transactions.competence_date IS 
'Data de competência (sempre 1º dia do mês). Usado para filtrar transações por mês, especialmente parcelas.';

COMMENT ON INDEX idx_unique_installment_per_series IS
'Garante que não existam parcelas duplicadas na mesma série (idempotência).';

-- 7. CRIAR FUNÇÃO HELPER PARA VALIDAÇÃO
CREATE OR REPLACE FUNCTION public.validate_competence_date()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. CRIAR TRIGGER PARA VALIDAÇÃO AUTOMÁTICA
DROP TRIGGER IF EXISTS ensure_competence_date ON public.transactions;
CREATE TRIGGER ensure_competence_date
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_competence_date();

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute para verificar:
-- SELECT 
--   description,
--   date,
--   competence_date,
--   current_installment,
--   total_installments,
--   series_id
-- FROM transactions 
-- WHERE is_installment = TRUE
-- ORDER BY series_id, current_installment;
