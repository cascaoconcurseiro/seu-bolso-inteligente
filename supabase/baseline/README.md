# Database cutover baseline

`20260713_public_schema.sql` is the canonical schema snapshot after the security
and RLS audit completed on 2026-07-13. It contains the application-owned
`public` and `private` objects. Supabase continues to own `auth`, `storage`,
`realtime` and other platform schemas.

Generate it from the linked production database:

```powershell
$env:SUPABASE_DB_URL = "postgresql://..."
npm run db:baseline
```

The files in `supabase/migrations` before this cutover remain an audit trail for
the existing project. They are not a reliable empty-database bootstrap because
the original core-table migration predates this repository. For disaster
recovery or a new project, restore this baseline first, then apply migrations
created after the cutover marker recorded here.

Never add production data, Auth users, secrets or platform-managed schemas to
this snapshot.
