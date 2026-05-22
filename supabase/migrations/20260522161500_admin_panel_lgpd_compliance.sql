-- ============================================================================
-- Migration: Admin Panel LGPD Compliance (Remove User Balances)
-- Created: 2026-05-22 16:15:00
-- Purpose: Protect user privacy by preventing balances from being computed or returned in admin RPCs
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. UPDATE DETAILED USER DIRECTORY RPC (Omit Consolidation Balance)
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
       0::numeric AS "totalBalance" -- LGPD Compliance: Omitindo cálculo de saldos consolidados
     FROM profiles p
     ORDER BY p.created_at DESC
   ) users_agg;
 
   RETURN v_result;
 END;
 $function$;

-- ============================================================================
-- 2. UPDATE PROFILE DOSSIER RPC (Omit Account Balance)
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
         'balance', 0::numeric -- LGPD Compliance: Omitindo saldo da conta individual
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

COMMIT;
