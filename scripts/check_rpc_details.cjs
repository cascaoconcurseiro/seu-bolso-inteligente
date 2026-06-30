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
    // Check function owner and full details
    const { rows } = await pool.query(`
      SELECT
        p.proname,
        pg_get_userbyid(p.proowner) AS owner,
        p.pronamespace::regnamespace::text AS schema,
        pg_get_function_arguments(p.oid) AS args,
        pg_get_function_result(p.oid) AS result_type,
        l.lanname AS language,
        p.prosecdef,
        p.provolatile,
        p.proisstrict,
        p.proretset,
        array_to_string(ARRAY(
          SELECT unnest(p.proconfig)
        ), ', ') AS config
      FROM pg_proc p
      JOIN pg_language l ON l.oid = p.prolang
      WHERE p.proname = 'create_transaction_with_splits'
    `);

    console.log("Function details:");
    rows.forEach((r) => {
      console.log(`  Name: ${r.proname}`);
      console.log(`  Owner: ${r.owner}`);
      console.log(`  Schema: ${r.schema}`);
      console.log(`  Args: ${r.args}`);
      console.log(`  Returns: ${r.result_type}`);
      console.log(`  Language: ${r.language}`);
      console.log(`  SECURITY DEFINER: ${r.prosecdef}`);
      console.log(`  Volatility: ${r.provolatile}`);
      console.log(`  Strict: ${r.proisstrict}`);
      console.log(`  Set returning: ${r.proretset}`);
      console.log(`  Config: ${r.config || "(none)"}`);
    });

    // Check grants more thoroughly
    const { rows: grants } = await pool.query(`
      SELECT
        grantee,
        privilege_type,
        is_grantable
      FROM information_schema.routine_privileges
      WHERE routine_name = 'create_transaction_with_splits'
        AND routine_schema = 'public'
    `);

    console.log("\nGrants:");
    grants.forEach((g) => {
      console.log(`  ${g.grantee}: ${g.privilege_type} (grantable: ${g.is_grantable})`);
    });

    // Check if there's any function with similar name
    const { rows: similar } = await pool.query(`
      SELECT proname, pronamespace::regnamespace::text AS schema
      FROM pg_proc
      WHERE proname LIKE '%transaction%split%' OR proname LIKE '%split%transaction%'
    `);
    console.log(
      "\nSimilar functions:",
      similar.map((r) => `${r.schema}.${r.proname}`).join(", ") || "none"
    );
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
