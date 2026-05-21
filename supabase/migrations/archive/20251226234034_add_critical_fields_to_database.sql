-- =====================================================
-- MEGA MIGRATION: Adicionar TODOS os campos faltando
-- =====================================================

-- 1. TRANSACTIONS: Adicionar campos faltando
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_of_transaction_id UUID REFERENCES transactions(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_day INTEGER CHECK (recurrence_day BETWEEN 1 AND 31);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS last_generated TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS enable_notification BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notification_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reminder_option TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_amount NUMERIC(15,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_currency TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES profiles(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_mirror BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS mirror_transaction_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS linked_transaction_id UUID;

-- 2. ACCOUNTS: Adicionar campos faltando
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(15,2) DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;

-- 3. TRIPS: Adicionar campos faltando
ALTER TABLE trips ADD COLUMN IF NOT EXISTS shopping_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS exchange_entries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_trip_id UUID REFERENCES trips(id);

-- 4. TRANSACTION_SPLITS: Adicionar campo settled_transaction_id se não existir
ALTER TABLE transaction_splits ADD COLUMN IF NOT EXISTS settled_transaction_id UUID REFERENCES transactions(id);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_is_refund ON transactions(is_refund) WHERE is_refund = true;
CREATE INDEX IF NOT EXISTS idx_transactions_frequency ON transactions(frequency) WHERE frequency IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_is_mirror ON transactions(is_mirror) WHERE is_mirror = true;
CREATE INDEX IF NOT EXISTS idx_transactions_source_transaction_id ON transactions(source_transaction_id) WHERE source_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_deleted ON accounts(deleted) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_accounts_is_international ON accounts(is_international) WHERE is_international = true;

-- 6. Adicionar comentários para documentação
COMMENT ON COLUMN transactions.is_refund IS 'Se é um reembolso (inverte partidas dobradas)';
COMMENT ON COLUMN transactions.frequency IS 'Frequência de recorrência: DAILY, WEEKLY, MONTHLY, YEARLY';
COMMENT ON COLUMN transactions.recurrence_day IS 'Dia da recorrência (1-31 para mensal, 1-7 para semanal)';
COMMENT ON COLUMN transactions.enable_notification IS 'Se deve enviar lembrete';
COMMENT ON COLUMN transactions.exchange_rate IS 'Taxa de câmbio para conversão de moeda';
COMMENT ON COLUMN transactions.is_mirror IS 'Se é uma transação espelho (criada automaticamente)';
COMMENT ON COLUMN accounts.initial_balance IS 'Saldo inicial da conta';
COMMENT ON COLUMN accounts.deleted IS 'Soft delete - conta foi deletada mas mantida para histórico';
COMMENT ON COLUMN trips.shopping_list IS 'Lista de compras da viagem (JSON array)';

-- Verificar resultado
SELECT 
  '✅ Campos adicionados com sucesso!' as status,
  COUNT(*) FILTER (WHERE column_name LIKE '%refund%') as campos_reembolso,
  COUNT(*) FILTER (WHERE column_name LIKE '%frequency%' OR column_name LIKE '%recurrence%') as campos_recorrencia,
  COUNT(*) FILTER (WHERE column_name LIKE '%notification%') as campos_notificacao,
  COUNT(*) FILTER (WHERE column_name LIKE '%exchange%' OR column_name LIKE '%destination%') as campos_internacional,
  COUNT(*) FILTER (WHERE column_name LIKE '%mirror%') as campos_espelho
FROM information_schema.columns
WHERE table_name = 'transactions'
AND table_schema = 'public';;
