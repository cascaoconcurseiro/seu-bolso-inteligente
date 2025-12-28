-- Migration: Adicionar campo advanced_at para adiantamento de parcelas
-- Data: 2024-12-28
-- Descrição: Adiciona campo para registrar quando uma parcela foi adiantada

-- Adicionar campo advanced_at na tabela transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS advanced_at TIMESTAMPTZ DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN transactions.advanced_at IS 'Data/hora em que a parcela foi adiantada (estilo Nubank)';

-- Criar índice para consultas de parcelas adiantadas
CREATE INDEX IF NOT EXISTS idx_transactions_advanced_at 
ON transactions(advanced_at) 
WHERE advanced_at IS NOT NULL;
