-- =====================================================
-- MIGRATION: Suite de Testes Automatizados
-- Data: 2026-01-01
-- Descrição: Testes de integridade e funcionalidade
-- =====================================================

-- 1. CRIAR SCHEMA DE TESTES
-- =====================================================

CREATE SCHEMA IF NOT EXISTS tests;

-- 2. FUNÇÃO AUXILIAR: ASSERT
-- =====================================================

CREATE OR REPLACE FUNCTION tests.assert_equals(
  p_expected ANYELEMENT,
  p_actual ANYELEMENT,
  p_message TEXT DEFAULT 'Assertion failed'
)
RETURNS VOID
LANGUAGE plpgsql
AS $
BEGIN
  IF p_expected IS DISTINCT FROM p_actual THEN
    RAISE EXCEPTION '% - Expected: %, Got: %', p_message, p_expected, p_actual;
  END IF;
  RAISE NOTICE '✓ %', p_message;
END;
$;

CREATE OR REPLACE FUNCTION tests.assert_true(
  p_condition BOOLEAN,
  p_message TEXT DEFAULT 'Assertion failed'
)
RETURNS VOID
LANGUAGE plpgsql
AS $
BEGIN
  IF NOT p_condition THEN
    RAISE EXCEPTION '%', p_message;
  END IF;
  RAISE NOTICE '✓ %', p_message;
END;
$;

-- 3. TESTE: CASCADE DELETE
-- =====================================================

CREATE OR REPLACE FUNCTION tests.test_cascade_delete_transaction()
RETURNS VOID
LANGUAGE plpgsql
AS $
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
  v_split_count INTEGER;
  v_ledger_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST: CASCADE DELETE TRANSACTION ===';
  
  -- Setup
  INSERT INTO profiles (id, email, full_name)
  VALUES (gen_random_uuid(), 'test_cascade@test.com', 'Test User')
  RETURNING id INTO v_user_id;
  
  INSERT INTO transactions (user_id, amount, description, date, type, is_shared)
  VALUES (v_user_id, 100, 'Test Transaction', CURRENT_DATE, 'EXPENSE', TRUE)
  RETURNING id INTO v_tx_id;
  
  INSERT INTO transaction_splits (transaction_id, amount, percentage, name)
  VALUES (v_tx_id, 50, 50, 'Test Split');
  
  -- Verificar que split foi criado
  SELECT COUNT(*) INTO v_split_count
  FROM transaction_splits WHERE transaction_id = v_tx_id;
  PERFORM tests.assert_equals(1, v_split_count, 'Split created');
  
  -- Test: Deletar transação
  DELETE FROM transactions WHERE id = v_tx_id;
  
  -- Assert: Split deve ter sido deletado
  SELECT COUNT(*) INTO v_split_count
  FROM transaction_splits WHERE transaction_id = v_tx_id;
  PERFORM tests.assert_equals(0, v_split_count, 'Split deleted via CASCADE');
  
  -- Cleanup
  DELETE FROM profiles WHERE id = v_user_id;
  
  RAISE NOTICE '✅ TEST PASSED: CASCADE DELETE';
END;
$;

-- 4. TESTE: CÁLCULO DE SALDO
-- =====================================================

CREATE OR REPLACE FUNCTION tests.test_calculate_account_balance()
RETURNS VOID
LANGUAGE plpgsql
AS $
DECLARE
  v_user_id UUID;
  v_account_id UUID;
  v_balance NUMERIC;
