-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Revoking only
-- from anon is insufficient because anon inherits PUBLIC privileges.
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Keep future functions closed until a migration grants an explicit client role.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;
