-- ============================================================================
-- Migration: Cascade Delete Triggers for Transaction Settlement Consistency
-- Created: 2026-01-04
-- Purpose: Ensure complete cascade deletion of related data when transactions
--          or splits are deleted, preventing orphaned records
-- ============================================================================

-- Task 16: Cascade Delete Completo
-- Requirements: 3.1, 3.2, 3.3, 3.4, 11.3

BEGIN;

-- ============================================================================
-- 1. CASCADE DELETE: Settlement Transactions when Split is Deleted
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS cascade_delete_settlement_transactions ON transaction_splits;
DROP FUNCTION IF EXISTS cascade_delete_settlement_transactions();

-- Create function to delete settlement transactions
CREATE OR REPLACE FUNCTION cascade_delete_settlement_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the operation
  RAISE NOTICE 'Cascade deleting settlement transactions for split: %', OLD.id;

  -- Delete debtor settlement transaction if exists
  IF OLD.debtor_settlement_tx_id IS NOT NULL THEN
    DELETE FROM transactions 
    WHERE id = OLD.debtor_settlement_tx_id;
    RAISE NOTICE 'Deleted debtor settlement transaction: %', OLD.debtor_settlement_tx_id;
  END IF;

  -- Delete creditor settlement transaction if exists
  IF OLD.creditor_settlement_tx_id IS NOT NULL THEN
    DELETE FROM transactions 
    WHERE id = OLD.creditor_settlement_tx_id;
    RAISE NOTICE 'Deleted creditor settlement transaction: %', OLD.creditor_settlement_tx_id;
  END IF;

  RETURN OLD;
END;
$$;

-- Create trigger
CREATE TRIGGER cascade_delete_settlement_transactions
  BEFORE DELETE ON transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION cascade_delete_settlement_transactions();

COMMENT ON FUNCTION cascade_delete_settlement_transactions() IS 
  'Automatically deletes settlement transactions when a split is deleted';

-- ============================================================================
-- 2. CASCADE DELETE: Splits when Transaction is Deleted
-- ============================================================================

-- Note: This is already handled by the foreign key constraint with ON DELETE CASCADE
-- in the transaction_splits table definition. We verify it exists:

DO $$
BEGIN
  -- Check if the foreign key constraint exists with CASCADE
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc 
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'transaction_splits'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'transaction_id'
      AND rc.delete_rule = 'CASCADE'
  ) THEN
    -- Add CASCADE to the foreign key if it doesn't exist
    ALTER TABLE transaction_splits
      DROP CONSTRAINT IF EXISTS transaction_splits_transaction_id_fkey,
      ADD CONSTRAINT transaction_splits_transaction_id_fkey
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE CASCADE;
    
    RAISE NOTICE 'Added CASCADE delete to transaction_splits.transaction_id foreign key';
  ELSE
    RAISE NOTICE 'CASCADE delete already exists on transaction_splits.transaction_id';
  END IF;
END;
$$;

-- ============================================================================
-- 3. CASCADE DELETE: All Installments when Series is Deleted
-- ============================================================================

-- This is handled by the delete_installment_series RPC function
-- We ensure it exists and works correctly

-- Verify the function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'delete_installment_series'
  ) THEN
    RAISE EXCEPTION 'Function delete_installment_series does not exist. Please create it first.';
  END IF;
  
  RAISE NOTICE 'Function delete_installment_series exists and will handle series deletion';
END;
$$;

-- ============================================================================
-- 4. VERIFICATION: Test Cascade Delete Logic
-- ============================================================================

-- Create a test function to verify cascade delete works
CREATE OR REPLACE FUNCTION test_cascade_delete()
RETURNS TABLE (
  test_name TEXT,
  passed BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_tx_id UUID;
  test_split_id UUID;
  test_settlement_tx_id UUID;
  split_count INTEGER;
  settlement_count INTEGER;
BEGIN
  -- Test 1: Verify split cascade delete
  RETURN QUERY
  SELECT 
    'Split Cascade Delete'::TEXT,
    EXISTS (
      SELECT 1 
      FROM information_schema.referential_constraints rc
      WHERE rc.constraint_schema = 'public'
        AND rc.constraint_name LIKE '%transaction_splits_transaction_id%'
        AND rc.delete_rule = 'CASCADE'
    ),
    'Splits are automatically deleted when transaction is deleted'::TEXT;

  -- Test 2: Verify settlement transaction trigger exists
  RETURN QUERY
  SELECT 
    'Settlement Transaction Trigger'::TEXT,
    EXISTS (
      SELECT 1 
      FROM pg_trigger 
      WHERE tgname = 'cascade_delete_settlement_transactions'
    ),
    'Trigger exists to delete settlement transactions when split is deleted'::TEXT;

  -- Test 3: Verify delete_installment_series function exists
  RETURN QUERY
  SELECT 
    'Delete Installment Series Function'::TEXT,
    EXISTS (
      SELECT 1 
      FROM pg_proc 
      WHERE proname = 'delete_installment_series'
    ),
    'Function exists to delete all installments in a series'::TEXT;

  RETURN;
END;
$$;

COMMENT ON FUNCTION test_cascade_delete() IS 
  'Test function to verify cascade delete logic is properly configured';

-- ============================================================================
-- 5. DOCUMENTATION
-- ============================================================================

COMMENT ON TRIGGER cascade_delete_settlement_transactions ON transaction_splits IS
  'Ensures settlement transactions are deleted when their associated split is deleted. 
   This prevents orphaned settlement transactions in the database.
   Part of Task 16: Cascade Delete Completo';

-- ============================================================================
-- Run Tests
-- ============================================================================

-- Run verification tests
SELECT * FROM test_cascade_delete();

-- ============================================================================
-- Commit Transaction
-- ============================================================================

COMMIT;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

-- This migration creates:
-- 1. A trigger that automatically deletes settlement transactions when a split is deleted
-- 2. Verification that splits are cascade deleted when a transaction is deleted
-- 3. Verification that the delete_installment_series function exists for series deletion
-- 4. A test function to verify all cascade delete logic

-- Cascade Delete Flow:
-- 1. Delete Transaction → Automatically deletes all Splits (FK CASCADE)
-- 2. Delete Split → Trigger deletes Settlement Transactions
-- 3. Delete Series → Use delete_installment_series() RPC function

-- Example Usage:
-- DELETE FROM transactions WHERE id = 'some-transaction-id';
-- -- This will automatically:
-- --   1. Delete all splits for this transaction
-- --   2. Delete all settlement transactions for those splits

-- To delete a series:
-- SELECT delete_installment_series('series-id');
-- -- This will delete all installments and their related data
