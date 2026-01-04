-- ============================================================================
-- Migration: RPC Validation Function for Transaction Operations
-- Created: 2026-01-04
-- Purpose: Backend validation for transaction operations based on settlement status
-- ============================================================================

-- Task 21: Validação RPC no Backend
-- Requirements: 8.1, 8.2, 8.3, 8.4, 8.5

BEGIN;

-- ============================================================================
-- 1. DROP EXISTING FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS validate_transaction_operation(UUID, TEXT, UUID);

-- ============================================================================
-- 2. CREATE VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_transaction_operation(
  p_transaction_id UUID,
  p_operation TEXT, -- 'edit', 'delete', 'anticipate'
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
  v_splits RECORD[];
  v_has_settled_split BOOLEAN;
  v_is_creator BOOLEAN;
  v_is_owner BOOLEAN;
BEGIN
  -- Log the validation request
  RAISE NOTICE 'Validating operation: % for transaction: % by user: %', 
    p_operation, p_transaction_id, p_user_id;

  -- ============================================================================
  -- STEP 1: Get transaction data
  -- ============================================================================
  
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'isValid', false,
      'error', jsonb_build_object(
        'code', 'TRANSACTION_NOT_FOUND',
        'message', 'Transação não encontrada'
      )
    );
  END IF;

  -- ============================================================================
  -- STEP 2: Check permissions
  -- ============================================================================
  
  -- Check if user is the owner (user_id) or creator (creator_user_id)
  v_is_owner := v_transaction.user_id = p_user_id;
  v_is_creator := v_transaction.creator_user_id = p_user_id;
  
  IF NOT v_is_owner AND NOT v_is_creator THEN
    RETURN jsonb_build_object(
      'isValid', false,
      'error', jsonb_build_object(
        'code', 'NO_PERMISSION',
        'message', 'Apenas o criador da transação pode realizar esta operação'
      )
    );
  END IF;

  -- ============================================================================
  -- STEP 3: Check settlement status
  -- ============================================================================
  
  -- Check transaction-level settlement
  IF v_transaction.is_settled THEN
    RETURN jsonb_build_object(
      'isValid', false,
      'error', jsonb_build_object(
        'code', 'TRANSACTION_SETTLED',
        'message', 'Esta transação já foi acertada e não pode ser modificada',
        'action', 'Desfaça o acerto primeiro para poder ' || 
          CASE p_operation
            WHEN 'edit' THEN 'editar'
            WHEN 'delete' THEN 'excluir'
            WHEN 'anticipate' THEN 'antecipar'
            ELSE 'modificar'
          END
      )
    );
  END IF;
  
  -- Check if any split is settled
  SELECT EXISTS (
    SELECT 1 
    FROM transaction_splits
    WHERE transaction_id = p_transaction_id
      AND (settled_by_debtor = true OR settled_by_creditor = true)
  ) INTO v_has_settled_split;
  
  IF v_has_settled_split THEN
    RETURN jsonb_build_object(
      'isValid', false,
      'error', jsonb_build_object(
        'code', 'TRANSACTION_SETTLED',
        'message', 'Esta transação compartilhada já foi acertada e não pode ser modificada',
        'action', 'Desfaça o acerto primeiro para poder ' || 
          CASE p_operation
            WHEN 'edit' THEN 'editar'
            WHEN 'delete' THEN 'excluir'
            WHEN 'anticipate' THEN 'antecipar'
            ELSE 'modificar'
          END
      )
    );
  END IF;

  -- ============================================================================
  -- STEP 4: Operation-specific validation
  -- ============================================================================
  
  CASE p_operation
    WHEN 'delete' THEN
      -- Additional validation for delete operations
      -- Check if it's part of a series with settled installments
      IF v_transaction.installment_series_id IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 
          FROM transactions t
          LEFT JOIN transaction_splits ts ON t.id = ts.transaction_id
          WHERE t.installment_series_id = v_transaction.installment_series_id
            AND (t.is_settled = true OR ts.settled_by_debtor = true OR ts.settled_by_creditor = true)
        ) THEN
          RETURN jsonb_build_object(
            'isValid', false,
            'error', jsonb_build_object(
              'code', 'SERIES_HAS_SETTLED_INSTALLMENTS',
              'message', 'Esta série contém parcelas já acertadas',
              'action', 'Desfaça os acertos das parcelas antes de excluir a série'
            )
          );
        END IF;
      END IF;
    
    WHEN 'anticipate' THEN
      -- Additional validation for anticipate operations
      -- Already covered by settlement check above
      NULL;
    
    WHEN 'edit' THEN
      -- Additional validation for edit operations
      -- Already covered by settlement check above
      NULL;
    
    ELSE
      RETURN jsonb_build_object(
        'isValid', false,
        'error', jsonb_build_object(
          'code', 'INVALID_OPERATION',
          'message', 'Operação inválida: ' || p_operation
        )
      );
  END CASE;

  -- ============================================================================
  -- STEP 5: Operation is valid
  -- ============================================================================
  
  RAISE NOTICE 'Validation passed for operation: % on transaction: %', 
    p_operation, p_transaction_id;
  
  RETURN jsonb_build_object(
    'isValid', true,
    'transaction', jsonb_build_object(
      'id', v_transaction.id,
      'is_settled', v_transaction.is_settled,
      'is_shared', v_transaction.is_shared,
      'is_owner', v_is_owner,
      'is_creator', v_is_creator
    )
  );
