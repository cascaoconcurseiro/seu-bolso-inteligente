DO $$
DECLARE
  definition text := pg_get_functiondef('public.process_credit_card_invoices()'::regprocedure);
  broken_filter text := 'type = ''CREDIT_CARD'' AND deleted = false AND is_active = true';
  fixed_filter text := 'type = ''CREDIT_CARD'' AND deleted_at IS NULL AND is_active = true';
BEGIN
  IF position(broken_filter IN definition) = 0 THEN
    RAISE EXCEPTION 'Expected obsolete deleted flag in process_credit_card_invoices';
  END IF;

  EXECUTE replace(definition, broken_filter, fixed_filter);
END;
$$;
