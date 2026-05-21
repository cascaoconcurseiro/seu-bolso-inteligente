-- =====================================================================
-- MIGRATION: 20260518131300_optimize_db_and_hardening.sql
-- DESCRIÇÃO: Otimização de performance de banco de dados e blindagem de segurança.
-- =====================================================================

-- =====================================================================
-- 1. REMOÇÃO DE ÍNDICES DUPLICADOS ( DBA )
-- Reduz o consumo de espaço em disco e acelera inserções e atualizações.
-- =====================================================================

-- Tabela family_members
DROP INDEX IF EXISTS public.idx_family_members_family;
DROP INDEX IF EXISTS public.idx_family_members_user;

-- Tabela transaction_splits
DROP INDEX IF EXISTS public.idx_splits_tx_id;
DROP INDEX IF EXISTS public.idx_transaction_splits_tx_id;

-- Tabela transactions
DROP INDEX IF EXISTS public.idx_transactions_user_date;


-- =====================================================================
-- 2. BLINDAGEM DE FUNÇÕES CRÍTICAS SECURITY DEFINER ( Segurança Financeira )
-- Bloqueia a execução pública e anônima de funções confidenciais e administrativas.
-- =====================================================================

-- Revoga a execução pública das funções de Reset de Dados
REVOKE EXECUTE ON FUNCTION public.admin_reset_all_data() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_single_user(uuid) FROM public, anon, authenticated;