END;
$$;

-- ============================================================================
-- 3. ADD COMMENTS
-- ============================================================================

COMMENT ON FUNCTION validate_transaction_operation(UUID, TEXT, UUID) IS 
  'Validates transaction operations based on settlement status and permissions.
   Returns JSON with isValid flag and error details if validation fails.
   
   Parameters:
   - p_transaction_id: ID of the transaction to validate
   - p_operation: Operation type (edit, delete, anticipate)
   - p_user_id: ID of the user attempting the operation
   
   Returns:
   - isValid: boolean indicating if operation is allowed
   - error: object with code, message, and optional action if validation fails
   - transaction: object with transaction details if validation passes
   
   Part of Task 21: Validação RPC no Backend';

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_transaction_operation(UUID, TEXT, UUID) TO authenticated;

-- ============================================================================
-- 5. CREATE TEST FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION test_validate_transaction_operation()
RETURNS TABLE (
  test_name TEXT,
  passed BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Test 1: Function exists
  RETURN QUERY
  SELECT 
    'Function Exists'::TEXT,
    EXISTS (
      SELECT 1 
      FROM pg_proc 
      WHERE proname = 'validate_transaction_operation'
    ),
    'validate_transaction_operation function exists'::TEXT;

  -- Test 2: Function has correct parameters
  RETURN QUERY
  SELECT 
    'Function Parameters'::TEXT,
    EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'validate_transaction_operation'
        AND n.nspname = 'public'
        AND p.pronargs = 3
    ),
    'Function has 3 parameters (transaction_id, operation, user_id)'::TEXT;

  -- Test 3: Function returns JSONB
  RETURN QUERY
  SELECT 
    'Function Return Type'::TEXT,
    EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_type t ON p.prorettype = t.oid
      WHERE p.proname = 'validate_transaction_operation'
        AND t.typname = 'jsonb'
    ),
    'Function returns JSONB'::TEXT;

  RETURN;
END;
$$;

COMMENT ON FUNCTION test_validate_transaction_operation() IS 
  'Test function to verify validate_transaction_operation is properly configured';

-- ============================================================================
-- 6. RUN TESTS
-- ============================================================================

SELECT * FROM test_validate_transaction_operation();

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Validate edit operation
-- SELECT validate_transaction_operation(
--   'transaction-uuid'::UUID,
--   'edit',
--   'user-uuid'::UUID
-- );

-- Example 2: Validate delete operation
-- SELECT validate_transaction_operation(
--   'transaction-uuid'::UUID,
--   'delete',
--   'user-uuid'::UUID
-- );

-- Example 3: Validate anticipate operation
-- SELECT validate_transaction_operation(
--   'transaction-uuid'::UUID,
--   'anticipate',
--   'user-uuid'::UUID
-- );

-- Expected response format:
-- {
--   "isValid": true/false,
--   "error": {
--     "code": "ERROR_CODE",
--     "message": "Error message",
--     "action": "Suggested action"
--   },
--   "transaction": {
--     "id": "uuid",
--     "is_settled": false,
--     "is_shared": true,
--     "is_owner": true,
--     "is_creator": false
--   }
-- }
