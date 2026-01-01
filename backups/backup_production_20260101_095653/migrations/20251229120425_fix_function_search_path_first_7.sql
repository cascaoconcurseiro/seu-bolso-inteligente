-- Fix search_path for first 7 functions using ALTER

-- 1. update_family_invitations_updated_at
ALTER FUNCTION public.update_family_invitations_updated_at() SET search_path = public;

-- 2. user_is_trip_member
ALTER FUNCTION public.user_is_trip_member(UUID, UUID) SET search_path = public;

-- 3. handle_invitation_accepted
ALTER FUNCTION public.handle_invitation_accepted() SET search_path = public;

-- 4. handle_trip_invitation_accepted
ALTER FUNCTION public.handle_trip_invitation_accepted() SET search_path = public;

-- 5. user_can_view_trip
ALTER FUNCTION public.user_can_view_trip(UUID, UUID) SET search_path = public;

-- 6. sync_transaction_settled_status
ALTER FUNCTION public.sync_transaction_settled_status() SET search_path = public;

-- 7. add_trip_owner
ALTER FUNCTION public.add_trip_owner() SET search_path = public;;
