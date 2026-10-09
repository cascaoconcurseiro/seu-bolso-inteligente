DO $$
DECLARE
  definition text := pg_get_functiondef('public.process_daily_yields()'::regprocedure);
  old_columns text := E'          type, \n          is_paid, \n          competence_date';
  new_columns text := E'          type, \n          competence_date';
  old_values text := E'          ''income'',\n          true,\n          DATE_TRUNC(''month'', v_target_date)::date';
  new_values text := E'          ''INCOME'',\n          DATE_TRUNC(''month'', v_target_date)::date';
BEGIN
  IF position(old_columns IN definition) = 0 OR position(old_values IN definition) = 0 THEN
    RAISE EXCEPTION 'Expected outdated process_daily_yields insert shape was not found';
  END IF;

  EXECUTE replace(replace(definition, old_columns, new_columns), old_values, new_values);
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_auto_cdi_yield_once_per_day
  ON public.transactions (account_id, date)
  WHERE description = 'Rendimento Automático (CDI)'
    AND deleted_at IS NULL;
