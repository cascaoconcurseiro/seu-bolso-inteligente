-- Keep the profile discovery behavior needed by collaboration screens while
-- preventing authenticated clients from selecting private profile settings.
-- The current default grants also expose DELETE/TRUNCATE/TRIGGER to API roles;
-- RLS does not protect against TRUNCATE, so remove every table privilege first.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, avatar_color, avatar_icon)
  ON TABLE public.profiles TO authenticated;

-- The normal signup trigger creates profiles, but keep the client fallback
-- usable if a profile row is missing. Allow only the identity fields it writes
-- and only for the authenticated user's own id.
GRANT INSERT (id, email, full_name)
  ON TABLE public.profiles TO authenticated;

-- Profile settings are edited through the client, but identity and PIN fields
-- must stay under auth/database-controlled paths.
GRANT UPDATE (
  full_name,
  avatar_url,
  avatar_color,
  avatar_icon,
  use_subcategories,
  month_start_day,
  base_currency,
  require_pin_on_open,
  monthly_budget,
  shared_expenses_behavior,
  shared_sync_credit_card_id,
  global_cdi_rate,
  low_balance_threshold,
  default_account_id,
  default_credit_card_id,
  monthly_report_enabled,
  updated_at
)
  ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.get_my_profile_v2()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (to_jsonb(p) - 'app_pin_hash') ||
         jsonb_build_object('has_pin', p.app_pin_hash IS NOT NULL)
  FROM public.profiles AS p
  WHERE p.id = private.authenticated_uid()
$$;

CREATE OR REPLACE FUNCTION public.find_profile_for_family_link_v2(
  p_email text DEFAULT NULL,
  p_full_name text DEFAULT NULL
)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles AS p
  WHERE p.id <> private.authenticated_uid()
    AND CASE
      WHEN NULLIF(btrim(p_email), '') IS NOT NULL
        THEN lower(p.email) = lower(btrim(p_email))
      WHEN NULLIF(btrim(p_full_name), '') IS NOT NULL
        THEN lower(p.full_name) = lower(btrim(p_full_name))
          AND (
            SELECT count(*)
            FROM public.profiles AS matching_profile
            WHERE matching_profile.id <> private.authenticated_uid()
              AND lower(matching_profile.full_name) = lower(btrim(p_full_name))
          ) = 1
      ELSE false
    END
  ORDER BY p.created_at
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_my_profile_v2() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_profile_for_family_link_v2(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_v2() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_profile_for_family_link_v2(text, text) TO authenticated, service_role;
