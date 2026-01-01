-- =====================================================
-- SISTEMA DE COMPARTILHAMENTO AVANÇADO
-- Tabelas para requests, audit logs, operation queue e circuit breaker
-- =====================================================

-- 1. Tabela de Requests de Compartilhamento
CREATE TABLE IF NOT EXISTS shared_transaction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES profiles(id),
    invited_user_id UUID REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
    assigned_amount NUMERIC(15,2),
    expires_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_shared_requests_transaction ON shared_transaction_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_shared_requests_requester ON shared_transaction_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_shared_requests_invited ON shared_transaction_requests(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_requests_status ON shared_transaction_requests(status);

-- RLS Policies
ALTER TABLE shared_transaction_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
    ON shared_transaction_requests FOR SELECT
    USING (
        auth.uid() = requester_id OR 
        auth.uid() = invited_user_id
    );

CREATE POLICY "Users can create requests"
    ON shared_transaction_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their requests"
    ON shared_transaction_requests FOR UPDATE
    USING (
        auth.uid() = requester_id OR 
        auth.uid() = invited_user_id
    );

-- 2. Tabela de Audit Logs
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON shared_system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction ON shared_system_audit_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON shared_system_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON shared_system_audit_logs(operation_type);

-- RLS Policies
ALTER TABLE shared_system_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
    ON shared_system_audit_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
    ON shared_system_audit_logs FOR INSERT
    WITH CHECK (true);

-- 3. Tabela de Operation Queue
CREATE TABLE IF NOT EXISTS shared_operation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    operation_type TEXT NOT NULL,
    operation_data JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    error_message TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_operation_queue_user ON shared_operation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_queue_status ON shared_operation_queue(status);
CREATE INDEX IF NOT EXISTS idx_operation_queue_next_retry ON shared_operation_queue(next_retry_at);

-- RLS Policies
ALTER TABLE shared_operation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own operations"
    ON shared_operation_queue FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create operations"
    ON shared_operation_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their operations"
    ON shared_operation_queue FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. Tabela de Circuit Breaker
CREATE TABLE IF NOT EXISTS shared_circuit_breaker (
    operation_type TEXT PRIMARY KEY,
    circuit_state TEXT DEFAULT 'CLOSED', -- CLOSED, OPEN, HALF_OPEN
    failure_count INTEGER DEFAULT 0,
    last_failure_at TIMESTAMP,
    next_attempt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE shared_circuit_breaker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view circuit breaker state"
    ON shared_circuit_breaker FOR SELECT
    USING (true);

CREATE POLICY "System can update circuit breaker"
    ON shared_circuit_breaker FOR ALL
    USING (true);

-- 5. Função para limpar logs antigos (> 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM shared_system_audit_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função para processar operações pendentes
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

-- 7. Função para expirar requests antigos
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

-- Comentários
COMMENT ON TABLE shared_transaction_requests IS 'Requests de compartilhamento de transações entre usuários';
COMMENT ON TABLE shared_system_audit_logs IS 'Logs de auditoria do sistema de compartilhamento';
COMMENT ON TABLE shared_operation_queue IS 'Fila de operações pendentes com retry automático';
COMMENT ON TABLE shared_circuit_breaker IS 'Circuit breaker para proteção contra falhas';
