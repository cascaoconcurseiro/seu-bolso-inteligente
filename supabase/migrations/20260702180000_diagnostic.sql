-- Diagnostic migration (applied — placeholder)
BEGIN;
DO $$ BEGIN RAISE NOTICE 'Diagnostic completo'; END; $$;
COMMIT;
