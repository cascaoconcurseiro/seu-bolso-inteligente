-- Adicionar campo currency na tabela transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';

-- Comentário
COMMENT ON COLUMN transactions.currency IS 'Moeda da transação (BRL, USD, EUR, etc)';;
