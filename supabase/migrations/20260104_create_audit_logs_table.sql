-- ============================================================================
-- Migration: Create Audit Logs Table
-- Created: 2026-01-04
-- Purpose: Store audit logs for settlement operations
-- ============================================================================

-- Task 20: Auditoria de Operações
-- Requirements: 13.1, 13.2, 13.3, 13.4, 13.5

BEGIN;

-- ============================================================================
-- 1. CREATE AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operation details
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'SETTLEMENT_CREATED',
    'SETTLEMENT_UNDONE',
    'OPERATION_BLOCKED',
    'TRANSACTION_DELETED',
    'SERIES_DELETED',
    'INSTALLMENT_ANTICIPATED'
  )),
  
  -- User who performed the operation
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Related entities
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  split_id UUID REFERENCES transaction_splits(id) ON DELETE SET NULL,
  series_id UUID,
  
  -- Financial details
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'BRL',
  
  -- Additional context
  reason TEXT,
  error_code TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
  ON audit_logs(user_id);

-- Index for querying by operation type
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_type 
  ON audit_logs(operation_type);

-- Index for querying by transaction
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction_id 
  ON audit_logs(transaction_id);

-- Index for querying by split
CREATE INDEX IF NOT EXISTS idx_audit_logs_split_id 
  ON audit_logs(split_id);

-- Index for querying by series
CREATE INDEX IF NOT EXISTS idx_audit_logs_series_id 
  ON audit_logs(series_id);

-- Index for querying by date range
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
  ON audit_logs(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_operation_date 
  ON audit_logs(user_id, operation_type, created_at DESC);

-- ============================================================================
-- 3. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE audit_logs IS 
  'Audit log for settlement operations. Records all settlement-related actions
   for auditing and troubleshooting purposes.
   Part of Task 20: Auditoria de Operações';

COMMENT ON COLUMN audit_logs.operation_type IS 
  'Type of operation performed (SETTLEMENT_CREATED, SETTLEMENT_UNDONE, etc.)';

COMMENT ON COLUMN audit_logs.user_id IS 
  'ID of the user who performed the operation';

COMMENT ON COLUMN audit_logs.transaction_id IS 
  'ID of the transaction affected by the operation (if applicable)';

COMMENT ON COLUMN audit_logs.split_id IS 
  'ID of the split affected by the operation (if applicable)';

COMMENT ON COLUMN audit_logs.series_id IS 
  'ID of the installment series affected by the operation (if applicable)';

COMMENT ON COLUMN audit_logs.amount IS 
  'Amount involved in the operation (for settlements)';

COMMENT ON COLUMN audit_logs.currency IS 
  'Currency of the amount';

COMMENT ON COLUMN audit_logs.reason IS 
  'Reason for the operation (e.g., why it was blocked)';

COMMENT ON COLUMN audit_logs.error_code IS 
  'Error code if the operation was blocked';

COMMENT ON COLUMN audit_logs.metadata IS 
  'Additional metadata in JSON format for debugging';

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs
CREATE POLICY audit_logs_select_own
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can insert their own audit logs
CREATE POLICY audit_logs_insert_own
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: No updates allowed (audit logs are immutable)
-- No update policy = no updates allowed

-- Policy: No deletes allowed (audit logs are permanent)
-- No delete policy = no deletes allowed

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get audit log statistics
CREATE OR REPLACE FUNCTION get_audit_log_stats(
  p_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  operation_type TEXT,
  count BIGINT,
  total_amount DECIMAL(10, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.operation_type,
    COUNT(*)::BIGINT as count,
    SUM(al.amount)::DECIMAL(10, 2) as total_amount
  FROM audit_logs al
  WHERE (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  GROUP BY al.operation_type
  ORDER BY count DESC;
END;
$$;

COMMENT ON FUNCTION get_audit_log_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 
  'Get statistics about audit logs grouped by operation type';

-- Function to clean old audit logs (optional, for maintenance)
CREATE OR REPLACE FUNCTION clean_old_audit_logs(
  p_days_to_keep INTEGER DEFAULT 365
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % old audit log entries', v_deleted_count;
  
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION clean_old_audit_logs(INTEGER) IS 
  'Clean audit logs older than specified number of days (default: 365)';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_log_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Insert audit log
-- INSERT INTO audit_logs (operation_type, user_id, transaction_id, split_id, amount, currency)
-- VALUES ('SETTLEMENT_CREATED', 'user-uuid', 'tx-uuid', 'split-uuid', 100.50, 'BRL');

-- Example 2: Query audit logs for a user
-- SELECT * FROM audit_logs 
-- WHERE user_id = 'user-uuid' 
-- ORDER BY created_at DESC 
-- LIMIT 50;

-- Example 3: Get audit log statistics
-- SELECT * FROM get_audit_log_stats('user-uuid', '2024-01-01', '2024-12-31');

-- Example 4: Clean old audit logs (keep last 365 days)
-- SELECT clean_old_audit_logs(365);