BEGIN
  RAISE NOTICE '=== TEST: CALCULATE ACCOUNT BALANCE ===';
  
  -- Setup
  INSERT INTO profiles (id, email, full_name)
  VALUES (gen_random_uuid(), 'test_balance@test.com', 'Test User')
  RETURNING id INTO v_user_id;
  
  INSERT INTO accounts (user_id, name, type, balance, initial_balance)
  VALUES (v_user_id, 'Test Account', 'CHECKING', 0, 0)
  RETURNING id INTO v_account_id;
  
  -- Adicionar receita de 1000
  INSERT INTO transactions (user_id, account_id, amount, description, date, type)
  VALUES (v_user_id, v_account_id, 1000, 'Salary', CURRENT_DATE, 'INCOME');
  
  -- Adicionar despesa de 500
  INSERT INTO transactions (user_id, account_id, amount, description, date, type)
  VALUES (v_user_id, v_account_id, 500, 'Rent', CURRENT_DATE, 'EXPENSE');
  
  -- Test: Calcular saldo
  v_balance := calculate_account_balance(v_account_id);
  
  -- Assert: Saldo deve ser 500 (1000 - 500)
  PERFORM tests.assert_equals(500::NUMERIC, v_balance, 'Balance calculation correct');
  
  -- Cleanup
  DELETE FROM profiles WHERE id = v_user_id;
  
  RAISE NOTICE '✅ TEST PASSED: CALCULATE BALANCE';
END;
$;

-- 5. TESTE: ESPELHAMENTO DE TRANSAÇÕES
-- =====================================================

CREATE OR REPLACE FUNCTION tests.test_transaction_mirroring()
RETURNS VOID
LANGUAGE plpgsql
AS $
DECLARE
  v_user1_id UUID;
  v_user2_id UUID;
  v_family_id UUID;
  v_member_id UUID;
  v_tx_id UUID;
  v_split_id UUID;
  v_mirror_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST: TRANSACTION MIRRORING ===';
  
  -- Setup: Criar dois usuários
  INSERT INTO profiles (id, email, full_name)
  VALUES (gen_random_uuid(), 'test_mirror1@test.com', 'User 1')
  RETURNING id INTO v_user1_id;
  
  INSERT INTO profiles (id, email, full_name)
  VALUES (gen_random_uuid(), 'test_mirror2@test.com', 'User 2')
  RETURNING id INTO v_user2_id;
  
  -- Criar família
  INSERT INTO families (owner_id, name)
  VALUES (v_user1_id, 'Test Family')
  RETURNING id INTO v_family_id;
  
  -- Adicionar user2 como membro
  INSERT INTO family_members (family_id, user_id, name, email, status)
  VALUES (v_family_id, v_user2_id, 'User 2', 'test_mirror2@test.com', 'active')
  RETURNING id INTO v_member_id;
  
  -- Criar transação compartilhada
  INSERT INTO transactions (user_id, amount, description, date, type, is_shared)
  VALUES (v_user1_id, 100, 'Shared Expense', CURRENT_DATE, 'EXPENSE', TRUE)
  RETURNING id INTO v_tx_id;
  
  -- Criar split para user2
  INSERT INTO transaction_splits (transaction_id, user_id, member_id, amount, percentage, name)
  VALUES (v_tx_id, v_user2_id, v_member_id, 50, 50, 'User 2')
  RETURNING id INTO v_split_id;
  
  -- Test: Verificar se transação espelhada foi criada
  SELECT COUNT(*) INTO v_mirror_count
  FROM transactions
  WHERE source_transaction_id = v_tx_id
    AND user_id = v_user2_id;
  
  PERFORM tests.assert_equals(1, v_mirror_count, 'Mirror transaction created');
  
  -- Cleanup
  DELETE FROM profiles WHERE id IN (v_user1_id, v_user2_id);
  
  RAISE NOTICE '✅ TEST PASSED: TRANSACTION MIRRORING';
END;
$;

-- 6. TESTE: SOFT DELETE
-- =====================================================

CREATE OR REPLACE FUNCTION tests.test_soft_delete()
RETURNS VOID
LANGUAGE plpgsql
AS $
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
  v_deleted_at TIMESTAMPTZ;
