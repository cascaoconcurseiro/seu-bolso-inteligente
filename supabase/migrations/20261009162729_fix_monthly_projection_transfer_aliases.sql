DO $$
DECLARE
  definition text := pg_get_functiondef('public.get_monthly_projection(uuid,date,character varying)'::regprocedure);
  broken_pattern text := 'WHERE t\.user_id = p_user_id AND t\.deleted_at IS NULL AND \(a\.id IS NULL OR a\.deleted_at IS NULL\)\s+AND t\.type = ''TRANSFER''';
  fixed_filter text := E'WHERE t.user_id = p_user_id AND t.deleted_at IS NULL\n      AND a_src.deleted_at IS NULL\n      AND a_dst.deleted_at IS NULL\n      AND t.type = ''TRANSFER''';
  match_count integer;
BEGIN
  SELECT count(*) INTO match_count
  FROM regexp_matches(definition, broken_pattern, 'g');

  IF match_count <> 2 THEN
    RAISE EXCEPTION 'Expected exactly two broken transfer filters in get_monthly_projection';
  END IF;

  EXECUTE regexp_replace(definition, broken_pattern, fixed_filter, 'g');
END;
$$;