-- Revoga a execução pública de funções críticas de liquidação de despesas compartilhadas
REVOKE EXECUTE ON FUNCTION public.confirm_settlement_receipt(uuid[], uuid, uuid, date, uuid, numeric) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.settle_split(uuid, numeric, uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.settle_multiple_splits(uuid[], uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.undo_settlement(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.reject_settlement_request(uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.reject_settlement_request(uuid, uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.request_settlement_confirmation(uuid, uuid, numeric, text, uuid[]) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.request_settlement_confirmation(uuid[], uuid, uuid, numeric, text) FROM public, anon;

-- Revoga a execução pública de funções de notificação e sync automático
REVOKE EXECUTE ON FUNCTION public.fn_create_notification(uuid, text, text, text, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_notification(uuid, text, text, text, text, jsonb, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.fn_handle_recurring_transactions() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.fn_sync_asset_summary() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.assign_default_account_to_orphans(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, date, date) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_evolution_report(uuid, integer) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_financial_summary(uuid, date, date) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_net_worth(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_shared_expense_summary_by_person(uuid, date, date) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_shared_invoice_data(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_budgets_progress(uuid, date, date) FROM public, anon;


-- =====================================================================
-- 3. OTIMIZAÇÃO DO PLANO DE INICIALIZAÇÃO DO RLS ( Arquiteto & DBA )
-- Embrulha as funções de autenticação em subconsultas para evitar avaliação linha a linha.
-- =====================================================================

-- Otimização RLS: accounts (Contas)
DROP POLICY IF EXISTS "accounts_select_v2" ON public.accounts;
CREATE POLICY "accounts_select_v2" ON public.accounts 
  FOR SELECT TO authenticated 
  USING (
    (user_id = (SELECT auth.uid())) 
    OR is_family_member(( SELECT families.id FROM families WHERE (families.owner_id = accounts.user_id) LIMIT 1), (SELECT auth.uid())) 
    OR (EXISTS ( SELECT 1 FROM family_members WHERE ((family_members.user_id = accounts.user_id) AND is_family_member(family_members.family_id, (SELECT auth.uid())))))
  );

-- Otimização RLS: transactions (Transações)
DROP POLICY IF EXISTS "transactions_select_v2" ON public.transactions;
CREATE POLICY "transactions_select_v2" ON public.transactions 
  FOR SELECT TO authenticated 
  USING (
    (user_id = (SELECT auth.uid())) 
    OR (creator_user_id = (SELECT auth.uid())) 
    OR (EXISTS ( SELECT 1 FROM family_members WHERE ((family_members.user_id = transactions.user_id) AND is_family_member(family_members.family_id, (SELECT auth.uid())))))
  );

-- Otimização RLS: family_members (Membros da Família)
DROP POLICY IF EXISTS "family_members_select_v2" ON public.family_members;
CREATE POLICY "family_members_select_v2" ON public.family_members 
  FOR SELECT TO authenticated 
  USING (
    (user_id = (SELECT auth.uid())) 
    OR (linked_user_id = (SELECT auth.uid())) 
    OR is_family_member(family_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Family owners can view all family members" ON public.family_members;
CREATE POLICY "Family owners can view all family members" ON public.family_members 
  FOR SELECT TO authenticated 
  USING (family_id IN ( SELECT families.id FROM families WHERE (families.owner_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "family_members_unified_update" ON public.family_members;
CREATE POLICY "family_members_unified_update" ON public.family_members 
  FOR UPDATE TO authenticated 
  USING (
    (user_id = (SELECT auth.uid())) 
    OR (linked_user_id = (SELECT auth.uid())) 
    OR (family_id IN ( SELECT families.id FROM families WHERE (families.owner_id = (SELECT auth.uid())))) 
    OR is_family_member_v2(family_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Family owners and admins can delete members" ON public.family_members;
CREATE POLICY "Family owners and admins can delete members" ON public.family_members 
  FOR DELETE TO authenticated 
  USING (
    (family_id IN ( SELECT families.id FROM families WHERE (families.owner_id = (SELECT auth.uid())))) 
    OR is_family_member_v2(family_id, (SELECT auth.uid()))
  );

-- Otimização RLS: trip_members (Membros da Viagem)
DROP POLICY IF EXISTS "trip_members_insert" ON public.trip_members;
CREATE POLICY "trip_members_insert" ON public.trip_members 
  FOR INSERT TO authenticated 
  WITH CHECK (
    (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = (SELECT auth.uid())))))
  );

DROP POLICY IF EXISTS "trip_members_update" ON public.trip_members;
CREATE POLICY "trip_members_update" ON public.trip_members 
  FOR UPDATE TO authenticated 
  USING (
    (user_id = (SELECT auth.uid())) 
    OR (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = (SELECT auth.uid())))))
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid())) 
    OR (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = (SELECT auth.uid())))))
  );

DROP POLICY IF EXISTS "trip_members_delete" ON public.trip_members;
CREATE POLICY "trip_members_delete" ON public.trip_members 
  FOR DELETE TO authenticated 
  USING (
    (user_id = (SELECT auth.uid())) 
    OR (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.owner_id = (SELECT auth.uid())))))
  );

-- Otimização RLS: transaction_splits (Divisões de Transações)
DROP POLICY IF EXISTS "transaction_splits_select_ssot" ON public.transaction_splits;
CREATE POLICY "transaction_splits_select_ssot" ON public.transaction_splits 
  FOR SELECT TO authenticated 
  USING (
    (user_id = (SELECT auth.uid())) 
    OR check_split_access(transaction_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "transaction_splits_manage_ssot" ON public.transaction_splits;
CREATE POLICY "transaction_splits_manage_ssot" ON public.transaction_splits 
  FOR ALL TO authenticated 
  USING (
    (user_id = (SELECT auth.uid())) 
    OR check_split_access(transaction_id, (SELECT auth.uid()))
  );

-- Otimização RLS: family_invitations (Convites de Família)
DROP POLICY IF EXISTS "Users can delete own sent invitations" ON public.family_invitations;
CREATE POLICY "Users can delete own sent invitations" ON public.family_invitations 
  FOR DELETE TO authenticated 
  USING (from_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own sent invitations" ON public.family_invitations;
CREATE POLICY "Users can update own sent invitations" ON public.family_invitations 
  FOR UPDATE TO authenticated 
  USING (from_user_id = (SELECT auth.uid()))
  WITH CHECK (from_user_id = (SELECT auth.uid()));
