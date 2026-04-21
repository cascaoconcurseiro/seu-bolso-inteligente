-- ============================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA
-- Remover SECURITY DEFINER de Views
-- Data: 20/04/2026
-- Severidade: CRÍTICA
-- ============================================

-- PROBLEMA:
-- Views com SECURITY DEFINER ignoram RLS e permitem
-- que qualquer usuário veja dados de outros usuários

-- SOLUÇÃO:
-- Recriar views com security_invoker = true
-- para respeitar RLS e permissões do usuário atual

-- ============================================
-- 1. FIX: shared_transactions_for_current_user
-- ============================================

-- Dropar view existente (se existir)
DROP VIEW IF EXISTS public.shared_transactions_for_current_user CASCADE;

-- Recriar com security_invoker = true
CREATE VIEW public.shared_transactions_for_current_user
WITH (security_invoker = true)  -- ✅ SEGURO: Respeita RLS
AS 
SELECT 
  t.id,
  t.user_id,
  t.account_id,
  t.category_id,
  t.amount,
  t.type,
  t.description,
  t.date,
  t.competence_date,
  t.is_shared,
  t.is_recurring,
  t.recurrence_id,
  t.installment_number,
  t.total_installments,
  t.trip_id,
  t.currency,
  t.notes,
  t.created_at,
  t.updated_at
FROM transactions t
WHERE t.is_shared = true
  AND (
    -- Transação criada pelo usuário atual
    t.user_id = auth.uid()
    OR
    -- Ou usuário está em um split desta transação
    EXISTS (
      SELECT 1 
      FROM transaction_splits ts
      WHERE ts.transaction_id = t.id
        AND ts.user_id = auth.uid()
    )
  );

COMMENT ON VIEW public.shared_transactions_for_current_user IS 
'View segura de transações compartilhadas. Respeita RLS e mostra apenas transações do usuário atual ou onde ele está incluído em splits.';

-- ============================================
-- 2. FIX: trip_budget_summary
-- ============================================

-- Dropar view existente (se existir)
DROP VIEW IF EXISTS public.trip_budget_summary CASCADE;

-- Recriar com security_invoker = true
CREATE VIEW public.trip_budget_summary
WITH (security_invoker = true)  -- ✅ SEGURO: Respeita RLS
AS 
SELECT 
  t.trip_id,
  tr.name as trip_name,
  tr.destination,
  tr.start_date,
  tr.end_date,
  tr.budget as total_budget,
  COALESCE(SUM(t.amount), 0) as total_spent,
  tr.budget - COALESCE(SUM(t.amount), 0) as remaining_budget,
  COUNT(t.id) as transaction_count,
  CASE 
    WHEN tr.budget > 0 THEN 
      (COALESCE(SUM(t.amount), 0) / tr.budget * 100)
    ELSE 0 
  END as budget_percentage
FROM trips tr
LEFT JOIN transactions t ON t.trip_id = tr.id
WHERE 
  -- Apenas viagens onde o usuário é membro
  EXISTS (
    SELECT 1 
    FROM trip_members tm
    WHERE tm.trip_id = tr.id
      AND tm.user_id = auth.uid()
  )
GROUP BY 
  t.trip_id, 
  tr.name, 
  tr.destination, 
  tr.start_date, 
  tr.end_date, 
  tr.budget;

COMMENT ON VIEW public.trip_budget_summary IS 
'View segura de resumo de orçamento de viagens. Respeita RLS e mostra apenas viagens onde o usuário é membro.';

-- ============================================
-- 3. FIX: shared_transactions_view
-- ============================================

-- Dropar view existente (se existir)
DROP VIEW IF EXISTS public.shared_transactions_view CASCADE;

-- Recriar com security_invoker = true
CREATE VIEW public.shared_transactions_view
WITH (security_invoker = true)  -- ✅ SEGURO: Respeita RLS
AS 
SELECT 
  t.id as transaction_id,
  t.user_id as payer_id,
  t.account_id,
  t.category_id,
  t.amount as total_amount,
  t.type,
  t.description,
  t.date,
  t.competence_date,
  t.trip_id,
  t.currency,
  t.created_at,
  t.updated_at,
  -- Dados do split
  ts.id as split_id,
  ts.member_id,
  ts.user_id as debtor_id,
  ts.percentage,
  ts.amount as split_amount,
  ts.is_settled,
  ts.settled_at,
  ts.settled_transaction_id,
  ts.settled_by_debtor,
  ts.settled_by_creditor,
  -- Dados do membro
  p.full_name as member_name,
  p.email as member_email
FROM transactions t
INNER JOIN transaction_splits ts ON t.id = ts.transaction_id
LEFT JOIN profiles p ON ts.user_id = p.id
WHERE 
  t.is_shared = true
  AND (
    -- Usuário é o pagador original
    t.user_id = auth.uid()
    OR
    -- Ou usuário está no split (deve)
    ts.user_id = auth.uid()
  );

COMMENT ON VIEW public.shared_transactions_view IS 
'View segura de transações compartilhadas com splits. Respeita RLS e mostra apenas transações onde o usuário é pagador ou devedor.';

-- ============================================
-- VERIFICAÇÃO DE SEGURANÇA
-- ============================================

-- Verificar que views foram criadas corretamente
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Contar views criadas
  SELECT COUNT(*) INTO v_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN (
      'shared_transactions_for_current_user',
      'trip_budget_summary',
      'shared_transactions_view'
    );
  
  IF v_count = 3 THEN
    RAISE NOTICE '✅ Todas as 3 views foram criadas com sucesso';
  ELSE
    RAISE WARNING '⚠️ Apenas % de 3 views foram criadas', v_count;
  END IF;
END $$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Garantir que usuários autenticados podem usar as views
GRANT SELECT ON public.shared_transactions_for_current_user TO authenticated;
GRANT SELECT ON public.trip_budget_summary TO authenticated;
GRANT SELECT ON public.shared_transactions_view TO authenticated;

-- ============================================
-- TESTE DE SEGURANÇA (Comentado - executar manualmente)
-- ============================================

/*
-- Teste 1: Verificar que view respeita RLS
-- Execute como usuário não-admin

-- Deve retornar apenas transações do usuário atual
SELECT COUNT(*) FROM shared_transactions_for_current_user;

-- Deve retornar apenas viagens do usuário atual
SELECT COUNT(*) FROM trip_budget_summary;

-- Deve retornar apenas splits do usuário atual
SELECT COUNT(*) FROM shared_transactions_view;

-- Teste 2: Verificar que não há bypass de RLS
-- Tentar acessar dados de outro usuário (deve falhar ou retornar vazio)
SELECT * FROM shared_transactions_view 
WHERE payer_id != auth.uid() 
  AND debtor_id != auth.uid();
-- Deve retornar 0 linhas

*/

-- ============================================
-- LOGGING
-- ============================================

-- Registrar correção aplicada
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CORREÇÃO DE SEGURANÇA APLICADA COM SUCESSO';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Data: %', NOW();
  RAISE NOTICE 'Migration: 20260420000002_fix_security_definer_views';
  RAISE NOTICE 'Views corrigidas: 3';
  RAISE NOTICE '  - shared_transactions_for_current_user';
  RAISE NOTICE '  - trip_budget_summary';
  RAISE NOTICE '  - shared_transactions_view';
  RAISE NOTICE 'Status: security_invoker = true (SEGURO)';
  RAISE NOTICE '============================================';
END $$;
