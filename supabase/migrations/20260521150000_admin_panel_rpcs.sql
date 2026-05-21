-- ============================================================================
-- Migration: Add Security-Hardened Admin Panel Postgres RPCs
-- Created: 2026-05-21 15:00:00
-- Purpose: Implement robust backoffice administrative operations with parameter-based authentication
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DROP EXISTING CONFLICTING PROCEDURES (IF ANY)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_admin_system_stats(text);
DROP FUNCTION IF EXISTS public.get_admin_users_detailed(text);
DROP FUNCTION IF EXISTS public.get_admin_audit_logs(text);
DROP FUNCTION IF EXISTS public.get_admin_user_dossier(text, uuid);
DROP FUNCTION IF EXISTS public.clean_old_audit_logs(integer);
DROP FUNCTION IF EXISTS public.clean_old_audit_logs(text, integer);
DROP FUNCTION IF EXISTS public.admin_reset_all_data();
DROP FUNCTION IF EXISTS public.admin_reset_all_data(text);
DROP FUNCTION IF EXISTS public.admin_reset_single_user(uuid);
DROP FUNCTION IF EXISTS public.admin_reset_single_user(text, uuid);

-- ============================================================================
-- 2. CREATE SYSTEM METRICS RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_admin_system_stats(admin_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Strict Password Authentication Layer
  IF admin_password != '909496' THEN
    RAISE EXCEPTION 'Acesso negado: Credencial incorreta';
  END IF;

  SELECT jsonb_build_object(
    'totalUsers', (SELECT COUNT(*) FROM profiles),
    'totalTransactions', (SELECT COUNT(*) FROM transactions WHERE COALESCE(deleted, false) = false),
    'totalVolume', COALESCE((SELECT SUM(amount) FROM transactions WHERE COALESCE(deleted, false) = false AND COALESCE(currency, 'BRL') = 'BRL'), 0),
    'totalAccounts', (SELECT COUNT(*) FROM accounts WHERE COALESCE(deleted, false) = false),
    'totalFamilies', (SELECT COUNT(*) FROM families),
    'totalAssets', (SELECT COUNT(*) FROM assets)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 3. CREATE DETAILED USER DIRECTORY RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_admin_users_detailed(admin_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Strict Password Authentication Layer
  IF admin_password != '909496' THEN
    RAISE EXCEPTION 'Acesso negado: Credencial incorreta';
  END IF;

  SELECT COALESCE(jsonb_agg(users_agg), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      p.id,
      p.email,
      p.full_name,
      p.created_at,
      p.avatar_color,
      p.avatar_icon,
      COALESCE((SELECT COUNT(*)::int FROM accounts a WHERE a.user_id = p.id AND COALESCE(a.deleted, false) = false), 0) AS "accountsCount",
      COALESCE((SELECT COUNT(*)::int FROM transactions t WHERE t.user_id = p.id AND COALESCE(t.deleted, false) = false), 0) AS "transactionsCount",
      COALESCE((SELECT COUNT(*)::int FROM assets ast WHERE ast.user_id = p.id), 0) AS "assetsCount",
      COALESCE((SELECT SUM(balance) FROM accounts a WHERE a.user_id = p.id AND COALESCE(a.deleted, false) = false AND COALESCE(a.currency, 'BRL') = 'BRL'), 0) AS "totalBalance"
    FROM profiles p
    ORDER BY p.created_at DESC
  ) users_agg;

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 4. CREATE CENTRALIZED AUDIT LOGS RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_admin_audit_logs(admin_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Strict Password Authentication Layer
  IF admin_password != '909496' THEN
    RAISE EXCEPTION 'Acesso negado: Credencial incorreta';
  END IF;

  SELECT COALESCE(jsonb_agg(logs_agg), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      id,
      changed_by AS user_id,
      action AS operation,
      table_name,
      record_id,
      old_values AS old_data,
      new_values AS new_data,
      changed_at AS created_at
    FROM public.audit_log
    ORDER BY changed_at DESC
    LIMIT 100
  ) logs_agg;

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 5. CREATE PROFILE DOSSIER RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_admin_user_dossier(admin_password text, target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Strict Password Authentication Layer
  IF admin_password != '909496' THEN
    RAISE EXCEPTION 'Acesso negado: Credencial incorreta';
  END IF;

  SELECT jsonb_build_object(
    'accounts', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'name', name,
        'type', type,
        'balance', balance
      ))
       FROM accounts
       WHERE user_id = target_user_id AND COALESCE(deleted, false) = false
      ), '[]'::jsonb
    ),
    'families', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'name', f.name,
        'role', fm.role,
        'status', fm.status
      ))
       FROM family_members fm
       JOIN families f ON f.id = fm.family_id
       WHERE fm.user_id = target_user_id
      ), '[]'::jsonb
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 6. CREATE AUDIT LOG CLEANUP RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.clean_old_audit_logs(admin_password text, p_days_to_keep integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_singular integer := 0;
BEGIN
  -- Strict Password Authentication Layer
  IF admin_password != '909496' THEN
    RAISE EXCEPTION 'Acesso negado: Credencial incorreta';
  END IF;

  -- Delete from singular audit_log
  DELETE FROM public.audit_log
  WHERE changed_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS v_deleted_singular = ROW_COUNT;

  -- Delete from plural audit_logs (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    EXECUTE 'DELETE FROM public.audit_logs WHERE created_at < NOW() - ($1 || '' days'')::INTERVAL' 
    USING p_days_to_keep;
  END IF;

  RETURN v_deleted_singular;
END;
$function$;

-- ============================================================================
-- 7. CREATE GLOBAL DATA RESET RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_all_data(admin_password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Strict Password Authentication Layer
  IF admin_password != '909496' THEN
    RAISE EXCEPTION 'Acesso negado: Credencial incorreta';
  END IF;

  -- Truncate or delete data in dependency order
  DELETE FROM trip_checklist;
  DELETE FROM trip_itinerary;
  DELETE FROM trip_participants;
  DELETE FROM trip_members;
  DELETE FROM trip_exchange_purchases;
  DELETE FROM trip_invitations;
  DELETE FROM trips;
  DELETE FROM transaction_splits;
  DELETE FROM transactions;
  DELETE FROM budgets;
  DELETE FROM goals;
  DELETE FROM assets;
  DELETE FROM accounts;
  DELETE FROM family_invitations;
  DELETE FROM family_members;
  DELETE FROM families;
  DELETE FROM notifications;
  DELETE FROM category_keywords;
  DELETE FROM user_category_learning;
  DELETE FROM categories WHERE user_id IS NOT NULL; -- Delete custom categories
  DELETE FROM audit_log;
END;
$function$;

-- ============================================================================
-- 8. CREATE TARGETED USER RESET RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_single_user(admin_password text, target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Strict Password Authentication Layer
  IF admin_password != '909496' THEN
    RAISE EXCEPTION 'Acesso negado: Credencial incorreta';
  END IF;

  -- Delete all user data in proper order
  DELETE FROM trip_checklist WHERE user_id = target_user_id;
  DELETE FROM trip_itinerary WHERE user_id = target_user_id;
  DELETE FROM trip_participants WHERE user_id = target_user_id;
  DELETE FROM trip_members WHERE user_id = target_user_id;
  DELETE FROM trip_exchange_purchases WHERE user_id = target_user_id;
  DELETE FROM trip_invitations WHERE from_user_id = target_user_id OR to_user_id = target_user_id;
  
  -- Delete trips where user is owner
  DELETE FROM trips WHERE owner_id = target_user_id;
  
  DELETE FROM transaction_splits WHERE user_id = target_user_id;
  DELETE FROM transactions WHERE user_id = target_user_id OR creator_user_id = target_user_id;
  DELETE FROM budgets WHERE user_id = target_user_id;
  DELETE FROM goals WHERE user_id = target_user_id;
  DELETE FROM assets WHERE user_id = target_user_id;
  DELETE FROM accounts WHERE user_id = target_user_id;
  DELETE FROM family_invitations WHERE from_user_id = target_user_id OR to_user_id = target_user_id;
  
  -- If user is owner of any family, delete the family and its memberships
  DELETE FROM family_members WHERE family_id IN (SELECT id FROM families WHERE owner_id = target_user_id);
  DELETE FROM families WHERE owner_id = target_user_id;
  
  -- Otherwise, just delete their membership
  DELETE FROM family_members WHERE user_id = target_user_id;
  
  DELETE FROM notifications WHERE user_id = target_user_id;
  DELETE FROM user_category_learning WHERE user_id = target_user_id;
  DELETE FROM categories WHERE user_id = target_user_id;
  DELETE FROM audit_log WHERE changed_by = target_user_id;
END;
$function$;

-- ============================================================================
-- 9. PERMISSION HARDENING & EXPLICIT AUTHENTICATED GRANTS
-- ============================================================================

-- Revoke all public / anonymous permissions on all administrative RPCs
REVOKE EXECUTE ON FUNCTION public.get_admin_system_stats(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_users_detailed(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_audit_logs(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_user_dossier(text, uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clean_old_audit_logs(text, integer) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_all_data(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_single_user(text, uuid) FROM public, anon, authenticated;

-- Allow only authenticated users to execute (which are then filtered by the internal password layer)
GRANT EXECUTE ON FUNCTION public.get_admin_system_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_detailed(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_logs(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_dossier(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clean_old_audit_logs(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_all_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_single_user(text, uuid) TO authenticated;

COMMIT;
