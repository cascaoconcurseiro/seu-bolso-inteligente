-- These exact overloads are obsolete and reference removed schema objects.
-- Active app flows use v2 settlement APIs; no frontend, downloaded deployed
-- Edge Function source, or cron job references these RPCs. Do not CASCADE:
-- fail if another database object has a tracked dependency to review first.
DROP FUNCTION IF EXISTS public.confirm_settlement(uuid[], uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.reject_settlement_request(uuid, text);
DROP FUNCTION IF EXISTS public.calculate_balance_between_users(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.settle_balance_between_users(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_reset_all_data();
DROP FUNCTION IF EXISTS public.admin_reset_single_user(uuid);
