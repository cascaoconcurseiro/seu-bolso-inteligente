DO $$
DECLARE
  definition text;
BEGIN
  definition := pg_get_functiondef('public.get_admin_system_stats()'::regprocedure);
  IF position('COALESCE(deleted, false) = false' IN definition) = 0 THEN
    RAISE EXCEPTION 'Expected legacy deletion filter in get_admin_system_stats';
  END IF;
  EXECUTE replace(definition, 'COALESCE(deleted, false) = false', 'deleted_at IS NULL');

  definition := pg_get_functiondef('public.get_admin_users_detailed()'::regprocedure);
  IF position('COALESCE(a.deleted,false)=false' IN definition) = 0
     OR position('COALESCE(t.deleted,false)=false' IN definition) = 0 THEN
    RAISE EXCEPTION 'Expected legacy deletion filters in get_admin_users_detailed';
  END IF;
  EXECUTE replace(
    replace(definition, 'COALESCE(a.deleted,false)=false', 'a.deleted_at IS NULL'),
    'COALESCE(t.deleted,false)=false', 't.deleted_at IS NULL'
  );

  definition := pg_get_functiondef('public.get_admin_user_dossier(uuid)'::regprocedure);
  IF position('COALESCE(a.deleted,false)=false' IN definition) = 0
     OR position('COALESCE(t.deleted,false)=false' IN definition) = 0 THEN
    RAISE EXCEPTION 'Expected legacy deletion filters in get_admin_user_dossier';
  END IF;
  EXECUTE replace(
    replace(definition, 'COALESCE(a.deleted,false)=false', 'a.deleted_at IS NULL'),
    'COALESCE(t.deleted,false)=false', 't.deleted_at IS NULL'
  );
END;
$$;
