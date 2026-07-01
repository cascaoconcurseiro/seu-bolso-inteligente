-- Temp: get view definitions + table schemas from remote
-- Auto-dropped after use

CREATE OR REPLACE FUNCTION public.run_get_schema()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'views', (
      SELECT jsonb_agg(jsonb_build_object(
        'name', viewname,
        'definition', definition
      ))
      FROM pg_views
      WHERE schemaname = 'public'
        AND viewname IN ('transactions_ssot', 'shared_transactions_view',
                         'shared_transactions_for_current_user', 'transactions_ssot',
                         'active_families', 'active_family_members', 'active_trips',
                         'active_trip_members', 'trip_budget_summary', 'user_net_worth',
                         'transaction_splits_with_settlement')
    ),
    'tables', (
      SELECT jsonb_agg(jsonb_build_object(
        'name', table_name,
        'columns', (
          SELECT jsonb_agg(jsonb_build_object(
            'col', column_name,
            'type', data_type,
            'nullable', is_nullable,
            'default', column_default
          ) ORDER BY ordinal_position)
          FROM information_schema.columns c
          WHERE c.table_name = t.table_name AND c.table_schema = 'public'
        )
      ))
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name IN ('accounts', 'transactions', 'profiles', 'categories',
                             'budgets', 'families', 'family_members', 'family_invitations',
                             'trips', 'trip_members', 'trip_invitations', 'trip_checklist',
                             'trip_itinerary', 'trip_exchange_purchases', 'notifications',
                             'notification_preferences', 'asset_transactions', 'transaction_auto_share_rules',
                             'transaction_splits')
    ),
    'enums', (
      SELECT jsonb_agg(jsonb_build_object(
        'name', t.typname,
        'values', (SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
                   FROM pg_enum e WHERE e.enumtypid = t.oid)
      ))
      FROM pg_type t
      WHERE t.typnamespace = 'public'::regnamespace
        AND t.typtype = 'e'
    ),
    'extensions', (
      SELECT jsonb_agg(extname)
      FROM pg_extension
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_get_schema() TO authenticated;
