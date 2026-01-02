-- Migração: Adicionar campo last_generated_date para transações recorrentes
-- Data: 28/12/2024
-- Descrição: Adiciona campo para rastrear a última data em que uma transação recorrente foi gerada

-- Adicionar coluna last_generated_date à tabela transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS last_generated_date DATE;

-- Comentário explicativo
COMMENT ON COLUMN transactions.last_generated_date IS 'Data da última transação gerada a partir desta transação recorrente';

-- Índice para otimizar consultas de transações recorrentes pendentes
CREATE INDEX IF NOT EXISTS idx_transactions_recurring 
ON transactions (user_id, is_recurring, last_generated_date) 
WHERE is_recurring = true;
