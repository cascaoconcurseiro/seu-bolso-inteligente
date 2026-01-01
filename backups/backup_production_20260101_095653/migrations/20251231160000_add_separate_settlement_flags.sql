-- Adicionar flags separadas para controle de acerto por cada lado
-- Isso permite que devedor e credor marquem independentemente quando pagaram/receberam

ALTER TABLE transaction_splits 
ADD COLUMN IF NOT EXISTS settled_by_debtor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS settled_by_creditor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS debtor_settlement_tx_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS creditor_settlement_tx_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Comentários explicativos
COMMENT ON COLUMN transaction_splits.settled_by_debtor IS 'Indica se o devedor (quem deve) marcou como pago';
COMMENT ON COLUMN transaction_splits.settled_by_creditor IS 'Indica se o credor (quem recebe) marcou como recebido';
COMMENT ON COLUMN transaction_splits.debtor_settlement_tx_id IS 'ID da transação de acerto criada pelo devedor';
COMMENT ON COLUMN transaction_splits.creditor_settlement_tx_id IS 'ID da transação de acerto criada pelo credor';

-- Migrar dados existentes: se is_settled = true, marcar ambos como true
UPDATE transaction_splits
SET 
  settled_by_debtor = is_settled,
  settled_by_creditor = is_settled,
  debtor_settlement_tx_id = settled_transaction_id,
  creditor_settlement_tx_id = settled_transaction_id
WHERE is_settled = TRUE;
