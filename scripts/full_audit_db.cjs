const { Pool } = require("pg");

const pool = new Pool({
  host: "db.vrrcagukyfnlhxuvnssp.supabase.co",
  port: 5432,
  user: "postgres",
  password: "QvEds5x3KcdnQhi2",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

async function main() {
  try {
    // 1. All RPC functions in public schema
    console.log("=== RPC FUNCTIONS (public) ===");
    const { rows: rpcs } = await pool.query(`
      SELECT proname, pg_get_function_arguments(p.oid) AS args,
        pg_get_function_result(p.oid) AS ret,
        has_function_privilege('authenticated', p.oid, 'execute') AS auth_exec,
        prosecdef,
        CASE WHEN proname LIKE '%admin%' OR proname LIKE '%test%' THEN '⚠️' ELSE '' END as flag
      FROM pg_proc p
      WHERE pronamespace = 'public'::regnamespace
        AND prokind = 'f'
      ORDER BY proname
    `);
    rpcs.forEach((r) =>
      console.log(
        `  ${r.flag}${r.proname}(${r.args}) → ${r.ret} | SECURITY_DEFINER=${r.prosecdef} | auth_exec=${r.auth_exec}`
      )
    );

    // 2. All triggers
    console.log("\n=== TRIGGERS ===");
    const { rows: triggers } = await pool.query(`
      SELECT tgname, relname::text AS table_name, proname::text AS function,
        pg_get_triggerdef(t.oid) AS def
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE NOT t.tgisinternal
      ORDER BY relname, tgname
    `);
    triggers.forEach((t) => {
      const defShort = t.def.replace(/\s+/g, " ").substring(0, 120);
      console.log(`  ${t.tgname} ON ${t.table_name}: ${defShort}...`);
    });

    // 3. RLS policies
    console.log("\n=== RLS POLICIES (active) ===");
    const { rows: policies } = await pool.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);
    policies.forEach((p) => {
      const qualShort = (p.qual || "—").replace(/\s+/g, " ").substring(0, 80);
      console.log(`  ${p.tablename}.${p.policyname}: ${p.cmd} [${p.roles}] ${qualShort}`);
    });

    // 4. Tables with soft delete (deleted_at)
    console.log("\n=== TABLES WITH deleted_at ===");
    const { rows: softDel } = await pool.query(`
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'deleted_at'
      ORDER BY table_name
    `);
    console.log("  " + softDel.map((r) => r.table_name).join(", "));

    // 5. Check for empty/zero-byte migration files
    console.log("\n=== MIGRATIONS WITH ZERO-LENGTH FILES (known) ===");
    console.log("  (checking file system separately)");

    // 6. Indexes
    console.log("\n=== INDEXES (excluding PKs) ===");
    const { rows: idx } = await pool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%pkey'
        AND indexname NOT LIKE '%_unique'
      ORDER BY tablename, indexname
    `);
    idx.forEach((i) => console.log(`  ${i.tablename}: ${i.indexname}`));

    console.log("\n=== AUDIT COMPLETE ===");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