BEGIN
  RAISE NOTICE '=== TEST: SOFT DELETE ===';
  
  -- Setup
  INSERT INTO profiles (id, email, full_name)
  VALUES (gen_random_uuid(), 'test_soft_delete@test.com', 'Test User')
  RETURNING id INTO v_user_id;
  
  INSERT INTO transactions (user_id, amount, description, date, type)
  VALUES (v_user_id, 100, 'Test Transaction', CURRENT_DATE, 'EXPENSE')
  RETURNING id INTO v_tx_id;
  
  -- Test: Soft delete
  UPDATE transactions
  SET deleted_at = NOW(), deleted_by = v_user_id
  WHERE id = v_tx_id;
  
  -- Assert: deleted_at deve estar preenchido
  SELECT deleted_at INTO v_deleted_at
  FROM transactions WHERE id = v_tx_id;
  
  PERFORM tests.assert_true(v_deleted_at IS NOT NULL, 'Transaction soft deleted');
  
  -- Test: Restaurar
  UPDATE transactions
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = v_tx_id;
  
  SELECT deleted_at INTO v_deleted_at
  FROM transactions WHERE id = v_tx_id;
  
  PERFORM tests.assert_true(v_deleted_at IS NULL, 'Transaction restored');
  
  -- Cleanup
  DELETE FROM profiles WHERE id = v_user_id;
  
  RAISE NOTICE '✅ TEST PASSED: SOFT DELETE';
END;
$;

-- 7. TESTE: AUDIT LOG
-- =====================================================

CREATE OR REPLACE FUNCTION tests.test_audit_log()
RETURNS VOID
LANGUAGE plpgsql
AS $
DECLARE
  v_user_id UUID;
  v_tx_id UUID;
  v_audit_count INTEGER;
BEGIN
  RAISE NOTICE '=== TEST: AUDIT LOG ===';
  
  -- Setup
  INSERT INTO profiles (id, email, full_name)
  VALUES (gen_random_uuid(), 'test_audit@test.com', 'Test User')
  RETURNING id INTO v_user_id;
  
  -- Test: Criar transação (deve gerar audit log)
  INSERT INTO transactions (user_id, amount, description, date, type)
  VALUES (v_user_id, 100, 'Test Transaction', CURRENT_DATE, 'EXPENSE')
  RETURNING id INTO v_tx_id;
  
  -- Assert: Audit log deve ter registro INSERT
  SELECT COUNT(*) INTO v_audit_count
  FROM audit_log
  WHERE table_name = 'transactions'
    AND record_id = v_tx_id
    AND action = 'INSERT';
  
  PERFORM tests.assert_equals(1, v_audit_count, 'Audit log INSERT created');
  
  -- Test: Atualizar transação
  UPDATE transactions
  SET amount = 200
  WHERE id = v_tx_id;
  
  -- Assert: Audit log deve ter registro UPDATE
  SELECT COUNT(*) INTO v_audit_count
  FROM audit_log
  WHERE table_name = 'transactions'
    AND record_id = v_tx_id
    AND action = 'UPDATE';
  
  PERFORM tests.assert_equals(1, v_audit_count, 'Audit log UPDATE created');
  
  -- Cleanup
  DELETE FROM profiles WHERE id = v_user_id;
  
  RAISE NOTICE '✅ TEST PASSED: AUDIT LOG';
END;
$;

-- 8. FUNÇÃO PARA EXECUTAR TODOS OS TESTES
-- =====================================================

CREATE OR REPLACE FUNCTION tests.run_all_tests()
RETURNS TABLE (
  test_name TEXT,
  status TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
AS $
DECLARE
  v_test RECORD;
  v_tests TEXT[] := ARRAY[
    'test_cascade_delete_transaction',
    'test_calculate_account_balance',
    'test_transaction_mirroring',
    'test_soft_delete',
    'test_audit_log'
  ];
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║   RUNNING ALL TESTS                    ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  
  FOREACH test_name IN ARRAY v_tests
  LOOP
    BEGIN
      EXECUTE format('SELECT tests.%I()', test_name);
      status := 'PASSED';
      error_message := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      status := 'FAILED';
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║   ALL TESTS COMPLETED                  ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
END;
$;

-- 9. COMENTÁRIOS
-- =====================================================

COMMENT ON SCHEMA tests IS 'Schema para testes automatizados';
COMMENT ON FUNCTION tests.assert_equals IS 'Verifica se dois valores são iguais';
COMMENT ON FUNCTION tests.assert_true IS 'Verifica se condição é verdadeira';
COMMENT ON FUNCTION tests.run_all_tests IS 'Executa todos os testes e retorna resultados';

