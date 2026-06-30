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
    // Check detailed function info
    const { rows: existing } = await pool.query(`
      SELECT
        p.proname,
        pronamespace::regnamespace::text AS schema,
        pg_get_function_arguments(p.oid) AS arguments,
        has_function_privilege('authenticated', p.oid, 'execute') AS auth_can_execute
      FROM pg_proc p
      WHERE p.proname IN ('create_transaction_with_splits', 'create_installment_series')
    `);

    console.log("Functions found:");
    existing.forEach((r) => {
      console.log(
        `  ${r.proname} | schema=${r.schema} | args=${r.arguments} | auth_exec=${r.auth_can_execute}`
      );
    });

    // Check PostgREST exposed schemas
    const { rows: schemas } = await pool.query(`
      SELECT current_setting('pgrst.db_schemas', true) AS exposed_schemas
    `);
    console.log("PostgREST exposed schemas:", schemas[0]?.exposed_schemas || "(default: public)");

    // Check if there's an issue with the function overloads
    const { rows: overloads } = await pool.query(`
      SELECT oid::regprocedure::text AS full_signature
      FROM pg_proc
      WHERE proname = 'create_transaction_with_splits'
    `);
    console.log("Function signatures:", overloads.map((r) => r.full_signature).join(", "));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
