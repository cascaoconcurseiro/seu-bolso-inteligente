-- ============================================================================
-- Migration: Fix Admin Panel RPCs LGPD (Remove t.deleted check in transactions)
-- Created: 2026-05-22 16:20:00
-- Purpose: Remove soft-delete check for public.transactions in LGPD compliant RPC
-- ============================================================================

BEGIN;

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
       COALESCE((SELECT COUNT(*)::int FROM transactions t WHERE t.user_id = p.id), 0) AS "transactionsCount", -- Corrigido: Sem soft-delete para transactions
       COALESCE((SELECT COUNT(*)::int FROM assets ast WHERE ast.user_id = p.id), 0) AS "assetsCount",
       0::numeric AS "totalBalance" -- LGPD Compliance: Omitindo cálculo de saldos consolidados
     FROM profiles p
     ORDER BY p.created_at DESC
   ) users_agg;

   RETURN v_result;
 END;
 $function$;

COMMIT;
