-- =====================================================
-- MIGRATION: Migrar Campos de Settlement
-- Data: 2026-01-01
-- Descrição: Consolidar uso de settled_by_debtor/creditor
-- =====================================================

-- 1. GARANTIR QUE CAMPOS NOVOS EXISTEM
-- =====================================================

ALTER TABLE public.transaction_splits 
  ADD COLUMN IF NOT EXISTS settled_by_debtor BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS settled_by_creditor BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS debtor_settlement_tx_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creditor_settlement_tx_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 2. MIGRAR DADOS EXISTENTES
-- =====================================================

-- Se is_settled = TRUE, marcar ambos os lados como settled
UPDATE public.transaction_splits
SET 
  settled_by_debtor = TRUE,
  settled_by_creditor = TRUE,
  debtor_settlement_tx_id = settled_transaction_id,
  creditor_settlement_tx_id = settled_transaction_id
WHERE is_settled = TRUE
  AND (settled_by_debtor IS NULL OR settled_by_debtor = FALSE);

-- 3. CRIAR VIEW PARA COMPATIBILIDADE
-- =====================================================

CREATE OR REPLACE VIEW public.transaction_splits_with_settlement AS
SELECT 
  ts.*,
  -- Compatibilidade: is_settled é TRUE se ambos os lados confirmaram
  (ts.settled_by_debtor = TRUE AND ts.settled_by_creditor = TRUE) AS is_fully_settled,
  -- Status de acerto
  CASE 
    WHEN ts.settled_by_debtor = TRUE AND ts.settled_by_creditor = TRUE THEN 'FULLY_SETTLED'
    WHEN ts.settled_by_debtor = TRUE AND ts.settled_by_creditor = FALSE THEN 'DEBTOR_CONFIRMED'
    WHEN ts.settled_by_debtor = FALSE AND ts.settled_by_creditor = TRUE THEN 'CREDITOR_CONFIRMED'
    ELSE 'PENDING'
  END AS settlement_status
FROM public.transaction_splits ts;

-- 4. FUNÇÃO: MARCAR COMO PAGO (DEVEDOR)
-- =====================================================

CREATE OR REPLACE FUNCTION public.mark_as_paid_by_debtor(
  p_split_id UUID,
  p_settlement_tx_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_split RECORD;
BEGIN
  -- Buscar split
  SELECT * INTO v_split
  FROM transaction_splits
  WHERE id = p_split_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split não encontrado';
  END IF;
  
  -- Verificar se usuário é o devedor
  IF v_split.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o devedor pode marcar como pago';
  END IF;
  
  -- Marcar como pago pelo devedor
  UPDATE transaction_splits
  SET 
    settled_by_debtor = TRUE,
    debtor_settlement_tx_id = p_settlement_tx_id,
    settled_at = CASE 
      WHEN settled_by_creditor = TRUE THEN NOW()
      ELSE settled_at
    END,
    is_settled = CASE 
      WHEN settled_by_creditor = TRUE THEN TRUE
      ELSE is_settled
    END
  WHERE id = p_split_id;
END;
$;

-- 5. FUNÇÃO: MARCAR COMO RECEBIDO (CREDOR)
-- =====================================================

CREATE OR REPLACE FUNCTION public.mark_as_received_by_creditor(
  p_split_id UUID,
  p_settlement_tx_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_split RECORD;
  v_transaction RECORD;
BEGIN
  -- Buscar split e transação
  SELECT ts.*, t.user_id AS creditor_user_id
  INTO v_split
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.id = p_split_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split não encontrado';
  END IF;
  
  -- Verificar se usuário é o credor
  IF v_split.creditor_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o credor pode marcar como recebido';
  END IF;
  
  -- Marcar como recebido pelo credor
  UPDATE transaction_splits
  SET 
    settled_by_creditor = TRUE,
    creditor_settlement_tx_id = p_settlement_tx_id,
    settled_at = CASE 
      WHEN settled_by_debtor = TRUE THEN NOW()
      ELSE settled_at
    END,
    is_settled = CASE 
      WHEN settled_by_debtor = TRUE THEN TRUE
      ELSE is_settled
    END
  WHERE id = p_split_id;
END;
$;

-- 6. FUNÇÃO: DESFAZER ACERTO
-- =====================================================

CREATE OR REPLACE FUNCTION public.undo_settlement(
  p_split_id UUID,
  p_side TEXT -- 'DEBTOR' ou 'CREDITOR'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_split RECORD;
BEGIN
  -- Buscar split
  SELECT ts.*, t.user_id AS creditor_user_id
  INTO v_split
  FROM transaction_splits ts
  JOIN transactions t ON t.id = ts.transaction_id
  WHERE ts.id = p_split_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split não encontrado';
  END IF;
  
  -- Verificar permissão
  IF p_side = 'DEBTOR' AND v_split.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão';
  ELSIF p_side = 'CREDITOR' AND v_split.creditor_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  
  -- Desfazer acerto
  IF p_side = 'DEBTOR' THEN
    UPDATE transaction_splits
    SET 
      settled_by_debtor = FALSE,
      debtor_settlement_tx_id = NULL,
      is_settled = FALSE,
      settled_at = NULL
    WHERE id = p_split_id;
  ELSIF p_side = 'CREDITOR' THEN
    UPDATE transaction_splits
    SET 
      settled_by_creditor = FALSE,
      creditor_settlement_tx_id = NULL,
      is_settled = FALSE,
      settled_at = NULL
    WHERE id = p_split_id;
  END IF;
END;
$;

-- 7. TRIGGER: SINCRONIZAR is_settled
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_is_settled()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $
BEGIN
  -- Atualizar is_settled baseado nos campos novos
  NEW.is_settled := (NEW.settled_by_debtor = TRUE AND NEW.settled_by_creditor = TRUE);
  
  -- Se ambos confirmaram, definir settled_at
  IF NEW.is_settled = TRUE AND OLD.is_settled = FALSE THEN
    NEW.settled_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trg_sync_is_settled ON public.transaction_splits;
CREATE TRIGGER trg_sync_is_settled
  BEFORE UPDATE ON public.transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_is_settled();

-- 8. ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_splits_settled_by_debtor 
  ON public.transaction_splits(settled_by_debtor) 
  WHERE settled_by_debtor = FALSE;

CREATE INDEX IF NOT EXISTS idx_splits_settled_by_creditor 
  ON public.transaction_splits(settled_by_creditor) 
  WHERE settled_by_creditor = FALSE;

-- 9. COMENTÁRIOS
-- =====================================================

COMMENT ON VIEW transaction_splits_with_settlement IS 
  'View com status de acerto consolidado para compatibilidade';

COMMENT ON FUNCTION mark_as_paid_by_debtor IS 
  'Devedor marca split como pago';

COMMENT ON FUNCTION mark_as_received_by_creditor IS 
  'Credor marca split como recebido';

COMMENT ON FUNCTION undo_settlement IS 
  'Desfaz acerto de um lado (devedor ou credor)';

COMMENT ON FUNCTION sync_is_settled IS 
  'Sincroniza is_settled com settled_by_debtor/creditor';

