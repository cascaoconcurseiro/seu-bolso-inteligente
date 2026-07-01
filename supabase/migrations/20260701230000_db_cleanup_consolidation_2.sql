-- ============================================================================
-- MIGRATION: Consolidation #2 — is_family_member + updated_at + overloads
-- Date: 2026-07-01
-- ============================================================================
-- 1. Consolidate is_family_member → is_family_member_v2 (3 versões → 1)
-- 2. Consolidate trigger_set_updated_at → update_updated_at_column (2 funções → 1)
-- 3. Document remaining overloads (settlement functions — low priority)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: Consolidate is_family_member → is_family_member_v2
-- ============================================================================
-- Contexto:
--   is_family_member(fam_id, usr_id)       — usada em 3 políticas SELECT
--   is_family_member_v2(p_family_id, p_user_id) — usada em 2 políticas UPDATE/DELETE
--   is_member_of_family(fam_id, usr_id)    — ZERO referências (órfã)
--
-- Todas fazem a mesma coisa. Consolidamos em is_family_member_v2.

-- 1a. Atualizar política accounts_select_v2
DROP POLICY IF EXISTS "accounts_select_v2" ON public.accounts;
CREATE POLICY "accounts_select_v2" ON public.accounts
  FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR is_family_member_v2(( SELECT families.id FROM families WHERE (families.owner_id = accounts.user_id) LIMIT 1), (SELECT auth.uid()))
    OR (EXISTS ( SELECT 1 FROM family_members WHERE ((family_members.user_id = accounts.user_id) AND is_family_member_v2(family_members.family_id, (SELECT auth.uid())))))
  );

-- 1b. Atualizar política transactions_unified_select
DROP POLICY IF EXISTS "transactions_unified_select" ON public.transactions;
CREATE POLICY "transactions_unified_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid())) OR
    (creator_user_id = (SELECT auth.uid())) OR
    (EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.user_id = transactions.user_id
        AND is_family_member_v2(family_members.family_id, (SELECT auth.uid()))
    )) OR
    (
      (trip_id IS NOT NULL) AND
      (EXISTS (
        SELECT 1 FROM trip_members
        WHERE trip_members.trip_id = transactions.trip_id
          AND trip_members.user_id = (SELECT auth.uid())
      )) AND
      (is_shared = true OR user_id = (SELECT auth.uid()) OR creator_user_id = (SELECT auth.uid()))
    )
  );

-- 1c. Atualizar política family_members_unified_select
DROP POLICY IF EXISTS "family_members_unified_select" ON public.family_members;
CREATE POLICY "family_members_unified_select" ON public.family_members
  FOR SELECT TO authenticated
  USING (
    (user_id = (SELECT auth.uid())) OR
    (linked_user_id = (SELECT auth.uid())) OR
    is_family_member_v2(family_id, (SELECT auth.uid())) OR
    (family_id IN (
      SELECT f.id FROM families f
      WHERE f.owner_id = (SELECT auth.uid())
    ))
  );

-- 1d. Atualizar política "Users can view their families" (criada via SQL Editor,
--     não está em nenhum arquivo de migration)
DROP POLICY IF EXISTS "Users can view their families" ON public.families;
CREATE POLICY "Users can view their families" ON public.families
  FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR is_family_member_v2(id, (SELECT auth.uid()))
  );

-- 1e. Dropar funções obsoletas
DROP FUNCTION IF EXISTS public.is_family_member(text, text);
DROP FUNCTION IF EXISTS public.is_family_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_member_of_family(text, text);
DROP FUNCTION IF EXISTS public.is_member_of_family(uuid, uuid);

-- ============================================================================
-- PHASE 2: Consolidate trigger_set_updated_at → update_updated_at_column
-- ============================================================================
-- Contexto:
--   trigger_set_updated_at() — usada apenas em credit_card_invoices e shared_credit_cards
--   update_updated_at_column() — usada em category_keywords e user_category_learning
--   Ambas fazem exatamente: NEW.updated_at = NOW(); RETURN NEW;

-- 2a. Migrar triggers para usar update_updated_at_column
DROP TRIGGER IF EXISTS set_timestamp_credit_card_invoices ON public.credit_card_invoices;
CREATE TRIGGER set_timestamp_credit_card_invoices
  BEFORE UPDATE ON public.credit_card_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_shared_credit_cards ON public.shared_credit_cards;
CREATE TRIGGER set_timestamp_shared_credit_cards
  BEFORE UPDATE ON public.shared_credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2b. Dropar função obsoleta
DROP FUNCTION IF EXISTS public.trigger_set_updated_at();

-- ============================================================================
-- PHASE 3: Document remaining overloads (não críticos)
-- ============================================================================
-- As funções abaixo têm 2 versões com assinaturas diferentes. Nenhuma é chamada
-- diretamente do frontend atual (são usadas internamente ou legadas).
-- Consolidar futuramente se houver refatoração das RPCs de settlement:
--
--   settle_split(p_split_id, p_account_id, p_amount, p_date)
--     vs settle_split(p_split_id, p_amount, p_account_id, p_user_id)
--
--   settle_multiple_splits(p_split_ids[], p_account_id, p_user_id)
--     vs settle_multiple_splits(p_split_ids[], p_account_id)
--
--   reject_settlement_request(p_split_id, p_reason)
--     vs reject_settlement_request(p_split_id, p_user_id, p_reason)
--
--   fn_create_notification(5 params) vs fn_create_notification(7 params)
--     (ambas intencionais: uma simples, uma com metadata)
--
--   search_transactions(p_user_id, p_search_term, p_limit, p_offset)
--     (versão única ativa, frontend chama via GlobalSearch)
-- ============================================================================

COMMIT;
