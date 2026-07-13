-- Privileged functions must never be callable by unauthenticated clients.
-- Keep existing explicit authenticated/service grants while removing the
-- implicit PUBLIC path and the legacy anon grants added for PostgREST routing.
do $migration$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format('revoke execute on function %s from public', fn.signature);
    execute format('revoke execute on function %s from anon', fn.signature);
  end loop;
end
$migration$;

-- Functions are executable by PUBLIC by default in PostgreSQL. Future
-- migrations must grant EXECUTE explicitly to authenticated/service roles.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon;
