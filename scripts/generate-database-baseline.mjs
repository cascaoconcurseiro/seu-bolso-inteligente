import fs from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const outputPath = process.argv[2] || "supabase/baseline/20260713_public_schema.sql";

if (!connectionString) throw new Error("SUPABASE_DB_URL (or DATABASE_URL) is required");

const databaseUrl = new URL(connectionString);
databaseUrl.searchParams.delete("sslmode");
const client = new pg.Client({
  connectionString: databaseUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const quoteLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const fq = (schema, name) => `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`;

async function rows(sql, params = []) {
  return (await client.query(sql, params)).rows;
}

await client.connect();

try {
  const extensions = await rows(`
    select e.extname as extension_name, n.nspname as schema_name
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname in ('pg_net', 'pg_trgm', 'pgcrypto', 'uuid-ossp')
    order by e.extname
  `);

  const enums = await rows(`
    select n.nspname as schema_name, t.typname as type_name,
           array_agg(e.enumlabel::text order by e.enumsortorder)::text[] as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by n.nspname, t.typname
    order by t.typname
  `);

  const sequences = await rows(`
    select schemaname as schema_name, sequencename as sequence_name,
           data_type, start_value, min_value, max_value, increment_by,
           cycle, cache_size
    from pg_sequences
    where schemaname = 'public'
    order by sequencename
  `);

  const tables = await rows(`
    select c.oid, n.nspname as schema_name, c.relname as table_name,
           c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by c.relname
  `);

  const columns = await rows(`
    select c.oid as table_oid, a.attnum, a.attname as column_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
           a.attnotnull as not_null, a.attidentity as identity_kind,
           a.attgenerated as generated_kind,
           pg_get_expr(d.adbin, d.adrelid) as default_expression
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum
  `);

  const constraints = await rows(`
    select con.oid, con.conrelid as table_oid, con.conname as constraint_name,
           con.contype, pg_get_constraintdef(con.oid, true) as definition
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
    order by case when con.contype = 'f' then 2 else 1 end, c.relname, con.conname
  `);

  const functions = await rows(`
    select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
    order by n.nspname, p.proname, p.oid::regprocedure::text
  `);

  const views = await rows(`
    select n.nspname as schema_name, c.relname as view_name,
           c.relkind, pg_get_viewdef(c.oid, true) as definition,
           coalesce(
             array_agg(distinct dep.relname::text) filter (where dep.relname is not null),
             '{}'::text[]
           )::text[] as dependencies
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_rewrite rw on rw.ev_class = c.oid
    left join pg_depend d on d.objid = rw.oid and d.classid = 'pg_rewrite'::regclass
    left join pg_class dep on dep.oid = d.refobjid and dep.relkind in ('v', 'm') and dep.oid <> c.oid
    left join pg_namespace dn on dn.oid = dep.relnamespace and dn.nspname = 'public'
    where n.nspname = 'public' and c.relkind in ('v', 'm')
    group by n.nspname, c.relname, c.relkind, c.oid
    order by c.relname
  `);

  const indexes = await rows(`
    select i.indexrelid, ci.relname as index_name, pg_get_indexdef(i.indexrelid) as definition
    from pg_index i
    join pg_class ct on ct.oid = i.indrelid
    join pg_namespace n on n.oid = ct.relnamespace
    join pg_class ci on ci.oid = i.indexrelid
    left join pg_constraint con on con.conindid = i.indexrelid
    where n.nspname = 'public' and con.oid is null
    order by ci.relname
  `);

  const triggers = await rows(`
    select c.relname as table_name, t.tgname as trigger_name,
           pg_get_triggerdef(t.oid, true) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal
    order by c.relname, t.tgname
  `);

  const policies = await rows(`
    select schemaname as schema_name, tablename as table_name, policyname,
           permissive, roles::text[] as roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `);

  const grants = await rows(`
    select table_schema as schema_name, table_name, grantee,
           string_agg(privilege_type, ', ' order by privilege_type) as privileges
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated', 'service_role')
    group by table_schema, table_name, grantee
    order by table_name, grantee
  `);

  const sequenceGrants = await rows(`
    select object_schema as schema_name, object_name as sequence_name, grantee,
           string_agg(privilege_type, ', ' order by privilege_type) as privileges
    from information_schema.usage_privileges
    where object_schema = 'public'
      and object_type = 'SEQUENCE'
      and grantee in ('anon', 'authenticated', 'service_role')
    group by object_schema, object_name, grantee
    order by object_name, grantee
  `);

  const routineGrants = await rows(`
    select n.nspname as schema_name, p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as identity_arguments,
           r.rolname as grantee
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    join pg_roles r on r.oid = acl.grantee
    where n.nspname in ('public', 'private')
      and acl.privilege_type = 'EXECUTE'
      and r.rolname in ('anon', 'authenticated', 'service_role')
    order by n.nspname, p.proname, identity_arguments, r.rolname
  `);

  const output = [
    "-- Generated from production PostgreSQL schema. Do not edit by hand.",
    "-- Cutover baseline: 2026-07-13. Auth, storage and platform schemas are managed by Supabase.",
    "set check_function_bodies = false;",
    "create schema if not exists private;",
    "create schema if not exists extensions;",
    "",
  ];

  for (const extension of extensions) {
    output.push(
      `create extension if not exists ${quoteIdentifier(extension.extension_name)} with schema ${quoteIdentifier(extension.schema_name)};`
    );
  }

  for (const item of enums) {
    output.push(
      `create type ${fq(item.schema_name, item.type_name)} as enum (${item.labels.map(quoteLiteral).join(", ")});`
    );
  }

  for (const item of sequences) {
    output.push(
      `create sequence ${fq(item.schema_name, item.sequence_name)} as ${item.data_type} increment by ${item.increment_by} minvalue ${item.min_value} maxvalue ${item.max_value} start with ${item.start_value} cache ${item.cache_size}${item.cycle ? " cycle" : " no cycle"};`
    );
  }

  for (const table of tables) {
    const tableColumns = columns.filter((column) => column.table_oid === table.oid);
    const definitions = tableColumns.map((column) => {
      let definition = `${quoteIdentifier(column.column_name)} ${column.data_type}`;
      if (column.identity_kind) {
        definition += ` generated ${column.identity_kind === "a" ? "always" : "by default"} as identity`;
      } else if (column.generated_kind) {
        definition += ` generated always as (${column.default_expression}) stored`;
      } else if (column.default_expression) {
        definition += ` default ${column.default_expression}`;
      }
      if (column.not_null) definition += " not null";
      return `  ${definition}`;
    });
    output.push(
      `create table ${fq(table.schema_name, table.table_name)} (\n${definitions.join(",\n")}\n);`
    );
  }

  for (const constraint of constraints) {
    const table = tables.find((item) => item.oid === constraint.table_oid);
    output.push(
      `alter table only ${fq(table.schema_name, table.table_name)} add constraint ${quoteIdentifier(constraint.constraint_name)} ${constraint.definition};`
    );
  }

  output.push(...functions.map((item) => `${item.definition.trim()};`));

  const pendingViews = [...views];
  const emittedViews = new Set();
  while (pendingViews.length > 0) {
    const index = pendingViews.findIndex((view) =>
      view.dependencies.every((dependency) => emittedViews.has(dependency))
    );
    const view = pendingViews.splice(index >= 0 ? index : 0, 1)[0];
    const materialized = view.relkind === "m" ? "materialized " : "";
    output.push(
      `create ${materialized}view ${fq(view.schema_name, view.view_name)} as\n${view.definition};`
    );
    emittedViews.add(view.view_name);
  }

  output.push(...indexes.map((item) => `${item.definition};`));
  output.push(...triggers.map((item) => `${item.definition};`));

  for (const table of tables) {
    if (table.rls_enabled)
      output.push(
        `alter table ${fq(table.schema_name, table.table_name)} enable row level security;`
      );
    if (table.rls_forced)
      output.push(
        `alter table ${fq(table.schema_name, table.table_name)} force row level security;`
      );
  }

  for (const policy of policies) {
    const mode = policy.permissive === "PERMISSIVE" ? "permissive" : "restrictive";
    const roles = policy.roles.map(quoteIdentifier).join(", ");
    let statement = `create policy ${quoteIdentifier(policy.policyname)} on ${fq(policy.schema_name, policy.table_name)} as ${mode} for ${policy.cmd.toLowerCase()} to ${roles}`;
    if (policy.qual) statement += ` using (${policy.qual})`;
    if (policy.with_check) statement += ` with check (${policy.with_check})`;
    output.push(`${statement};`);
  }

  for (const grant of grants) {
    output.push(
      `grant ${grant.privileges} on table ${fq(grant.schema_name, grant.table_name)} to ${quoteIdentifier(grant.grantee)};`
    );
  }

  for (const grant of sequenceGrants) {
    output.push(
      `grant ${grant.privileges} on sequence ${fq(grant.schema_name, grant.sequence_name)} to ${quoteIdentifier(grant.grantee)};`
    );
  }

  output.push(
    "revoke execute on all functions in schema public from public, anon;",
    "revoke execute on all functions in schema private from public, anon, authenticated;"
  );

  for (const grant of routineGrants) {
    output.push(
      `grant execute on function ${fq(grant.schema_name, grant.function_name)}(${grant.identity_arguments}) to ${quoteIdentifier(grant.grantee)};`
    );
  }

  output.push(
    "alter default privileges in schema public revoke execute on functions from public;",
    "alter default privileges in schema private revoke execute on functions from public;",
    ""
  );

  const normalizedSql = `${output.join("\n\n")}\n`.replace(/[ \t]+$/gm, "").replace(/\n+$/, "\n");
  await fs.writeFile(outputPath, normalizedSql, "utf8");
  console.log(
    `Baseline generated: ${tables.length} tables, ${functions.length} functions, ${views.length} views`
  );
} finally {
  await client.end();
}
