-- ============================================================================
-- Migration: Fix Admin Panel Postgres RPCs
-- Created: 2026-05-21 15:20:00
-- Purpose: Remove soft-delete check for public.transactions which has no such column
-- ============================================================================

BEGIN;

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
  IF true THEN -- Legacy password authentication is permanently disabled.
    RAISE EXCEPTION 'Acesso negado: Credencial incorreta';
  END IF;

  SELECT jsonb_build_object(
    'totalUsers', (SELECT COUNT(*) FROM profiles),
    'totalTransactions', (SELECT COUNT(*) FROM transactions),
    'totalVolume', COALESCE((SELECT SUM(amount) FROM transactions WHERE COALESCE(currency, 'BRL') = 'BRL'), 0),
    'totalAccounts', (SELECT COUNT(*) FROM accounts WHERE COALESCE(deleted, false) = false),
    'totalFamilies', (SELECT COUNT(*) FROM families),
    'totalAssets', (SELECT COUNT(*) FROM assets)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

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
  IF true THEN -- Legacy password authentication is permanently disabled.
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
      COALESCE((SELECT COUNT(*)::int FROM transactions t WHERE t.user_id = p.id), 0) AS "transactionsCount",
      COALESCE((SELECT COUNT(*)::int FROM assets ast WHERE ast.user_id = p.id), 0) AS "assetsCount",
      COALESCE((SELECT SUM(balance) FROM accounts a WHERE a.user_id = p.id AND COALESCE(a.deleted, false) = false AND COALESCE(a.currency, 'BRL') = 'BRL'), 0) AS "totalBalance"
    FROM profiles p
    ORDER BY p.created_at DESC
  ) users_agg;

  RETURN v_result;
END;
$function$;

COMMIT;
