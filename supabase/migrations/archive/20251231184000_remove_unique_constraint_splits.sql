-- Remover índice UNIQUE problemático de transaction_splits
-- Problema: Impedia criar múltiplos splits para mesma transação/membro
-- Exemplo: Parcelas compartilhadas geravam erro 409
-- Solução: Remover UNIQUE e criar índice normal para performance

DROP INDEX IF EXISTS idx_transaction_splits_unique;

-- Criar índice sem UNIQUE para performance
CREATE INDEX IF NOT EXISTS idx_transaction_splits_lookup 
ON transaction_splits (transaction_id, member_id, user_id);
