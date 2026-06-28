-- ============================================================================
-- Migration: Replace hardcoded admin password with JWT-based admin table check
-- Created: 2026-06-28
-- Purpose: Remove '909496' hardcoded password; use admin_users table instead.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADMIN USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now() NOT NULL,
  granted_by uuid REFERENCES auth.users(id)
);

-- Only service_role can modify this table — no RLS bypass for regular users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM public, anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;  -- needed for internal RPC checks

-- ============================================================================
-- 2. HELPER: is_admin()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- 3. REPLACE ADMIN RPCs — drop old password-based signatures, recreate clean
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_admin_system_stats(text);
DROP FUNCTION IF EXISTS public.get_admin_users_detailed(text);
DROP FUNCTION IF EXISTS public.get_admin_audit_logs(text);
DROP FUNCTION IF EXISTS public.get_admin_user_dossier(text, uuid);
DROP FUNCTION IF EXISTS public.clean_old_audit_logs(text, integer);
DROP FUNCTION IF EXISTS public.admin_reset_all_data(text);
DROP FUNCTION IF EXISTS public.admin_reset_single_user(text, uuid);

CREATE OR REPLACE FUNCTION public.get_admin_system_stats()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN jsonb_build_object(
    'totalUsers', (SELECT COUNT(*) FROM profiles),
    'totalTransactions', (SELECT COUNT(*) FROM transactions WHERE COALESCE(deleted, false) = false),
    'totalVolume', COALESCE((SELECT SUM(amount) FROM transactions WHERE COALESCE(deleted, false) = false AND COALESCE(currency, 'BRL') = 'BRL'), 0),
    'totalAccounts', (SELECT COUNT(*) FROM accounts WHERE COALESCE(deleted, false) = false),
    'totalFamilies', (SELECT COUNT(*) FROM families),
    'totalAssets', (SELECT COUNT(*) FROM assets)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_users_detailed()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT COALESCE(jsonb_agg(u), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      p.id, p.email, p.full_name, p.created_at,
      COALESCE((SELECT COUNT(*)::int FROM accounts a WHERE a.user_id = p.id AND COALESCE(a.deleted,false)=false), 0) AS "accountsCount",
      COALESCE((SELECT COUNT(*)::int FROM transactions t WHERE t.user_id = p.id AND COALESCE(t.deleted,false)=false), 0) AS "transactionsCount"
    FROM profiles p
    ORDER BY p.created_at DESC
  ) u;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_audit_logs()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT COALESCE(jsonb_agg(l ORDER BY l.changed_at DESC), '[]'::jsonb) INTO v_result
  FROM (SELECT * FROM public.audit_log ORDER BY changed_at DESC LIMIT 500) l;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_user_dossier(target_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = target_user_id),
    'accounts', (SELECT COALESCE(jsonb_agg(a), '[]') FROM accounts a WHERE a.user_id = target_user_id AND COALESCE(a.deleted,false)=false),
    'transactionCount', (SELECT COUNT(*) FROM transactions t WHERE t.user_id = target_user_id AND COALESCE(t.deleted,false)=false)
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clean_old_audit_logs(p_days_to_keep integer)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE v_deleted integer := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  DELETE FROM public.audit_log WHERE changed_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_all_data()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  DELETE FROM trip_checklist; DELETE FROM trip_itinerary; DELETE FROM trip_participants;
  DELETE FROM trip_members; DELETE FROM trip_exchange_purchases; DELETE FROM trip_invitations;
  DELETE FROM trips; DELETE FROM transaction_splits; DELETE FROM transactions;
  DELETE FROM budgets; DELETE FROM goals; DELETE FROM assets; DELETE FROM accounts;
  DELETE FROM family_invitations; DELETE FROM family_members; DELETE FROM families;
  DELETE FROM notifications; DELETE FROM category_keywords; DELETE FROM user_category_learning;
  DELETE FROM categories WHERE user_id IS NOT NULL; DELETE FROM audit_log;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_single_user(target_user_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  DELETE FROM trip_checklist WHERE user_id = target_user_id;
  DELETE FROM trip_itinerary WHERE user_id = target_user_id;
  DELETE FROM trip_participants WHERE user_id = target_user_id;
  DELETE FROM trip_members WHERE user_id = target_user_id;
  DELETE FROM trip_exchange_purchases WHERE user_id = target_user_id;
  DELETE FROM trip_invitations WHERE from_user_id = target_user_id OR to_user_id = target_user_id;
  DELETE FROM trips WHERE owner_id = target_user_id;
  DELETE FROM transaction_splits WHERE user_id = target_user_id;
  DELETE FROM transactions WHERE user_id = target_user_id OR creator_user_id = target_user_id;
  DELETE FROM budgets WHERE user_id = target_user_id;
  DELETE FROM goals WHERE user_id = target_user_id;
  DELETE FROM assets WHERE user_id = target_user_id;
  DELETE FROM accounts WHERE user_id = target_user_id;
  DELETE FROM family_invitations WHERE from_user_id = target_user_id OR to_user_id = target_user_id;
  DELETE FROM family_members WHERE family_id IN (SELECT id FROM families WHERE owner_id = target_user_id);
  DELETE FROM families WHERE owner_id = target_user_id;
  DELETE FROM family_members WHERE user_id = target_user_id;
  DELETE FROM notifications WHERE user_id = target_user_id;
  DELETE FROM user_category_learning WHERE user_id = target_user_id;
  DELETE FROM categories WHERE user_id = target_user_id;
  DELETE FROM audit_log WHERE changed_by = target_user_id;
END;
$function$;

-- ============================================================================
-- 4. GRANT EXECUTE — only authenticated, protected internally by is_admin()
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_admin_system_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_detailed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_dossier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clean_old_audit_logs(integer) TO authenticated;

-- Destructive functions: service_role only (called from Edge Functions, not the browser)
REVOKE EXECUTE ON FUNCTION public.admin_reset_all_data() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_single_user(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_all_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_single_user(uuid) TO service_role;

COMMIT;
