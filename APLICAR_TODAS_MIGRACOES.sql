-- =====================================================
-- SCRIPT CONSOLIDADO DE MIGRAÇÕES
-- Aplicar todas as migrações necessárias
-- Data: 26/12/2024
-- =====================================================

-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole este script > Run

BEGIN;

-- =====================================================
-- 1. ADICIONAR CAMPOS CRÍTICOS
-- =====================================================

-- Campos em transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_of_transaction_id UUID REFERENCES transactions(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS last_generated TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS enable_notification BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notification_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reminder_option TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_amount NUMERIC(15,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_currency TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reconciled_by UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_mirror BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS mirror_transaction_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS linked_transaction_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_transaction_id UUID REFERENCES transactions(id);

-- Campos em accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(15,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;

-- Campos em trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS shopping_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS exchange_entries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_trip_id UUID;

-- =====================================================
-- 2. CRIAR ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_is_shared ON transactions(is_shared);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_trip ON transactions(trip_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);

CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_member ON transaction_splits(member_id);

-- =====================================================
-- 3. SISTEMA DE COMPARTILHAMENTO AVANÇADO
-- =====================================================

-- Tabela de Requests
CREATE TABLE IF NOT EXISTS shared_transaction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES profiles(id),
    invited_user_id UUID REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_amount NUMERIC(15,2),
    expires_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_requests_transaction ON shared_transaction_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_shared_requests_requester ON shared_transaction_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_shared_requests_invited ON shared_transaction_requests(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_requests_status ON shared_transaction_requests(status);

-- RLS Policies
ALTER TABLE shared_transaction_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own requests" ON shared_transaction_requests;
CREATE POLICY "Users can view their own requests"
    ON shared_transaction_requests FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = invited_user_id);

DROP POLICY IF EXISTS "Users can create requests" ON shared_transaction_requests;
CREATE POLICY "Users can create requests"
    ON shared_transaction_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update their requests" ON shared_transaction_requests;
CREATE POLICY "Users can update their requests"
    ON shared_transaction_requests FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = invited_user_id);

-- Tabela de Audit Logs
CREATE TABLE IF NOT EXISTS shared_system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL,
    operation_data JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,
    user_id UUID REFERENCES profiles(id),
    transaction_id UUID REFERENCES transactions(id),
    request_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON shared_system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction ON shared_system_audit_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON shared_system_audit_logs(created_at);

ALTER TABLE shared_system_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit logs" ON shared_system_audit_logs;
CREATE POLICY "Users can view their own audit logs"
    ON shared_system_audit_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert audit logs" ON shared_system_audit_logs;
CREATE POLICY "System can insert audit logs"
    ON shared_system_audit_logs FOR INSERT
    WITH CHECK (true);

-- Tabela de Operation Queue
CREATE TABLE IF NOT EXISTS shared_operation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    operation_type TEXT NOT NULL,
    operation_data JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    error_message TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_queue_user ON shared_operation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_queue_status ON shared_operation_queue(status);

ALTER TABLE shared_operation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own operations" ON shared_operation_queue;
CREATE POLICY "Users can view their own operations"
    ON shared_operation_queue FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create operations" ON shared_operation_queue;
CREATE POLICY "Users can create operations"
    ON shared_operation_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their operations" ON shared_operation_queue;
CREATE POLICY "Users can update their operations"
    ON shared_operation_queue FOR UPDATE
    USING (auth.uid() = user_id);

-- Tabela de Circuit Breaker
CREATE TABLE IF NOT EXISTS shared_circuit_breaker (
    operation_type TEXT PRIMARY KEY,
    circuit_state TEXT DEFAULT 'CLOSED',
    failure_count INTEGER DEFAULT 0,
    last_failure_at TIMESTAMP,
    next_attempt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE shared_circuit_breaker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view circuit breaker state" ON shared_circuit_breaker;
CREATE POLICY "Anyone can view circuit breaker state"
    ON shared_circuit_breaker FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "System can update circuit breaker" ON shared_circuit_breaker;
CREATE POLICY "System can update circuit breaker"
    ON shared_circuit_breaker FOR ALL
    USING (true);

-- =====================================================
-- 4. FUNÇÕES DE LIMPEZA E MANUTENÇÃO
-- =====================================================

-- Limpar logs antigos (> 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM shared_system_audit_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Processar operações pendentes
CREATE OR REPLACE FUNCTION process_pending_operations()
RETURNS void AS $$
BEGIN
    UPDATE shared_operation_queue
    SET status = 'failed',
        error_message = 'Max retries exceeded',
        updated_at = NOW()
    WHERE status = 'pending'
      AND retry_count >= max_retries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expirar requests antigos
CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS void AS $$
BEGIN
    UPDATE shared_transaction_requests
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE shared_transaction_requests IS 'Requests de compartilhamento de transações entre usuários';
COMMENT ON TABLE shared_system_audit_logs IS 'Logs de auditoria do sistema de compartilhamento';
COMMENT ON TABLE shared_operation_queue IS 'Fila de operações pendentes com retry automático';
COMMENT ON TABLE shared_circuit_breaker IS 'Circuit breaker para proteção contra falhas';

COMMENT ON COLUMN transactions.is_refund IS 'Indica se é um reembolso';
COMMENT ON COLUMN transactions.is_recurring IS 'Indica se é uma transação recorrente';
COMMENT ON COLUMN transactions.frequency IS 'Frequência da recorrência: DAILY, WEEKLY, MONTHLY, YEARLY';
COMMENT ON COLUMN transactions.enable_notification IS 'Habilita notificação para esta transação';
COMMENT ON COLUMN transactions.is_mirror IS 'Indica se é uma transação espelho (cópia)';

COMMENT ON COLUMN accounts.credit_limit IS 'Limite de crédito para cartões';
COMMENT ON COLUMN accounts.is_international IS 'Indica se é uma conta internacional';
COMMENT ON COLUMN accounts.currency IS 'Moeda da conta (BRL, USD, EUR, etc)';

COMMENT ON COLUMN trips.shopping_list IS 'Lista de compras da viagem (JSONB)';

COMMIT;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT 
    'shared_transaction_requests' as tabela,
    COUNT(*) as registros
FROM shared_transaction_requests
UNION ALL
SELECT 
    'shared_system_audit_logs' as tabela,
    COUNT(*) as registros
FROM shared_system_audit_logs
UNION ALL
SELECT 
    'shared_operation_queue' as tabela,
    COUNT(*) as registros
FROM shared_operation_queue
UNION ALL
SELECT 
    'shared_circuit_breaker' as tabela,
    COUNT(*) as registros
FROM shared_circuit_breaker;

-- Verificar novos campos em transactions
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN (
    'is_refund', 'frequency', 'enable_notification', 
    'is_mirror', 'source_transaction_id'
  )
ORDER BY column_name;

-- Verificar novos campos em accounts
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND column_name IN ('credit_limit', 'currency', 'is_international')
ORDER BY column_name;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- SUCESSO! Todas as migrações foram aplicadas.
-- Próximos passos:
-- 1. Verificar os resultados das queries acima
-- 2. Testar as funcionalidades no frontend
-- 3. Monitorar logs de erro
