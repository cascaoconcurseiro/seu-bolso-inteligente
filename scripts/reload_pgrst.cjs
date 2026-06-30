const { Pool } = require("pg");

const pool = new Pool({
  host: "aws-1-us-east-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.vrrcagukyfnlhxuvnssp",
  password: "QvEds5x3KcdnQhi2",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  try {
    // Reload PostgREST schema cache
    console.log("Sending NOTIFY pgrst, 'reload schema'...");
    await pool.query("NOTIFY pgrst, 'reload schema'");
    console.log("PostgREST schema reload signaled.");

    // Verify function signature and permissions again
    const { rows } = await pool.query(`
      SELECT
        oid::regprocedure::text AS full_sig,
        has_function_privilege('authenticated', oid, 'execute') AS auth_exec,
        has_function_privilege('anon', oid, 'execute') AS anon_exec,
        prosecdef
      FROM pg_proc
      WHERE proname = 'create_transaction_with_splits'
    `);

    console.log("\nFunction details:");
    rows.forEach((r) => {
      console.log(`  Signature: ${r.full_sig}`);
      console.log(`  SECURITY DEFINER: ${r.prosecdef}`);
      console.log(`  Auth EXECUTE: ${r.auth_exec}`);
      console.log(`  Anon EXECUTE: ${r.anon_exec}`);
    });

    // Also check if there are any invalid functions in the schema
    const { rows: invalid } = await pool.query(`
      SELECT oid::regprocedure::text AS func
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND pg_function_is_valid(oid) = false
    `);
    if (invalid.length > 0) {
      console.log("\n⚠️ INVALID functions in public schema:");
      invalid.forEach((r) => console.log(`  ${r.func}`));
    } else {
      console.log("\nNo invalid functions in public schema.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
