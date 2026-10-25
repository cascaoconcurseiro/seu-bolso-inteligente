-- The admin reset panel is intentionally disabled. These SECURITY DEFINER
-- functions are destructive, reference obsolete schema, and have no app or
-- Edge Function callers. Keep their owner access only; deny all API roles.
REVOKE ALL ON FUNCTION public.admin_reset_all_data()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_reset_single_user(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
