-- Fix search_path for all remaining functions using ALTER

-- 8. calculate_account_balance
ALTER FUNCTION public.calculate_account_balance(UUID) SET search_path = public;

-- 9. is_trip_member
ALTER FUNCTION public.is_trip_member(UUID, UUID) SET search_path = public;

-- 10. sync_account_balance
ALTER FUNCTION public.sync_account_balance() SET search_path = public;

-- 11. recalculate_all_account_balances
ALTER FUNCTION public.recalculate_all_account_balances() SET search_path = public;

-- 12. get_user_trip_ids
ALTER FUNCTION public.get_user_trip_ids(UUID) SET search_path = public;

-- 13. auto_link_family_member
ALTER FUNCTION public.auto_link_family_member() SET search_path = public;;
