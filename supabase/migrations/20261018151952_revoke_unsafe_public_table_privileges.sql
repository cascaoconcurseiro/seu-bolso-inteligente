-- Data API clients do not need table-maintenance or schema-management
-- privileges. RLS does not filter these privileges, so remove them from
-- existing relations and prevent them from returning on future tables.
REVOKE MAINTAIN, TRUNCATE, TRIGGER, REFERENCES
  ON ALL TABLES IN SCHEMA public
  FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN, TRUNCATE, TRIGGER, REFERENCES ON TABLES
  FROM PUBLIC, anon, authenticated;
